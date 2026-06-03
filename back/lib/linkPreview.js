const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const FETCH_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 512 * 1024;

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi;

function extractFirstUrl(text) {
  if (!text) return null;
  const match = String(text).match(URL_REGEX);
  if (!match?.[0]) return null;
  return match[0].replace(/[.,;:!?)]+$/, "");
}

function parseMetaContent(html, property) {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function parseTitle(html) {
  const og = parseMetaContent(html, "og:title");
  if (og) return og;
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim() || null;
}

function validatePreviewUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
  return parsed.href;
}

async function fetchLinkPreview(rawUrl) {
  const url = validatePreviewUrl(rawUrl);
  if (!url) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TalkApp-LinkPreview/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return {
        url,
        title: null,
        description: null,
        image: null,
        domain: new URL(url).hostname,
      };
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_HTML_BYTES) return null;
    const html = new TextDecoder("utf-8").decode(buf);

    const title = parseTitle(html);
    const description =
      parseMetaContent(html, "og:description") ||
      parseMetaContent(html, "description");
    let image =
      parseMetaContent(html, "og:image") || parseMetaContent(html, "twitter:image");
    if (image && image.startsWith("/")) {
      try {
        image = new URL(image, url).href;
      } catch {
        image = null;
      }
    }

    const domain = new URL(url).hostname;
    return {
      url,
      title: title || domain,
      description: description ? description.slice(0, 300) : null,
      image,
      domain,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { extractFirstUrl, fetchLinkPreview, validatePreviewUrl };
