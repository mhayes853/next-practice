import { Html, Head, Main, NextScript } from "next/document"

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body className="antialiased">
        <main className="h-screen w-screen">
          <div className="flex flex-col items-center justify-center ">
            <div className="w-180 mt-16">
              <Main />
              <NextScript />
            </div>
          </div>
        </main>
      </body>
    </Html>
  )
}
