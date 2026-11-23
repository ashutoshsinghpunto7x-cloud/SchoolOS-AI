import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { CompanionBuddy } from './CompanionBuddy';
import { companionConfigFor } from './companionConfigs';
import { TeacherAssistantWidget } from './TeacherAssistantWidget';

// Companion buddy for every dashboard except the principal's (that one is
// mounted by PrincipalAssistantWidget, since it drives the principal chat).
// What a click does depends on what the dashboard already has:
//  - parent: opens the existing "Ask about your child" AI sheet on the home page;
//  - everyone else: no chat assistant exists yet, so the buddy explains the page.
export const RoleCompanion = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;
  const config = companionConfigFor(role);
  if (!config || role === 'principal' || role === 'incharge') return null;

  if (role === 'parent') {
    return (
      <CompanionBuddy
        config={config}
        label="Ask about your child"
        onActivate={() => navigate('/parent', { state: { openAssistant: true } })}
      />
    );
  }
  if (role === 'teacher') return <TeacherAssistantWidget />;
  return <CompanionBuddy config={config} label="Help on this page" />;
};
