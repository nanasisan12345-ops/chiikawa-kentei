import { createRequire } from "node:module";
import { join } from "node:path";
import { homedir } from "node:os";
const require = createRequire(import.meta.url);
let modulePath = process.env.PLAYWRIGHT_PATH;
if (!modulePath) {
  try {
    modulePath = require.resolve("playwright");
  } catch {
    modulePath = join(
      homedir(),
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
    );
  }
}
export const { chromium } = require(modulePath);
