import { useTenantContext } from '@/context/TenantContext';

/**
 * Custom hook to trigger toasts easily across components
 */
export const useToast = () => {
  const { addToast, handleDismissToast, toasts } = useTenantContext();

  return {
    toasts,
    toast: {
      success: (msg: string) => addToast('success', msg),
      error: (msg: string) => addToast('error', msg),
      info: (msg: string) => addToast('info', msg),
      warning: (msg: string) => addToast('warning', msg),
    },
    dismiss: handleDismissToast,
  };
};
