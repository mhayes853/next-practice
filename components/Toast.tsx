import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from "react"

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
    </ToastContext.Provider>
  )
}
