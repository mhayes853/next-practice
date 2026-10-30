import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"
import { createPortal } from "react-dom"
import { CloseButton } from "./Button"

export const DEFAULT_TOAST_DURATION = 3000

export type Toast = {
  message: string
  duration?: number
  type: "success" | "error" | "warning" | "info"
}

export type ToastPresenter = {
  present: (info: Toast) => void
}

const ToastContext = createContext<ToastPresenter | undefined>(undefined)

export function useToastPresenter() {
  const presenter = useContext(ToastContext)
  if (!presenter) throw new Error("ToastPresenter not found")
  return presenter
}

export type ToastProviderProps = {
  children: ReactNode
}

export type PresentedToast = Toast & { id: number }

export function useToasts() {
  const currentId = useRef(0)
  const toastTimeout = useRef<Map<number, NodeJS.Timeout>>(new Map())
  const [toasts, setToasts] = useState<PresentedToast[]>([])

  useEffect(() => {
    const timeouts = toastTimeout.current
    return () => {
      timeouts.values().forEach(clearTimeout)
      timeouts.clear()
    }
  }, [])

  return {
    toasts,
    dismiss: useCallback((id: number) => {
      setToasts((t) => t.filter((t) => t.id !== id))
      const timeout = toastTimeout.current.get(id)
      if (timeout) clearTimeout(timeout)
      toastTimeout.current.delete(id)
    }, []),
    present: useCallback((toast: Toast) => {
      const id = currentId.current++
      setToasts((t) => [...t, { ...toast, id }])
      const duration = toast.duration ?? DEFAULT_TOAST_DURATION
      toastTimeout.current.set(
        id,
        setTimeout(() => {
          toastTimeout.current.delete(id)
          setToasts((t) => t.filter((t) => t.id !== id))
        }, duration)
      )
    }, [])
  }
}

export function ToastProvider({ children }: ToastProviderProps) {
  const toasts = useToasts()
  return (
    <ToastContext.Provider
      value={useMemo(() => ({ present: toasts.present }), [toasts.present])}
    >
      {children}
      {toasts.toasts.length > 0 &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-10">
            {toasts.toasts.map((toast) => (
              <Toast key={toast.id} toast={toast} onDismiss={toasts.dismiss} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  )
}

type ToastProps = {
  toast: PresentedToast
  onDismiss: (id: number) => void
}

const TOAST_BACKGROUNDS = {
  success: "bg-green-500",
  error: "bg-red-500",
  info: "bg-blue-500",
  warning: "bg-yellow-500"
} as const

function Toast({ toast, onDismiss }: ToastProps) {
  return (
    <div
      className={`pointer-events-auto rounded-xl ${TOAST_BACKGROUNDS[toast.type]}`}
    >
      <div className="flex items-center gap-2 py-2 pl-4 pr-1">
        <b className="min-w-0 flex-1">{toast.message}</b>
        <CloseButton className="shrink-0" onClick={() => onDismiss(toast.id)} />
      </div>
    </div>
  )
}
