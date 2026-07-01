import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { UserForm } from '../components/UserForm';
import { useCreateUser } from '../hooks/useUsers';
import { PageContainer } from '@/components/workspace/PageContainer';
import type { CreateUserPayload } from '@schoolos/types';

export const CreateUserPage = () => {
  const navigate = useNavigate();
  const { mutateAsync: createUser, isPending, error } = useCreateUser();

  const handleSubmit = async (data: CreateUserPayload) => {
    try {
      const user = await createUser(data);
      toast.success(`${user.firstName} ${user.lastName} created successfully`);
      navigate('/administration/users');
    } catch {
      // error displayed via form
    }
  };

  return (
    <PageContainer narrow>
      {/* Back */}
      <button
        onClick={() => navigate('/administration/users')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        type="button"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Users
      </button>

      <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Add User</h1>
      <p className="text-base text-gray-500 mb-8">Create a new staff account.</p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <UserForm
          isLoading={isPending}
          error={error instanceof Error ? error.message : undefined}
          onSubmit={(data) => void handleSubmit(data as CreateUserPayload)}
          onCancel={() => navigate('/administration/users')}
        />
      </div>
    </PageContainer>
  );
};
