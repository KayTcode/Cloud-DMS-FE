import axiosClient from '@/api/axiosClient';
import { DepartmentInfo, DepartmentMember, QuotaRequest, StorageAlert, StorageGrowthPoint } from '../types';

export const departmentApi = {
  // Department Overview & Storage
  getOverview: async (deptId?: string): Promise<DepartmentInfo> => {
    try {
      const response = await axiosClient.get(`/api/departments/${deptId || 'current'}/overview`);
      return response.data;
    } catch {
      // Fallback mock if backend endpoint is in development
      return {
        name: 'Engineering',
        tenantName: 'ACME CORPORATION',
        adminName: 'Alex Mercer',
        adminRole: 'Department Admin',
        adminEmail: 'alex.mercer@acmecorp.internal',
        totalAllocatedGB: 350,
        tenantPoolLimitGB: 500,
        usedSpaceGB: 285,
        filesStorageGB: 228,
        backupsStorageGB: 42,
        otherStorageGB: 15,
        growthDeltaSinceAprGB: 65,
      };
    }
  },

  // Staff members in department
  getMembers: async (deptId?: string): Promise<DepartmentMember[]> => {
    try {
      const response = await axiosClient.get(`/api/departments/${deptId || 'current'}/members`);
      return response.data;
    } catch {
      return [];
    }
  },

  // Update member allocated quota
  updateMemberQuota: async (memberId: string, quotaGB: number): Promise<void> => {
    await axiosClient.put(`/api/departments/members/${memberId}/quota`, { quotaGB });
  },

  // Quota Requests
  getRequests: async (deptId?: string): Promise<QuotaRequest[]> => {
    try {
      const response = await axiosClient.get(`/api/departments/${deptId || 'current'}/requests`);
      return response.data;
    } catch {
      return [];
    }
  },

  approveRequest: async (requestId: string, note?: string): Promise<void> => {
    await axiosClient.post(`/api/departments/requests/${requestId}/approve`, { note });
  },

  rejectRequest: async (requestId: string, reason?: string): Promise<void> => {
    await axiosClient.post(`/api/departments/requests/${requestId}/reject`, { reason });
  },
};
