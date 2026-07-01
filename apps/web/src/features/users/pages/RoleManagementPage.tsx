import { Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useRoles, usePermissions } from '../hooks/useUsers';
import { RoleBadge } from '../components/RoleBadge';
import { PermissionBadge } from '../components/PermissionBadge';
import { PageContainer } from '@/components/workspace/PageContainer';
import type { UserRole, Permission } from '@schoolos/types';

export const RoleManagementPage = () => {
  const { data: roles, isLoading: rolesLoading, isError: rolesError } = useRoles();
  const { data: permissions } = usePermissions();

  const categorized = permissions?.reduce<Record<string, Permission[]>>((acc, p) => {
    const cat = p.category;
    (acc[cat] ??= []).push(p.id);
    return acc;
  }, {});

  if (rolesLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </PageContainer>
    );
  }

  if (rolesError) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-base font-medium text-gray-700">Failed to load roles</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Roles &amp; Permissions</h1>
        <p className="text-base text-gray-500 mt-1">
          Review what each role can access. Roles are fixed by design.
        </p>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {roles?.map((role) => (
          <div key={role.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
              </div>
              <RoleBadge role={role.id as UserRole} />
            </div>
            <p className="text-sm text-gray-500 mb-4">{role.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {role.permissions.map((p) => (
                <PermissionBadge key={p} permission={p as Permission} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Permission reference */}
      {categorized && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-5">Permission Reference</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(categorized).map(([category, perms]) => (
              <div key={category}>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  {category}
                </p>
                <div className="flex flex-col gap-1.5">
                  {perms.map((p) => (
                    <PermissionBadge key={p} permission={p} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
};
