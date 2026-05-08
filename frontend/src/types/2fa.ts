export type TwoFactorSetupResponse = {
  message: string;
  qrCodeDataUrl?: string;
  manualKey?: string;
};
