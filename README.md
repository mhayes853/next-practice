# Next Interview Prep

I write a lot of Swift, but have also written a load of React Native and TypeScript in the past.

Suffice to say, I have a lot of experience building apps, APIs, as well as libraries and frameworks, but little building fullstack web applications using the traditional fullstack frameworks. So when I interviewed recently, I had to go through a bit of a learning curve to pass the fullstack and frontend round with Next, SWR, and Prisma. AFAIK, fullstack skills are becoming more and more of a requirement for product engineers due to agents, even if you've primarily done mobile in past roles. The actual role at this [company](https://circleback.ai/) also involves much of my existing and expanding skillset.

This repo mainly exists for people coming from other SWE disciplines who find themselves in a fullstack interview for some reason, and who just want to see how someone in that situation (successfully) prepared for the interviews.

If you're coming from Swift without a background in TS:

- Not every anonymous function is considered a "closure" in TS by definition.
- TS is structurally typed and has a more expressive type system than Swift's rigid nominal typing.
- MVVM isn't typically used in React apps.
- You will have to worry about the backend and SSR.
- SwiftUI modifiers are considerably nicer than dealing with web CSS (subjective opinion).

While your agent can easily write Next, React, and Tailwind, many interviews don't allow agents (at least in late 2026), even for companies that use agents heavily day-to-day. Therefore, you can expect to become a caveman again temporarily when preparing, before using agents heavily once you land the job. I would recommend spending at least a week to adjust to a caveman lifestyle before entering an interview.

This project is mostly handwritten like a caveman, with some agentic use for writing test cases because I was too lazy to write them like a caveman. It handles much of the fullstack lore including authentication, common UI components like toasts and modals, uses tailwind, uses Prisma, uses SWR, and does transcription via the Vercel AI SDK.

In case you're wondering, I _did_ get the offer, so I'm sharing with everyone.

## Running

You can run the app locally through:

```sh
bun dev
```

Tests can be ran via:

```sh
bun test
```
