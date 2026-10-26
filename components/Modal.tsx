import { ReactNode } from "react"
import { Button } from "./Button"

export type ModalProps = {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export function Modal({ isOpen, onClose, children }: ModalProps) {
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
          <div className="flex justify-end">
            <Button kind="secondary" onClick={onClose}>
              X
            </Button>
          </div>
          {children}
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
