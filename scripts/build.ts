import { spawn } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { force: true, recursive: true });
await mkdir("dist", { recursive: true });

const results = await Promise.all([
  Bun.build({
    entrypoints: ["src/content.ts"],
    outdir: "dist",
    format: "iife",
    target: "browser",
    naming: "content.js"
  }),
  Bun.build({
    entrypoints: ["src/background.ts"],
    outdir: "dist",
    format: "esm",
    target: "browser",
    naming: "background.js"
  }),
  Bun.build({
    entrypoints: ["src/offscreen.ts"],
    outdir: "dist",
    format: "iife",
    target: "browser",
    naming: "offscreen.js"
  }),
  Bun.build({
    entrypoints: ["src/popup.tsx"],
    outdir: "dist",
    format: "iife",
    target: "browser",
    naming: "popup.js",
    minify: true,
    jsx: { runtime: "automatic", development: false },
    define: {
      "process.env.NODE_ENV": '"production"'
    }
  })
]);

for (const result of results) {
  if (!result.success) {
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }
}

await Promise.all([
  cp("manifest.json", "dist/manifest.json"),
  cp("popup.html", "dist/popup.html"),
  cp("offscreen.html", "dist/offscreen.html"),
  cp("public/content.css", "dist/content.css"),
  cp("public/icons", "dist/icons", { recursive: true }),
  runTailwind()
]);

function runTailwind(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "bunx",
      ["tailwindcss", "-i", "src/popup.css", "-o", "dist/popup.css", "--minify"],
      { stdio: "inherit" }
    );
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`tailwindcss exit ${code}`))));
    child.on("error", reject);
  });
}
