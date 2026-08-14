function Block({ className = '' }: { className?: string }) {
  return <div className={`bg-[#E7E4DE]/60 rounded-2xl animate-pulse ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 space-y-5" aria-busy="true" aria-label="Loading dashboard">
      <Block className="h-40" />
      <Block className="h-56" />
      <div className="grid sm:grid-cols-2 gap-5">
        <Block className="h-44" />
        <Block className="h-44" />
      </div>
      <Block className="h-40" />
      <Block className="h-44" />
    </div>
  );
}
