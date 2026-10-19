import { TenantInfo, TenantEvent, TenantUser, Department } from '@/features/tenants/types';

export const initialTenant: TenantInfo = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'FPT Corporation',
  status: 'ACTIVE',
  plan: 'ENTERPRISE PLAN',
  contactEmail: 'admin@system.local',
  createdAt: 'Jan 12, 2024',
  licenseUsed: 1200,
  licenseLimit: 1500,
  departmentsCount: 3,
  diskUsedTB: 2.4,
  diskAllocatedTB: 5.0,
  filesCount: 240124,
  directoriesCount: 18902,
};

export const initialEvents: TenantEvent[] = [
  {
    id: 'evt-1',
    text: 'User Sarah Jenkins added to HR department',
    timeAgo: '10m ago',
    timestamp: '2026-09-28 17:02',
    type: 'user',
  },
  {
    id: 'evt-2',
    text: "Document 'Q2 Financials.pdf' deleted",
    timeAgo: '1 hr ago',
    timestamp: '2026-09-28 16:15',
    type: 'document',
  },
  {
    id: 'evt-3',
    text: 'Bulk upload (240 files) completed',
    timeAgo: '3 hrs ago',
    timestamp: '2026-09-28 14:30',
    type: 'storage',
  },
];

export const mockUsers: TenantUser[] = [
  { id: 'usr-1', name: 'Sarah Jenkins', email: 's.jenkins@fpt.com', department: 'Human Resources', role: 'HR Specialist', status: 'Active', lastActive: '10m ago' },
  { id: 'usr-2', name: 'Marcus Vance', email: 'm.vance@fpt.com', department: 'Information Technology', role: 'Staff Architect', status: 'Active', lastActive: '25m ago' },
  { id: 'usr-3', name: 'David Zhao', email: 'd.zhao@fpt.com', department: 'Finance & Accounting', role: 'Senior Controller', status: 'Active', lastActive: '1 hr ago' },
];

export const mockDepartments: Department[] = [
  { id: '22222222-2222-2222-2222-222222222221', name: 'Information Technology', headCount: 142, lead: 'Marcus Vance', allocatedStorageGB: 450 },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Human Resources', headCount: 68, lead: 'Sarah Jenkins', allocatedStorageGB: 850 },
  { id: '22222222-2222-2222-2222-222222222223', name: 'Finance & Accounting', headCount: 110, lead: 'David Zhao', allocatedStorageGB: 600 },
];
