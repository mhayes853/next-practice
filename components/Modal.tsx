import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef
} from "react"
import { Unsubscribe } from "@/lib/utils"
import { CloseButton } from "./Button"

export type ModalSubscribe = (isOpen: boolean) => void

export type ModalValues = {
  isOpen: boolean
  subscribe: (fn: ModalSubscribe) => Unsubscribe
  close: () => void
}

const ModalContext = createContext<ModalValues | undefined>(undefined)

export function useModalIfAvailable() {
  return useContext(ModalContext)
}

export function useModal() {
  const context = useModalIfAvailable()
  if (!context) throw new Error("useModal must be used within a Modal")
  return context
}

export type ModalProps = {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export function Modal({ isOpen, onClose, children }: ModalProps) {
  const callbacks = useRef(new Set<(isOpen: boolean) => void>())
  const subscribe = useCallback((fn: ModalSubscribe) => {
    callbacks.current.add(fn)
    return () => callbacks.current.delete(fn)
  }, [])

  useEffect(() => {
    callbacks.current.forEach((fn) => fn(isOpen))
  }, [isOpen])

  return (
    <div
      data-open={isOpen}
      className="
        fixed inset-0 z-50 flex items-center justify-center
        opacity-0 invisible
        transition-[opacity,visibility] duration-200
        data-[open=true]:opacity-100
        data-[open=true]:visible
      "
    >
      <Backdrop onClose={onClose} />

      <div
        className="
          relative z-10 mb-50 w-full max-w-150
          rounded-xl bg-gray-900 p-6 shadow-xl
          scale-95 transition-transform duration-200
          data-[open=true]:scale-100
        "
      >
        <div className="flex flex-col">
          <div className="flex flex-row">
            <div className="flex-1"></div>
            <div>
              <CloseButton onClick={onClose} />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <ModalContext.Provider
              value={{ isOpen, close: onClose, subscribe }}
            >
              {children}
            </ModalContext.Provider>
          </div>
        </div>
      </div>
    </div>
  )
}

function Backdrop({ onClose }: Pick<ModalProps, "onClose">) {
  return (
    <div className="absolute inset-0 bg-black/50" onClick={() => onClose()} />
  )
}
