import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { aasaDocument } from "./src/data/universal-links.ts";

const aasa = JSON.stringify(aasaDocument(), null, 2);
mkdirSync("public/.well-known", { recursive: true });
writeFileSync("public/.well-known/apple-app-site-association", aasa);
writeFileSync("public/.well-known/apple-app-site-association.json", aasa);
writeFileSync("public/apple-app-site-association", aasa);
writeFileSync("public/apple-app-site-association.json", aasa);

function serveAasa(root) {
  return (req, res, next) => {
    const path = req.url?.split("?")[0];
    if (path !== "/.well-known/apple-app-site-association" && path !== "/apple-app-site-association") {
      next();
      return;
    }
    try {
      const body = readFileSync(join(root, ".well-known/apple-app-site-association"));
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.end(body);
    } catch {
      next();
    }
  };
}

function rewriteAppFallbacks(isPreview) {
  return (req, _res, next) => {
    const [pathname, query] = (req.url ?? "/").split("?");
    const suffix = query ? `?${query}` : "";
    const file = (route) => (isPreview ? `${route}.html` : route);
    let match = pathname.match(/^\/game\/(\d+)\/?$/);
    if (match && match[1] !== "1942") {
      req.url = file("/game") + suffix;
      next();
      return;
    }
    match = pathname.match(/^\/news\/(\d+)\/?$/);
    if (match) {
      req.url = file("/news") + suffix;
      next();
      return;
    }
    match = pathname.match(/^\/deals\/(\d+)\/?$/);
    if (match) {
      req.url = file("/deals") + suffix;
      next();
      return;
    }
    next();
  };
}

function aasaIntegration() {
  return {
    name: "aasa-json",
    hooks: {
      "astro:server:setup"({ server }) {
        server.middlewares.use(serveAasa("public"));
        server.middlewares.use(rewriteAppFallbacks(false));
      },
      "astro:preview:setup"({ server }) {
        server.middlewares.use(serveAasa("dist"));
        server.middlewares.use(rewriteAppFallbacks(true));
      },
    },
  };
}

// Deploy: push main to GitHub. Hostinger VPS (Coolify) builds the Dockerfile
// and serves dist/ with Caddy. AASA is JSON with no redirect.
export default defineConfig({
  site: "https://utg.yadev.tech",
  trailingSlash: "never",
  build: { format: "file" },
  integrations: [
    aasaIntegration(),
    sitemap({
      filter: (page) => !page.includes("/404"),
    }),
  ],
});
