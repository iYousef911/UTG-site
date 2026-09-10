import { createServer } from "node:http";
import { collectStatus } from "./status-lib.mjs";

const port = Number(process.env.STATUS_PORT || 3001);
const host = process.env.STATUS_HOST || "127.0.0.1";

createServer(async (req, res) => {
  const path = (req.url || "/").split("?")[0];
  if (req.method !== "GET" || (path !== "/api/status.json" && path !== "/")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
    return;
  }
  try {
    const payload = await collectStatus();
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=30",
    });
    res.end(JSON.stringify(payload));
  } catch (error) {
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "status check failed", detail: String(error) }));
  }
}).listen(port, host, () => {
  console.log(`UTG status API http://${host}:${port}/api/status.json`);
});
