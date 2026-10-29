import { ReactNode, useEffect, useRef, useState } from "react"
import { LabelButton } from "./Button"

export type TooltipProps = {
  menu: ReactNode
  children: ReactNode
  labelClassName?: string
}

export function Tooltip({ menu, children, labelClassName }: TooltipProps) {
  const [isPresented, setIsPresented] = useState(false)

  const closeTimer = useRef<NodeJS.Timeout | null>(null)

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = null
  }

  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setIsPresented(false), 150)
  }

  useEffect(() => cancelClose, [])

  return (
    <div className="relative group inline-block">
      <div
        onMouseEnter={() => {
          cancelClose()
          setIsPresented(true)
        }}
        onMouseLeave={scheduleClose}
      >
        <LabelButton
          onClick={() => setIsPresented(true)}
          className={labelClassName}
        >
          {children}
        </LabelButton>
      </div>
      {isPresented && (
        <div
          className={`
          absolute left-[-20] top-full z-50 mt-2
          whitespace-nowrap rounded-md bg-[#2b2e33] px-2 py-1 text-xs text-white shadow-lg
          opacity-0 translate-y-1 transition
          group-hover:opacity-100 group-hover:translate-y-0 ease-in-out
          `}
          onClick={() => setIsPresented(false)}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="p-2">{menu}</div>
        </div>
      )}
    </div>
  )
}
