import { NextApiResponse } from "next"

export function invalidMethod(res: NextApiResponse) {
  res.status(405).json({ error: "invalid method" })
}

export function badRequest(res: NextApiResponse) {
  res.status(400).json({ error: "bad request" })
}

export function forbidden(res: NextApiResponse) {
  res.status(403).json({ error: "forbidden" })
}

export function notFound(res: NextApiResponse) {
  res.status(404).json({ error: "not found" })
}
