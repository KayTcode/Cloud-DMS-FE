import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OffboardEmployeeModal } from './OffboardEmployeeModal';
import { departmentApi } from '../api';
import type { DepartmentInfo, DepartmentMember } from '../types';

vi.mock('../api', () => ({ departmentApi: { offboardEmployee: vi.fn() } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'lead' } }) }));

describe('Offboarding quota accounting display', () => {
  it('shows reusable quota separately from retained quota and the old personal grant', async () => {
    const gb = 1024 ** 3;
    vi.mocked(departmentApi.offboardEmployee).mockResolvedValue({ returnedQuotaBytes: 8 * gb,
      retainedQuotaBytes: 2 * gb, reclaimedQuotaBytes: 10 * gb, offboardedAt: new Date().toISOString(),
      transferredFilesCount: 1, transferredFoldersCount: 1, abortedUploadSessionsCount: 1 } as any);
    const employee = { id: 'employee', name: 'Employee', allocatedQuotaGB: 10, usedSpaceGB: 2,
      status: 'active', email: 'employee@test.example' } as DepartmentMember;
    render(<OffboardEmployeeModal isOpen onClose={vi.fn()} employee={employee}
      department={{ id: 'department', name: 'Department', adminId: 'lead' } as DepartmentInfo}
      departmentMembers={[employee, { ...employee, id: 'peer', name: 'Peer' }]}
      custodianUserId="lead" onSuccess={vi.fn()} />);
    expect(screen.queryByText(/Sẽ hoàn trả 100%/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'peer' } });
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận Vô hiệu hóa/ }));
    expect(await screen.findByText(/Quota có thể cấp lại cho nhân viên:/)).toHaveTextContent('+8.0 GB');
    expect(screen.getByText(/Quota giữ cho dữ liệu bàn giao:/)).toHaveTextContent('2.0 GB');
    expect(screen.queryByText('+10.0 GB')).not.toBeInTheDocument();
  });
});
