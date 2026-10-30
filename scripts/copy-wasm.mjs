// Copies the ZXing reader WebAssembly binary into public/ so Next.js serves it
// as a static asset. Runs before dev and build.
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = require.resolve("zxing-wasm/reader/zxing_reader.wasm");
const target = resolve(root, "public", "zxing", "zxing_reader.wasm");

await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);
