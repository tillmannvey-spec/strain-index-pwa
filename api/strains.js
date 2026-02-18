import { head, put } from "@vercel/blob";

import { buildStrainsDocument, extractStrainsFromDocument } from "../src/logic/cloud-storage.js";

const BLOB_PATH = "app/strains.json";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export default async function handler(request) {
  if (request.method === "GET") {
    try {
      const metadata = await head(BLOB_PATH);
      const response = await fetch(metadata.url, { cache: "no-store" });
      if (!response.ok) {
        return jsonResponse({ strains: [] }, 200);
      }
      const payload = await response.json();
      const strains = extractStrainsFromDocument(payload, []);
      return jsonResponse(buildStrainsDocument(strains), 200);
    } catch {
      return jsonResponse(buildStrainsDocument([]), 200);
    }
  }

  if (request.method === "POST") {
    try {
      const payload = await request.json();
      const strains = Array.isArray(payload?.strains) ? payload.strains : [];
      const document = buildStrainsDocument(strains);
      const result = await put(BLOB_PATH, JSON.stringify(document), {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json"
      });
      return jsonResponse({ ok: true, url: result.url, updatedAt: document.updatedAt }, 200);
    } catch (error) {
      return jsonResponse({ ok: false, error: String(error?.message || error) }, 500);
    }
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
}
