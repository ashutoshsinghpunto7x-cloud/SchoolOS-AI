import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '@/services/health.service';
import { cn } from '@/lib/utils';

const StatusDot = ({ connected }: { connected: boolean }) => (
  <span
    className={cn(
      'inline-block h-2 w-2 rounded-full',
      connected ? 'bg-emerald-500' : 'bg-red-400'
    )}
  />
);

export const SystemStatus = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });

  const isConnected = !isLoading && !isError && data?.success === true;
  const dbConnected = data?.meta?.database === 'connected';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 text-center">

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            SchoolOS AI
          </h1>
          <p className="text-sm text-muted-foreground">Project Foundation</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Backend API</span>
            <span className="flex items-center gap-2 font-medium">
              {isLoading ? (
                <span className="text-muted-foreground">Checking…</span>
              ) : (
                <>
                  <StatusDot connected={isConnected} />
                  <span className={isConnected ? 'text-emerald-600' : 'text-red-500'}>
                    {isConnected ? 'Online' : 'Unreachable'}
                  </span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Database</span>
            <span className="flex items-center gap-2 font-medium">
              {isLoading ? (
                <span className="text-muted-foreground">Checking…</span>
              ) : (
                <>
                  <StatusDot connected={dbConnected} />
                  <span className={dbConnected ? 'text-emerald-600' : 'text-red-500'}>
                    {data?.meta?.database ?? 'Unknown'}
                  </span>
                </>
              )}
            </span>
          </div>

          {data?.meta && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Environment</span>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground capitalize">
                {data.meta.environment}
              </span>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          BUILD-001 · Authentication and modules are in Sprint 2+
        </p>
      </div>
    </div>
  );
};
