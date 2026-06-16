export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Block server startup until the expensive product caches are warm.
  // Once this resolves, every user's first page load is served from memory.
  const { warmProductCache } = await import("@/lib/product-cache");
  await warmProductCache().catch(() => {});
}
