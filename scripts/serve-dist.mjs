import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, relative, resolve } from "node:path";
import { collectStatus } from "./status-lib.mjs";

const root = resolve("dist");
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 4323);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
  ".webmanifest": "application/manifest+json",
};

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function safeFile(urlPath) {
  const resolved = resolve(root, `.${urlPath}`);
  const rel = relative(root, resolved);
  if (rel.startsWith("..") || rel.includes("..")) return null;
  return resolved;
}

function rewrite(pathname) {
  if (pathname === "/.well-known/apple-app-site-association" || pathname === "/apple-app-site-association") {
    return { file: "/.well-known/apple-app-site-association.json", type: "application/json" };
  }
  const game = pathname.match(/^\/game\/(\d+)$/);
  if (game && game[1] !== "1942") return { file: "/game.html" };
  if (/^\/news\/\d+$/.test(pathname)) return { file: "/news.html" };
  if (/^\/deals\/\d+$/.test(pathname)) return { file: "/deals.html" };
  return { file: pathname };
}

createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);

  if (pathname === "/api/status.json") {
    try {
      const payload = await collectStatus();
      send(res, 200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=30" }, JSON.stringify(payload));
    } catch {
      send(res, 502, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ error: "status check failed" }));
    }
    return;
  }

  const mapped = rewrite(pathname);
  const candidates = [];
  if (mapped.file === "/") candidates.push("/index.html");
  else {
    candidates.push(mapped.file);
    if (!extname(mapped.file)) candidates.push(`${mapped.file}.html`);
  }

  for (const candidate of candidates) {
    const disk = safeFile(normalize(candidate));
    if (!disk || !existsSync(disk) || !statSync(disk).isFile()) continue;
    const type = mapped.type || MIME[extname(disk)] || "application/octet-stream";
    const cache = mapped.type
      ? "public, max-age=3600"
      : candidate.endsWith(".html")
        ? "no-cache"
        : "public, max-age=600";
    send(res, 200, { "Content-Type": type, "Cache-Control": cache }, readFileSync(disk));
    return;
  }

  const notFound = join(root, "404.html");
  send(res, 404, { "Content-Type": "text/html; charset=utf-8" }, readFileSync(notFound));
}).listen(port, host, () => {
  console.log(`UTG dist server http://${host}:${port}/`);
});
