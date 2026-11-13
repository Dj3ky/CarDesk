// Generic loading UI for every protected page that has no loading.tsx of its
// own. Sidebar and header stay (they live in the layout); only the main
// content area is swapped for this placeholder while the server renders.
export default function ProtectedLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted" />
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-md bg-muted" />
          <div className="h-4 w-64 rounded-md bg-muted" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-10 rounded-md bg-muted sm:w-2/3" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
