// Thin wrapper around the Render API for the Ops Center Deployment History
// screen. Read-only. Requires RENDER_API_KEY + RENDER_SERVICE_ID in .env —
// see reference_ops_center_external_creds memory for where to get these.

export interface RenderDeploy {
  id: string;
  status: string;
  trigger: string;
  commitId?: string;
  commitMessage?: string;
  commitCreatedAt?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

interface RenderDeployApiEntry {
  deploy: {
    id: string;
    status: string;
    trigger: string;
    createdAt: string;
    startedAt?: string;
    finishedAt?: string;
    commit?: { id: string; message: string; createdAt: string };
  };
}

export async function getRenderDeploys(limit = 20): Promise<RenderDeploy[]> {
  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = process.env.RENDER_SERVICE_ID;
  if (!apiKey || !serviceId) {
    throw new Error('RENDER_API_KEY or RENDER_SERVICE_ID not configured');
  }

  const res = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys?limit=${limit}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Render API error: ${res.status} ${res.statusText}`);
  }

  const entries = (await res.json()) as RenderDeployApiEntry[];
  return entries.map(({ deploy }) => ({
    id: deploy.id,
    status: deploy.status,
    trigger: deploy.trigger,
    commitId: deploy.commit?.id,
    commitMessage: deploy.commit?.message,
    commitCreatedAt: deploy.commit?.createdAt,
    createdAt: deploy.createdAt,
    startedAt: deploy.startedAt,
    finishedAt: deploy.finishedAt,
  }));
}
