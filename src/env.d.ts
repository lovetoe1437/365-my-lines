/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface AppDialogOptions {
  eyebrow?: string;
  title?: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  tone?: "default" | "danger";
}

interface Window {
  showAppDialog?: (options?: AppDialogOptions) => void;
}


type AppToastTone = "success" | "error" | "warning" | "info";

interface AppToastOptions {
  tone?: AppToastTone;
  title?: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
  duration?: number;
}

interface Window {
  showAppToast?: (options?: AppToastOptions) => void;
  setAppToastForNextPage?: (options?: AppToastOptions) => void;
}
