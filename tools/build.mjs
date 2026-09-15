import {
  mkdir,
  copyFile,
  readFile,
  writeFile,
  appendFile,
} from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const stamp = new Date().toISOString().replace(/[-:.]/g, "");
const output = join(root, ".build", `pages_${stamp}`);
const assets = [
  "index.html",
  "style.css",
  "script.js",
  "data.js",
  "engine.js",
  "favicon.svg",
];
for (const name of assets.filter((name) => name.endsWith(".js"))) {
  const check = spawnSync(process.execPath, ["--check", join(root, name)], {
    encoding: "utf8",
  });
  if (check.status !== 0) throw new Error(check.stderr);
}
await mkdir(output, { recursive: true });
let siteUrl = process.env.SITE_URL;
if (siteUrl) {
  const parsed = new URL(siteUrl);
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  )
    throw new Error(
      "SITE_URLにはクエリ・認証情報のないHTTPSの公開URLを指定してください。",
    );
  siteUrl = parsed.href.endsWith("/") ? parsed.href : parsed.href + "/";
}
const escapeAttribute = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
for (const name of assets) {
  const target = join(output, name);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(join(root, name), target);
}
if (siteUrl) {
  const file = join(output, "index.html");
  let html = await readFile(file, "utf8");
  html = html.replace(
    /property="og:url" content="[^"]*"/,
    `property="og:url" content="${escapeAttribute(siteUrl)}"`,
  );
  await writeFile(file, html);
}
await writeFile(join(output, ".nojekyll"), "");
if (process.env.GITHUB_OUTPUT)
  await appendFile(process.env.GITHUB_OUTPUT, `site=${output}\n`);
console.log(
  `GitHub Pages用ビルド: ${output}\nサイトの7ファイルのみ。配布パッケージは作成しません。\n公開URL: ${siteUrl || "未設定"}`,
);
