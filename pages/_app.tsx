import "@/styles/globals.css"
import { SessionProvider } from "next-auth/react"
import type { AppProps } from "next/app"
import { Geist } from "next/font/google"

const geist = Geist()

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <div className={geist.className}>
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  )
}
