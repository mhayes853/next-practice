import { ReactNode } from "react"
import { XMark } from "./Icons"

export type ButtonProps = {
  kind?: "primary" | "secondary" | "danger"
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}

const BACKGROUNDS = {
  primary: "bg-white",
  secondary: "bg-gray-800",
  danger: "bg-red-500"
} as const

const TEXT_COLORS = {
  primary: "text-gray-800",
  secondary: "text-white",
  danger: "text-white"
} as const

export const Button = ({ onClick, disabled, children, kind }: ButtonProps) => {
  const actualKind = kind ?? "primary"
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        cursor-pointer rounded-xl font-bold text-lg p-2.5
        transition duration-200 ease-in-out
        hover:opacity-80
        active:scale-95
        ${TEXT_COLORS[actualKind]}
        ${BACKGROUNDS[actualKind]}
      `}
    >
      {children}
    </button>
  )
}

export type CloseButtonProps = {
  onClick?: () => void
}

export function CloseButton({ onClick }: CloseButtonProps) {
  return (
    <button
      aria-label="Close"
      className="group absolute right-3 top-3 inline-flex size-12 items-center justify-center
                     rounded-full text-zinc-500 transition cursor-pointer
                     hover:bg-zinc-100 hover:text-zinc-900 active:scale-90
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                     focus-visible:ring-offset-2
                     dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:focus-visible:ring-offset-zinc-900"
      onClick={onClick}
    >
      <div className="shrink-0 transition-transform duration-200 group-hover:rotate-90">
        <XMark />
      </div>
    </button>
  )
}
