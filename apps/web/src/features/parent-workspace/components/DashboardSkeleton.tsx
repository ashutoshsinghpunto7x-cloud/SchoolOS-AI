function Block({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-100 rounded-2xl animate-pulse ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5" aria-busy="true" aria-label="Loading dashboard">
      <Block className="h-40" />
      <Block className="h-56" />
      <div className="grid md:grid-cols-2 gap-5">
        <Block className="h-44" />
        <Block className="h-44" />
      </div>
      <Block className="h-40" />
      <Block className="h-44" />
    </div>
  );
}
