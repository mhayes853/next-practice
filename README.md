# Next Practice

I write a lot of Swift, but have also written a load of React Native and TypeScript in the past.

Suffice to say, I have a lot of experience building apps, as well as libraries and frameworks, but little building full-stack web applications. So when I interviewed recently, I had to go through a bit of a learning curve to pass the fullstack and frontend round with Next JS, SWR, and Prisma. The actual role involves more of my actual technical day-to-day experience (mobile, inference), but the company seemed to want me to show competence of the webstack as well.

This repo mainly exists for people coming from other languages who find themselves in a fullstack interview for some reason.

If you're coming from Swift without a background in TS:

- Not every anonymous function is considered a "closure" in TS by definition.
- TS is structurally typed and has a more expressive type system than Swift's rigid nominal typing.
- MVVM isn't typically used in React apps.
- You will have to worry about the backend and SSR.
- SwiftUI modifiers are considerably nicer than dealing with CSS (subjective opinion)

While your agent can easily write Next, React, and Tailwind, interviews typically don't allow agents (at least in late 2026). Therefore, you can expect to become a caveman again temporarily, before using agents heavily once you land the job.

This project is mostly handwritten, with some agentic use for writing test cases. It handles authentication, common UI components like toasts and modals, uses tailwind, uses Prisma, uses SWR, and does transcription via the Vercel AI SDK.

## Running

You can run the app locally through:

```sh
bun dev
```

Tests can be ran via:

```sh
bun test
```
