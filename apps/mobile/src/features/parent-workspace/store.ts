import { create } from 'zustand';

// Which child a multi-child parent is currently viewing. Kept as a tiny
// standalone store (rather than local state on one screen) so Home,
// Academics, Attendance, and Fees — separate tabs/routes — all read the
// same selection without prop-drilling through the tab navigator.
interface SelectedChildState {
  selectedChildId: string | null;
  setSelectedChildId: (childId: string) => void;
}

export const useSelectedChildStore = create<SelectedChildState>((set) => ({
  selectedChildId: null,
  setSelectedChildId: (childId) => set({ selectedChildId: childId }),
}));
