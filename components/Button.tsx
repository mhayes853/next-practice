import { ReactNode } from "react"
import { XMark } from "./Icons"

export type ButtonProps = {
  kind?: "primary" | "secondary" | "danger"
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}

const SHADOW_COLORS = {
  primary: "shadow-white/30",
  secondary: "shadow-gray-300/30",
  danger: "shadow-red-300/30"
} as const

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
        shadow-lg
        ${SHADOW_COLORS[actualKind]}
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

export type LabelButtonProps = {
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
  ariaLabel?: string
}

export function LabelButton({
  onClick,
  children,
  disabled,
  className,
  ariaLabel
}: LabelButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className={`
        ${className ?? ""} flex w-full items-center justify-center
        rounded-md text-zinc-500 transition cursor-pointer
        active:scale-90 focus-visible:outline-none
        ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:focus-visible:ring-offset-zinc-900"
        }`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="flex p-3">{children}</div>
    </button>
  )
}

export type CloseButtonProps = {
  onClick?: () => void
  className?: string
}

export function CloseButton({ onClick, className }: CloseButtonProps) {
  return (
    <LabelButton onClick={onClick} className={className} ariaLabel="Close">
      <div className="shrink-0 transition-transform duration-200 group-hover:rotate-90">
        <XMark />
      </div>
    </LabelButton>
  )
}
