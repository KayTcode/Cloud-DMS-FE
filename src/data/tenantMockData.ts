import { TenantInfo, TenantEvent, TenantUser, Department } from '@/features/tenants/types';

export const initialTenant: TenantInfo = {
  id: 'tnt_acme_89f81',
  name: 'Acme Corporation',
  status: 'ACTIVE',
  plan: 'ENTERPRISE PLAN',
  contactEmail: 'admin@acme.com',
  createdAt: 'Jan 12, 2024',
  licenseUsed: 1200,
  licenseLimit: 1500,
  departmentsCount: 14,
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
  { id: 'usr-1', name: 'Sarah Jenkins', email: 's.jenkins@acme.com', department: 'HR', role: 'HR Specialist', status: 'Active', lastActive: '10m ago' },
  { id: 'usr-2', name: 'Marcus Vance', email: 'm.vance@acme.com', department: 'Legal', role: 'General Counsel', status: 'Active', lastActive: '25m ago' },
  { id: 'usr-3', name: 'David Zhao', email: 'd.zhao@acme.com', department: 'Finance', role: 'Senior Controller', status: 'Active', lastActive: '1 hr ago' },
  { id: 'usr-4', name: 'Elena Rostova', email: 'e.rostova@acme.com', department: 'Engineering', role: 'Staff Architect', status: 'Active', lastActive: '2 hrs ago' },
  { id: 'usr-5', name: 'Carlos Mendez', email: 'c.mendez@acme.com', department: 'Operations', role: 'Director of Ops', status: 'Active', lastActive: '5 hrs ago' },
];

export const mockDepartments: Department[] = [
  { id: 'dept-1', name: 'Human Resources', headCount: 142, lead: 'Patricia Hayes', allocatedStorageGB: 450 },
  { id: 'dept-2', name: 'Legal & Compliance', headCount: 68, lead: 'Marcus Vance', allocatedStorageGB: 850 },
  { id: 'dept-3', name: 'Corporate Finance', headCount: 110, lead: 'David Zhao', allocatedStorageGB: 600 },
  { id: 'dept-4', name: 'Engineering & R&D', headCount: 420, lead: 'Elena Rostova', allocatedStorageGB: 1800 },
  { id: 'dept-5', name: 'Global Operations', headCount: 260, lead: 'Carlos Mendez', allocatedStorageGB: 700 },
];
