import { ReactNode, createContext, useContext, useMemo } from "react"

export type Toast = {
  message: string
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

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <ToastContext.Provider value={useMemo(() => ({ present: () => {} }), [])}>
      {children}
    </ToastContext.Provider>
  )
}
