export function buildStrainsDocument(strains) {
  return {
    strains: Array.isArray(strains) ? strains : [],
    updatedAt: new Date().toISOString()
  };
}

export function extractStrainsFromDocument(payload, fallback = []) {
  const safeFallback = Array.isArray(fallback) ? fallback : [];
  if (!payload || typeof payload !== "object") {
    return safeFallback;
  }
  if (!Array.isArray(payload.strains)) {
    return safeFallback;
  }
  return payload.strains;
}
