export async function register() {
  // Only run in Node.js (not edge runtime)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Await cache warming so the server only starts accepting requests once
  // the expensive queries (DISTINCT brand/supplier on 1M rows, counts) are
  // already cached. Errors are swallowed — a miss on first request is fine.
  await Promise.all([
    import("@/modules/products/actions/get-filter-options").then((m) => m.getFilterOptions()),
    import("@/modules/products/actions/get-products").then((m) =>
      Promise.all([m.getCachedCountAll(), m.getCachedCountActive()])
    ),
    import("@/modules/price-rules/actions/get-price-rules").then((m) => m.getActivePriceRules()),
  ]).catch(() => {});
}
