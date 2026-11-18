import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TenantDepartmentDetailView } from './TenantDepartmentDetailView';
import { invitationsApi } from '@/features/invitations/api/invitationsApi';
import { getDepartmentDetail } from '@/features/tenants/api/tenantQueries';
import type { DepartmentDetail } from '@/features/tenants/types';
import type { PendingInvitationDto } from '@/features/invitations';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { tenantId: 't1' } }),
}));

vi.mock('@/features/tenants/api/tenantQueries', () => ({
  getDepartmentDetail: vi.fn(),
}));

vi.mock('@/features/tenants/api/fileApi', () => ({
  getExpiringFilesApi: vi.fn().mockResolvedValue({
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 10,
    totalPages: 1,
  }),
  downloadTenantFileApi: vi.fn(),
  permanentDeleteFileApi: vi.fn(),
}));

vi.mock('@/features/invitations/api/invitationsApi', () => ({
  invitationsApi: { getPending: vi.fn(), resend: vi.fn(), cancel: vi.fn() },
}));

const mockDeptDetail: DepartmentDetail = {
  id: 'd1',
  name: 'Phòng Kỹ thuật',
  description: 'Mô tả phòng kỹ thuật',
  tenantId: 't1',
  quotaBytes: 10 * 1024 ** 3,
  usedBytes: 2 * 1024 ** 3,
  isVacant: false,
  lead: {
    id: 'u-lead',
    fullName: 'Lead Name',
    email: 'lead@example.com',
    isActive: true,
  },
  employees: [
    {
      id: 'e1',
      fullName: 'Nhân viên 1',
      email: 'e1@example.com',
      isActive: true,
      usedSpaceBytes: 1024,
      allocatedQuotaBytes: 1024 * 1024,
    },
  ],
};

const mockInvitation: PendingInvitationDto = {
  userId: 'inv-1',
  fullName: 'Ứng viên mới',
  email: 'ungvien@example.com',
  roleName: 'Employee',
  tenantId: 't1',
  tenantName: 'Tenant 1',
  departmentId: 'd1',
  departmentName: 'Phòng Kỹ thuật',
  quotaBytes: 1024 ** 3,
  createdAt: '2026-11-01T00:00:00Z',
  lastInvitationSentAt: null,
  tokenExpiresAt: new Date(Date.now() + 48 * 3600_000).toISOString(),
  isExpired: false,
};

const mockPage = (items: PendingInvitationDto[]) => ({
  items,
  pageNumber: 1,
  totalPages: 1,
  totalCount: items.length,
  hasPreviousPage: false,
  hasNextPage: false,
});

describe('TenantDepartmentDetailView with PendingInvitationsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDepartmentDetail).mockResolvedValue(mockDeptDetail);
    vi.mocked(invitationsApi.getPending).mockResolvedValue(mockPage([mockInvitation]));
  });

  it('renders pending invitations table for the specific department', async () => {
    render(
      <TenantDepartmentDetailView
        tenantId="t1"
        departmentId="d1"
        onBack={vi.fn()}
      />
    );

    expect(await screen.findByText('Lời mời đang chờ (Phòng Kỹ thuật)')).toBeInTheDocument();
    expect(await screen.findByText('ungvien@example.com')).toBeInTheDocument();

    expect(invitationsApi.getPending).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't1',
        departmentId: 'd1',
      })
    );
  });

  it('allows resending an invitation and displays the success toast', async () => {
    const user = userEvent.setup();
    vi.mocked(invitationsApi.resend).mockResolvedValue({
      targetUserId: 'inv-1',
      email: 'ungvien@example.com',
      message: 'Đã gửi lại lời mời.',
      newExpiresAt: '2026-12-25T10:00:00Z',
    });

    render(
      <TenantDepartmentDetailView
        tenantId="t1"
        departmentId="d1"
        onBack={vi.fn()}
      />
    );

    expect(await screen.findByText('ungvien@example.com')).toBeInTheDocument();

    const resendBtn = await screen.findByRole('button', { name: 'Gửi lại' });
    await user.click(resendBtn);

    await waitFor(() => {
      expect(invitationsApi.resend).toHaveBeenCalledWith('inv-1');
      expect(screen.getByText(/Đã gửi lại lời mời\./)).toBeInTheDocument();
    });
  });
});
