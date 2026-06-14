export function register() {
  // Only run in Node.js (not edge runtime)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Fire-and-forget: warm the expensive caches in the background so the
  // first real page request doesn't pay the cold-cache penalty.
  // Errors are silently swallowed — a cache miss on first request is fine.
  Promise.all([
    import("@/modules/products/actions/get-filter-options").then((m) => m.getFilterOptions()),
    import("@/modules/products/actions/get-products").then((m) =>
      Promise.all([m.getCachedCountAll(), m.getCachedCountActive()])
    ),
    import("@/modules/price-rules/actions/get-price-rules").then((m) => m.getActivePriceRules()),
  ]).catch(() => {});
}
