export const VIEWS = ["list", "detail"];
export const DEFAULT_VIEW = "list";

function normalize(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^#\/?/, "")
    .replace(/^\/+/, "");
}

export function resolveViewFromHash(hash) {
  const candidate = normalize(hash);
  return VIEWS.includes(candidate) ? candidate : DEFAULT_VIEW;
}

export function toViewHash(view) {
  const candidate = normalize(view);
  const safe = VIEWS.includes(candidate) ? candidate : DEFAULT_VIEW;
  return `#/${safe}`;
}
