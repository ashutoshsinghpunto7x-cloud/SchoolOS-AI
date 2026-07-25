import { Loader2 } from 'lucide-react';
import { useOpsUsersScreen } from '../hooks/useOpsData';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import type { OpsUser } from '../api/opsApi';

const USER_COLUMNS: DataTableColumn<OpsUser>[] = [
  { key: 'name', header: 'Name', render: (u) => `${u.firstName} ${u.lastName}` },
  { key: 'email', header: 'Email', render: (u) => u.email },
  { key: 'role', header: 'Role', render: (u) => <span className="font-mono text-xs">{u.role}</span> },
  { key: 'school', header: 'School', render: (u) => u.schoolId },
  {
    key: 'status',
    header: 'Status',
    render: (u) => <StatusBadge status={u.status === 'active' ? 'healthy' : 'muted'} label={u.status} />,
  },
  { key: 'lastLogin', header: 'Last Login', render: (u) => (u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never') },
];

export function OpsUsersPage() {
  const { data, isLoading, isError } = useOpsUsersScreen();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-sm text-[#EF4444]">Failed to load users.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[#F4F6F8]">Users</h1>
        <p className="mt-1 text-sm text-[#98A2B3]">
          All platform accounts across every school, plus the live role → permission matrix from the actual RBAC
          config. No fabricated MFA/session data — the app doesn't have 2FA or a device registry yet.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">
          Accounts ({data.users.length})
        </h2>
        <DataTable columns={USER_COLUMNS} rows={data.users} rowKey={(u) => u.id} />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Permission Matrix</h2>
        <div className="overflow-x-auto rounded-2xl border border-[#232D38] bg-[#121922]">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#232D38]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Permission</th>
                {data.roles.map((r) => (
                  <th key={r.role} className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wide text-[#98A2B3]" title={r.description}>
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.permissions.map((p) => (
                <tr key={p.key} className="border-b border-[#232D38] last:border-0">
                  <td className="px-4 py-2 text-[#F4F6F8]">
                    {p.label}
                    <span className="ml-2 text-xs text-[#64748B]">{p.category}</span>
                  </td>
                  {data.roles.map((r) => {
                    const has = data.matrix[r.role]?.includes(p.key);
                    return (
                      <td key={r.role} className="px-3 py-2 text-center">
                        {has ? <span className="text-[#22C55E]">✓</span> : <span className="text-[#232D38]">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
