import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EASYPARSER_API_KEY = Deno.env.get("EASYPARSER_API_KEY");
const AFFILIATE_TAG = "priskoll-21";

function buildImageUrl(raw) {
  if (!raw) return null;
  // Already a full URL
  if (/^https?:\/\//i.test(raw)) return raw;
  // Easyparser returns just the image ID fragment (e.g. "812p+E9WvxL")
  return `https://m.media-amazon.com/images/I/${raw}._AC_SL300_.jpg`;
}

function parsePrice(raw) {
  if (raw === null || raw === undefined) return null;
  const cleaned = String(raw)
    .replace(/\s/g, "")
    .replace(/,(\d{3})/g, "$1") // thousands separator like "1,299"
    .replace(",", ".");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query } = await req.json();
    if (!query || !query.trim()) {
      return Response.json({ error: "Sökord saknas" }, { status: 400 });
    }

    if (!EASYPARSER_API_KEY) {
      return Response.json({ error: "Sökningen är inte tillgänglig just nu" }, { status: 500 });
    }

    const params = new URLSearchParams({
      api_key: EASYPARSER_API_KEY,
      platform: "AMZ",
      domain: ".se",
      keyword: query.trim(),
      output: "json",
      operation: "SEARCH",
    });

    const res = await fetch(`https://realtime.easyparser.com/v1/request?${params}`);
    if (!res.ok) {
      const body = await res.text();
      console.error(`Easyparser SEARCH ${res.status}:`, body.slice(0, 300));
      return Response.json({ error: "Sökningen misslyckades — prova att klistra in en länk istället" }, { status: 502 });
    }

    const data = await res.json();
    if (!data.request_info?.success) {
      return Response.json({ error: "Sökningen misslyckades — prova att klistra in en länk istället" }, { status: 502 });
    }

    const rawResults = data.result?.search_results || data.result?.results || [];
    const results = rawResults
      .map((r) => {
        const asin = r.asin;
        const priceRaw = r.price?.value ?? r.price?.raw ?? null;
        const price = parsePrice(priceRaw);
        if (!asin || !r.title) return null;
        return {
          asin,
          title: r.title,
          price,
          currency: "SEK",
          image_url: buildImageUrl(r.image),
          amazon_url: `https://www.amazon.se/dp/${asin}?tag=${AFFILIATE_TAG}`,
        };
      })
      .filter(Boolean)
      .slice(0, 10);

    return Response.json({ results });
  } catch (error) {
    console.error("searchAmazon error:", error.message);
    return Response.json({ error: "Sökningen misslyckades — prova att klistra in en länk istället" }, { status: 500 });
  }
});