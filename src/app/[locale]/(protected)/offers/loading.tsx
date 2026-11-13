// Shown instantly when going back to the offers list while it re-renders.
export default function OffersLoading() {
  return (
    <div className="animate-pulse space-y-5" aria-busy="true">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted" />
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-md bg-muted" />
          <div className="h-4 w-24 rounded-md bg-muted" />
        </div>
      </div>
      <div className="h-9 rounded-md bg-muted sm:w-2/3" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
