import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";

type ManifestShape = { version: string };

const manifest = JSON.parse(await readFile("manifest.json", "utf8")) as ManifestShape;
const zipName = `fadee-${manifest.version}.zip`;

await run("node_modules/.bin/tsc", ["--noEmit"]);
await run("bun", ["run", "scripts/build.ts"], { env: { NODE_ENV: "production" } });
await rm(zipName, { force: true });
await run("zip", ["-r", `../${zipName}`, ".", "-x", "*.DS_Store"], { cwd: "dist" });

console.log(`packed: ${zipName}`);

function run(cmd: string, args: string[], opts: { cwd?: string; env?: Record<string, string> } = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      cwd: opts.cwd,
      env: opts.env ? { ...process.env, ...opts.env } : process.env
    });
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
    child.on("error", reject);
  });
}
