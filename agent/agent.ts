import { defineAgent } from "eve";

/** Identity comes from the package name at compile time — no `name` field. */
export default defineAgent({
  // Model via `eve login` / AI Gateway; optional override:
  // model: "openai/gpt-5",
});
