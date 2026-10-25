import { testApiHandler } from "next-test-api-route-handler"
import type { NextApiHandler, PageConfig } from "next"

type PagesApiModule = {
  default: NextApiHandler
  config?: PageConfig
}

type CallOptions = {
  method: string
  path: string
  headers?: Record<string, string>
  body?: Buffer | string
}

export async function callApiRoute(
  handler: PagesApiModule,
  options: CallOptions
): Promise<{ status: number; body: string }> {
  const transcriptId = options.path.match(/^\/api\/transcript\/([^/?]+)/)?.[1]
  let response: Response | undefined

  await testApiHandler({
    pagesHandler: handler,
    url: options.path,
    params: transcriptId ? { id: decodeURIComponent(transcriptId) } : undefined,
    rejectOnHandlerError: true,
    test: async ({ fetch }) => {
      response = await fetch({
        method: options.method,
        headers: options.headers,
        body: Buffer.isBuffer(options.body) ? options.body.toString("utf8") : options.body
      })
    }
  })

  if (!response) throw new Error("API handler did not return a response")
  return { status: response.status, body: await response.text() }
}
