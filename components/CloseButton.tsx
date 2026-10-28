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
      <svg
        width="16"
        height="16"
        className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:rotate-90"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <line x1="6" y1="6" x2="18" y2="18" />
        <line x1="18" y1="6" x2="6" y2="18" />
      </svg>
    </button>
  )
}
