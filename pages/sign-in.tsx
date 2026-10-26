import { Button } from "@/components/Button"
import { signIn } from "next-auth/react"

export default function SignIn() {
  return (
    <div className="flex flex-col">
      <b className="text-2xl">You need to sign in to continue.</b>
      <div className="mt-4">
        <Button
          onClick={async () => await signIn("github", { callbackUrl: "/" })}
        >
          Sign in with GitHub
        </Button>
      </div>
    </div>
  )
}
