import { Loader2 } from 'lucide-react';
import { useOpsSettings } from '../hooks/useOpsData';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';

export function OpsSettingsPage() {
  const { data, isLoading, isError } = useOpsSettings();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-sm text-[#EF4444]">Failed to load settings.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[#F4F6F8]">Settings</h1>
        <p className="mt-1 text-sm text-[#98A2B3]">
          Read-only — reflects the server's live config. There are no toggles here that don't actually do anything;
          things like 2FA enforcement or IP allowlisting aren't built yet, so they're not shown as fake switches.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">General</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <MetricCard label="Environment" value={data.environment} />
          <MetricCard label="Node Version" value={data.nodeVersion} />
          <MetricCard label="Frontend URL" value={data.frontendUrl} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Security</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Access Token Expiry" value={data.authTokens.accessTokenExpiresIn} />
          <MetricCard label="Refresh Token Expiry" value={data.authTokens.refreshTokenExpiresIn} />
          <MetricCard label="Rate Limit" value={`${data.rateLimiting.maxRequests} req`} sublabel={`per ${Math.round(data.rateLimiting.windowMs / 60000)} min window`} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Integrations Configured</h2>
        <div className="rounded-2xl border border-[#232D38] bg-[#121922] p-4 space-y-3">
          {[
            { label: 'OpenAI (AI Assistant)', on: data.integrations.openai },
            { label: 'Twilio WhatsApp', on: data.integrations.twilioWhatsapp },
            { label: 'Firebase Push Notifications', on: data.integrations.firebasePush },
            { label: 'Render Deployment History', on: data.integrations.renderDeployments },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-sm text-[#F4F6F8]">{item.label}</span>
              <StatusBadge status={item.on ? 'healthy' : 'muted'} label={item.on ? 'Configured' : 'Not configured'} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
