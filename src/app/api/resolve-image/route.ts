// app/api/resolve-image/route.ts
import { NextRequest } from "next/server";
export const runtime = "nodejs";

const IMG_EXT = /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i;
const ALLOWED_HOSTS = new Set([
  "www.discoverblaircounty.com",
  "discoverblaircounty.com",
  "www.explorealtoona.com",
  "explorealtoona.com",
]);

function looksLikeImageUrl(u?: string | null) {
  return !!u && (IMG_EXT.test(u) || /\/wp-content\/uploads\//i.test(u));
}
function absolutize(base: URL, maybe: string) {
  try {
    const u = new URL(maybe, base);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    if (!ALLOWED_HOSTS.has(u.hostname)) return null; // scope/SSRF guard
    return u.toString();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const pageUrl = req.nextUrl.searchParams.get("url");
  if (!pageUrl)
    return new Response(JSON.stringify({ error: "Missing url" }), {
      status: 400,
    });

  let res: Response;
  try {
    res = await fetch(pageUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
      redirect: "follow",
    });
  } catch {
    return new Response(JSON.stringify({ error: "Fetch failed" }), {
      status: 502,
    });
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("text/html")) {
    return new Response(JSON.stringify({ error: "Not HTML" }), { status: 400 });
  }

  const html = await res.text();
  const base = new URL(pageUrl);

  const patterns = [
    /<meta[^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
    /<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
    /<meta[^>]+name=["']twitter:image:src["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
    /<link[^>]+rel=["']image_src["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
  ];

  for (const re of patterns) {
    for (const m of html.matchAll(re)) {
      const abs = absolutize(base, m[1].trim());
      if (!looksLikeImageUrl(abs)) continue;

      // Single GET → verify + stream
      const upstream = await fetch(abs!, {
        redirect: "follow",
        cache: "no-store",
      });
      if (!upstream.ok) {
        // try next candidate if this one 404s
        continue;
      }
      const uct = upstream.headers.get("content-type") || "";
      if (!uct.startsWith("image/")) {
        continue;
      }

      const headers = new Headers();
      headers.set("Content-Type", uct);
      const len = upstream.headers.get("content-length");
      if (len) headers.set("Content-Length", len);
      headers.set(
        "Cache-Control",
        "public, s-maxage=86400, stale-while-revalidate=86400"
      );
      headers.set("X-Content-Type-Options", "nosniff");

      return new Response(upstream.body, { headers });
    }
  }

  return new Response(JSON.stringify({ error: "No image found" }), {
    status: 404,
  });
}
