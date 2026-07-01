import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { UserForm } from '../components/UserForm';
import { useUser, useUpdateUser } from '../hooks/useUsers';
import { PageContainer } from '@/components/workspace/PageContainer';
import type { UpdateUserPayload } from '@schoolos/types';

export const EditUserPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: user, isLoading, isError } = useUser(id ?? '');
  const { mutateAsync: updateUser, isPending, error } = useUpdateUser(id ?? '');

  const handleSubmit = async (data: UpdateUserPayload) => {
    try {
      const updated = await updateUser(data);
      toast.success(`${updated.firstName} ${updated.lastName} updated`);
      navigate(`/administration/users/${id}`);
    } catch {
      // error displayed via form
    }
  };

  if (isLoading) {
    return (
      <PageContainer narrow>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !user) {
    return (
      <PageContainer narrow>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-base font-medium text-gray-700">User not found</p>
          <button
            onClick={() => navigate('/administration/users')}
            className="text-sm text-blue-600 hover:underline"
            type="button"
          >
            Back to Users
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer narrow>
      {/* Back */}
      <button
        onClick={() => navigate(`/administration/users/${id}`)}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        type="button"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to User
      </button>

      <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Edit User</h1>
      <p className="text-base text-gray-500 mb-8">
        Update account details for {user.firstName} {user.lastName}.
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <UserForm
          initial={user}
          isLoading={isPending}
          error={error instanceof Error ? error.message : undefined}
          onSubmit={(data) => void handleSubmit(data as UpdateUserPayload)}
          onCancel={() => navigate(`/administration/users/${id}`)}
        />
      </div>
    </PageContainer>
  );
};
