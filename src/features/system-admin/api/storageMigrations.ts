import api from '@/api/axiosClient';
export interface StorageMigrationJob {
  id: string; sourceProviderId: string; destinationProviderId: string; state: string; revision: number;
  totalBytes: number; verifiedBytes: number; confirmedBytes: number; totalObjects: number; verifiedObjects: number;
  totalTenants: number; completedTenants: number; grantBytes: number; errorCode: string;
  maintenance: boolean; cleanupAfter?: string; cleanupAuthorized: boolean;
}
const root = '/admin/storage-migrations';
export const storageMigrations = {
  capabilities: (): Promise<{ sourceType: string; destinationType: string }[]> => api.get(`${root}/capabilities`).then((r: any) => r?.value ?? r),
  list: (page = 1): Promise<StorageMigrationJob[]> => api.get(root, { params: { page } }).then((r: any) => r?.value ?? r),
  create: (sourceProviderId: string, destinationProviderId: string, key: string): Promise<StorageMigrationJob> =>
    api.post(root, { sourceProviderId, destinationProviderId }, { headers: { 'Idempotency-Key': key } }).then((r: any) => r?.value ?? r),
  act: (job: StorageMigrationJob, action: string): Promise<StorageMigrationJob> =>
    api.post(`${root}/${job.id}/${action}`, { revision: job.revision }).then((r: any) => r?.value ?? r),
  items: (id: string, page: number): Promise<any[]> => api.get(`${root}/${id}/items`, { params: { page } }).then((r: any) => r?.value ?? r),
};
