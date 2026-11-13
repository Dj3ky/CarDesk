// Shown instantly on navigation while the offer detail renders on the server.
// Also enables partial prefetching of this dynamic route (see Next.js docs:
// "Dynamic routes without loading.tsx").
export default function OfferDetailLoading() {
  return (
    <div className="max-w-6xl animate-pulse space-y-6" aria-busy="true">
      <div className="h-8 w-24 rounded-md bg-muted" />
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-md bg-muted" />
        <div className="h-4 w-72 rounded-md bg-muted" />
      </div>
      <div className="h-px bg-border" />
      <div className="h-10 rounded-md bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-36 rounded-lg bg-muted" />
        <div className="h-36 rounded-lg bg-muted" />
      </div>
      <div className="h-64 rounded-lg bg-muted" />
    </div>
  );
}
