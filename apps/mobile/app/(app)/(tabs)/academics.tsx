import { ParentAcademicsScreen } from '@/features/parent-workspace/screens/ParentAcademicsScreen';

// Parent-only tab — hidden for every staff role via `href: null` in
// (tabs)/_layout.tsx, same pattern as the staff-only "teachers" tab.
export default function AcademicsIndex() {
  return <ParentAcademicsScreen />;
}
