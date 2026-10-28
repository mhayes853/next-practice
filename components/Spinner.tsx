export type SpinnerProps = {
  className?: string
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <div
      role="status"
      className={`inline-flex items-center gap-2 text-zinc-500 dark:text-zinc-400 ${className ?? ""}`}
    >
      <svg
        width="30"
        height="30"
        className="h-6 w-6 shrink-0 animate-spin motion-reduce:animate-[spin_1.5s_linear_infinite]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" className="opacity-25" />
        <path d="M21 12a9 9 0 0 0-9-9" />
      </svg>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
