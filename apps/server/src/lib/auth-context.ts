export interface AuthContext {
  userId: string;
  schoolId: string;
  displayName: string;
  role: string;
  ip?: string;
}

export const buildAuthContext = (
  user: {
    userId: string;
    schoolId: string;
    firstName: string;
    lastName: string;
    role: string;
  },
  ip?: string
): AuthContext => ({
  userId: user.userId,
  schoolId: user.schoolId,
  displayName: `${user.firstName} ${user.lastName}`,
  role: user.role,
  ip,
});
