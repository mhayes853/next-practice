import { authenticatedHandler } from "@/lib/server/auth"
import { invalidMethod } from "@/lib/server/invalid-requests"

export default authenticatedHandler(async (req, res, session) => {
  if (req.method !== "GET") return invalidMethod(res)
})
