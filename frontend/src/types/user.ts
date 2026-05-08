export type User = {
  id: string;
  email: string;
  name: string;
  isTwoFactorEnabled: boolean;
  isEmailVerified: boolean;
  isGoogleLinked: boolean;
  hasPassword: boolean;
  recoveryCodesCount: number;
};
