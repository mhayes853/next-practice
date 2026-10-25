import { db } from "@/prisma/db"
import { beforeEach } from "vitest"

beforeEach(async () => {
  await db.orm.public.Transcript.where({}).deleteAll()
  await db.orm.public.TranscriptPart.where({}).deleteAll()
  await db.orm.public.User.where({}).deleteAll()
})
