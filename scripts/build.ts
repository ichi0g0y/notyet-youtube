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
    entrypoints: ["src/popup.ts"],
    outdir: "dist",
    format: "esm",
    target: "browser",
    naming: "popup.js"
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
  cp("public/content.css", "dist/content.css"),
  cp("public/popup.css", "dist/popup.css")
]);
