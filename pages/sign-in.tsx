import { Button } from "@/components/Button"
import { signIn } from "next-auth/react"
import { redirect } from "next/navigation"

export default function SignIn() {
  return (
    <Button
      onClick={async () => {
        const resp = await signIn("github")
        if (resp?.ok) redirect("/")
      }}
    >
      Sign in with GitHub
    </Button>
  )
}
