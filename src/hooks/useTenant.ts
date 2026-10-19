import { useTenantContext } from '@/context/TenantContext';

/**
 * Custom hook to access TenantContext
 */
export const useTenant = () => {
  return useTenantContext();
};
