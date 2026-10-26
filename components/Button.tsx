import { ReactNode } from "react"

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
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        cursor-pointer rounded-xl font-bold text-lg p-2.5
        transition duration-200 ease-in-out
        hover:opacity-80
        active:scale-95
        ${TEXT_COLORS[kind ?? "primary"]}
        ${BACKGROUNDS[kind ?? "primary"]}
      `}
    >
      {children}
    </button>
  )
}
