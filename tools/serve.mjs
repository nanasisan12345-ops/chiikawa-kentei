import { createServer } from "node:http";
import { readFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, extname, sep } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(
  process.env.SITE_ROOT || fileURLToPath(new URL("../", import.meta.url)),
);
const port = Number(process.env.PORT || 4174);
const allowed = new Set([
  "index.html",
  "style.css",
  "script.js",
  "data.js",
  "extra-questions.js",
  "engine.js",
  "favicon.svg",
]);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const name = pathname === "/" ? "index.html" : pathname.slice(1);
    const path = resolve(root, name);
    if (!allowed.has(name) || !path.startsWith(root + sep)) {
      res.writeHead(404).end("Not found");
      return;
    }
    const bytes = await readFile(path);
    res
      .writeHead(200, {
        "Content-Type": mime[extname(path)] || "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      })
      .end(bytes);
  } catch {
    res.writeHead(404).end("Not found");
  }
});
server.on("error", (error) => {
  console.error(
    `起動できません: ${error.code}。ポート${port}を使用中の起動ウィンドウを確認してください。`,
  );
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", async () => {
  const url = `http://127.0.0.1:${port}/`;
  console.log(
    `ちいかわ検定: ${url}\n終了するにはこのウィンドウを閉じてください。`,
  );
  if (!process.argv.includes("--open")) return;
  const profile = resolve(root, "Data/browser");
  await mkdir(profile, { recursive: true });
  const candidates = [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ];
  for (const exe of candidates) {
    try {
      await access(exe);
    } catch {
      continue;
    }
    const child = spawn(
      exe,
      [
        `--user-data-dir=${profile}`,
        "--no-first-run",
        "--disable-sync",
        `--app=${url}`,
      ],
      { detached: true, stdio: "ignore", windowsHide: true },
    );
    child.on("error", (error) =>
      console.error(`ブラウザを起動できません: ${error.message}`),
    );
    child.unref();
    return;
  }
  console.error(
    "Microsoft Edgeが見つかりません。表示されたURLをブラウザで開いてください。通常ブラウザの保存先はそのブラウザの設定に従います。",
  );
});
