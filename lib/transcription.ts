// export type Transcription = /

import { transcribe } from "ai";

export async function transcribeBlob(blob: Blob) {
  const result = await transcribe({ model: "openai/whipser1", audio: await blob.bytes() });
  // result.segments.map((s) => s.)

}
