import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Loader2, AlertCircle, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { UserCard } from '../components/UserCard';
import { UserFilters } from '../components/UserFilters';
import { SearchBar } from '@/components/ui/SearchBar';
import { PageContainer } from '@/components/workspace/PageContainer';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { UserRole, UserStatus } from '@schoolos/types';

const PAGE_SIZE = 20;

export const UserManagementPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useUsers({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    role: role || undefined,
    status: status || undefined,
  });

  const users = data?.data ?? [];
  const meta = data?.meta;

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, []);

  const handleRoleChange = useCallback((val: UserRole | '') => {
    setRole(val);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((val: UserStatus | '') => {
    setStatus(val);
    setPage(1);
  }, []);

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Users</h1>
          <p className="text-base text-gray-500 mt-1">
            Manage staff accounts and permissions.
          </p>
        </div>
        <button
          onClick={() => navigate('/administration/users/new')}
          className="h-12 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                     flex items-center gap-2 text-sm font-bold text-white transition-colors"
          type="button"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchBar
          placeholder="Search by name or email…"
          value={searchInput}
          onChange={setSearchInput}
          onSearch={handleSearch}
          className="flex-1"
        />
        <UserFilters
          role={role}
          status={status}
          onRoleChange={handleRoleChange}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading users…</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-base font-medium text-gray-700">Failed to load users</p>
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center">
            <Users className="w-9 h-9 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {search || role || status ? 'No users match your filters' : 'No users yet'}
            </h3>
            <p className="text-base text-gray-500 mt-1">
              {search || role || status
                ? 'Try adjusting your search or filters.'
                : 'Add your first staff member to get started.'}
            </p>
          </div>
          {!(search || role || status) && (
            <button
              onClick={() => navigate('/administration/users/new')}
              className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-bold text-white transition-colors"
              type="button"
            >
              Add First User
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Count */}
          {meta && (
            <p className="text-sm text-gray-400 mb-4">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, meta.total)} of {meta.total} users
            </p>
          )}

          <div className="flex flex-col gap-3">
            {users.map((user) => (
              <UserCard
                key={user._id}
                user={user}
                isSelf={user._id === currentUser?.userId}
              />
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={!meta.hasPrevPage}
                className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center
                           text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                type="button"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-gray-600">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!meta.hasNextPage}
                className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center
                           text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                type="button"
                aria-label="Next page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
};
