export const VIEWS = ["dashboard", "strains", "profile"];
export const DEFAULT_VIEW = "dashboard";

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
