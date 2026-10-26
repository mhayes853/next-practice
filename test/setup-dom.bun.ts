import { afterAll } from "bun:test"
import { JSDOM } from "jsdom"

// Bun does not read Vitest's environment setting. Install the DOM before React
// and SWR are imported, while preserving Bun's native fetch and multipart APIs.
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost:3000",
  pretendToBeVisual: true
})

const globals = {
  window: dom.window,
  self: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  location: dom.window.location,
  HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node,
  MutationObserver: dom.window.MutationObserver,
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
  cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
  IS_REACT_ACT_ENVIRONMENT: true
}

for (const [name, value] of Object.entries(globals)) {
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
}

afterAll(() => dom.window.close())
