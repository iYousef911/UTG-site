import type { APIRoute } from "astro";
import { SITE } from "../config";
import { llmsTxt } from "../data/universal-links";

export const GET: APIRoute = () =>
  new Response(llmsTxt(SITE.url), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
