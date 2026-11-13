import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CancelInvitationModal } from './CancelInvitationModal';
import type { PendingInvitationDto } from '../types/invitation.types';

const makeInvitation = (over: Partial<PendingInvitationDto> = {}): PendingInvitationDto => ({
  userId: 'u1',
  fullName: 'Nguyễn Văn A',
  email: 'a@example.com',
  roleName: 'Employee',
  tenantId: 't1',
  tenantName: 'Tenant 1',
  departmentId: 'd1',
  departmentName: 'Phòng Kế toán',
  quotaBytes: 5 * 1024 ** 3,
  createdAt: '2026-11-01T00:00:00Z',
  lastInvitationSentAt: null,
  tokenExpiresAt: '2026-11-20T00:00:00Z',
  isExpired: false,
  ...over,
});

const renderModal = (over: Partial<React.ComponentProps<typeof CancelInvitationModal>> = {}) => {
  const props = {
    invitation: makeInvitation(),
    isSubmitting: false,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    ...over,
  };
  render(<CancelInvitationModal {...props} />);
  return props;
};

describe('CancelInvitationModal', () => {
  it('renders nothing when invitation is null', () => {
    renderModal({ invitation: null });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(/hủy lời mời/i)).not.toBeInTheDocument();
  });

  it('shows the target email in the confirmation copy', () => {
    renderModal();
    expect(screen.getByText('a@example.com')).toBeInTheDocument();
  });

  it('warns that the account and its quota may be removed', () => {
    renderModal();
    expect(screen.getByText(/chưa từng đăng nhập/i)).toHaveTextContent(/xóa/i);
    expect(screen.getByText(/cựu nhân sự/i)).toHaveTextContent(/gỡ liên kết/i);
    expect(screen.getByText(/hạn mức.*hoàn trả/i)).toBeInTheDocument();
  });

  it('calls onConfirm with the target user id', async () => {
    const user = userEvent.setup();
    const props = renderModal({ invitation: makeInvitation({ userId: 'user-42' }) });
    await user.click(screen.getByRole('button', { name: /xác nhận hủy/i }));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).toHaveBeenCalledWith('user-42');
  });

  it('disables the confirm button while isSubmitting', () => {
    renderModal({ isSubmitting: true });
    expect(screen.getByRole('button', { name: /xác nhận hủy/i })).toBeDisabled();
  });
});
