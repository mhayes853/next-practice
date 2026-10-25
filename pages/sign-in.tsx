import { signIn } from "next-auth/react"
import { redirect } from "next/navigation"

export default function SignIn() {
  return (
    <button
      onClick={async () => {
        const resp = await signIn("github")
        if (resp?.ok) redirect("/")
      }}
    >
      Sign in with GitHub
    </button>
  )
}
