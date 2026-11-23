import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { DriveItem } from '../types';
import type { ShareCandidate } from '../api/driveApi';

const auth = vi.hoisted(() => ({ user: { role: 'Employee' } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../api/driveApi', () => ({ driveApi: {
  getFileShares: vi.fn(), getShareCandidates: vi.fn(), shareFile: vi.fn(), revokeShare: vi.fn(),
} }));
import { driveApi } from '../api/driveApi';
import { ShareModal } from './ShareModal';

const item: DriveItem = {
  id: 'document', name: 'Report', type: 'file', fileType: 'docx', extension: 'docx',
  size: 10, sizeFormatted: '10 B', updatedAt: '', createdAt: '', parentId: null,
  owner: { name: 'Owner', email: 'owner@example.test' },
  starred: false, trashed: false, sharedWith: [], tags: [],
};
const alice = { id: 'alice', email: 'alice@example.test', name: 'Alice' };
const bob = { id: 'bob', email: 'bob@example.test', name: 'Bob' };

describe('Sharing recipient picker', () => {
  const onClose = vi.fn(), onShareSuccess = vi.fn(), onChanged = vi.fn();
  const props = { item, onClose, onShareSuccess, onChanged };
  beforeEach(() => {
    vi.resetAllMocks(); auth.user.role = 'Employee';
    vi.mocked(driveApi.getFileShares).mockResolvedValue([]);
    vi.mocked(driveApi.getShareCandidates).mockResolvedValue([alice]);
    vi.mocked(driveApi.shareFile).mockResolvedValue({});
  });
  const mount = async () => {
    const result = render(<ShareModal {...props} />);
    const input = screen.getByRole('combobox', { name: 'Email người nhận' });
    await waitFor(() => expect(input).toBeEnabled());
    return { ...result, input };
  };
  const add = (input: HTMLElement, email: string) => {
    fireEvent.change(input, { target: { value: email } });
    fireEvent.keyDown(input, { key: 'Enter' });
  };

  it('looks up after one character, highlights the match and keeps focus after selection', async () => {
    const { input } = await mount();
    fireEvent.change(input, { target: { value: 'A' } });
    expect(driveApi.getShareCandidates).not.toHaveBeenCalled();
    const option = await screen.findByRole('option', { name: 'alice@example.test Alice' });
    expect(option.querySelector('mark')).toHaveTextContent('a');
    expect(driveApi.getShareCandidates).toHaveBeenCalledWith('document', 'A', expect.any(AbortSignal));
    fireEvent.click(option);
    expect(screen.getByRole('button', { name: 'Xóa người nhận alice@example.test' })).toBeInTheDocument();
    expect(input).toHaveValue(''); expect(input).toHaveFocus();
    expect(driveApi.shareFile).not.toHaveBeenCalled();
  });

  it('accepts full typed emails, prevents case-insensitive duplicates and removes only pending labels', async () => {
    const { input } = await mount();
    add(input, ' ALICE@example.test ');
    add(input, 'alice@EXAMPLE.test');
    expect(await screen.findByText('Email này đã được chọn.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Xóa người nhận alice@example.test' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Xóa người nhận alice@example.test' }));
    expect(screen.queryByRole('button', { name: 'Xóa người nhận alice@example.test' })).not.toBeInTheDocument();
    expect(driveApi.revokeShare).not.toHaveBeenCalled();
  });

  it('rejects an invalid email and does not submit it', async () => {
    const { input } = await mount();
    add(input, 'not-an-email');
    expect(screen.getByText('Vui lòng nhập địa chỉ email hợp lệ.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Chia sẻ' }));
    expect(driveApi.shareFile).not.toHaveBeenCalled();
  });

  it('supports arrow selection and Escape dismisses the list before the dialog', async () => {
    const { input } = await mount();
    fireEvent.change(input, { target: { value: 'a' } });
    await screen.findByRole('listbox');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument(); expect(onClose).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'al' } });
    await screen.findByRole('option', { name: 'alice@example.test Alice' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Xóa người nhận alice@example.test' })).toBeInTheDocument();
    expect(driveApi.shareFile).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('discards outdated lookup responses and excludes already selected accounts', async () => {
    let resolveOld!: (items: ShareCandidate[]) => void;
    vi.mocked(driveApi.getShareCandidates)
      .mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
      .mockResolvedValue([bob]);
    const { input } = await mount();
    fireEvent.change(input, { target: { value: 'a' } });
    await waitFor(() => expect(driveApi.getShareCandidates).toHaveBeenCalledOnce());
    fireEvent.change(input, { target: { value: 'b' } });
    const option = await screen.findByRole('option', { name: 'bob@example.test Bob' });
    resolveOld([alice]);
    await waitFor(() => expect(screen.queryByRole('option', { name: 'alice@example.test Alice' })).not.toBeInTheDocument());
    fireEvent.click(option);
    fireEvent.change(input, { target: { value: 'bob' } });
    expect(await screen.findByText('Không có email phù hợp.')).toBeInTheDocument();
  });

  it('allows manual entry after suggestion lookup fails', async () => {
    vi.mocked(driveApi.getShareCandidates).mockRejectedValue(new Error('Offline'));
    const { input } = await mount();
    fireEvent.change(input, { target: { value: 'alice' } });
    expect(await screen.findByText(/Không thể tải gợi ý/)).toBeInTheDocument();
    add(input, alice.email);
    fireEvent.click(screen.getByRole('button', { name: 'Chia sẻ' }));
    await waitFor(() => expect(driveApi.shareFile).toHaveBeenCalledWith('document', alice.email, 'Viewer'));
  });

  it('shares selected and uncommitted typed recipients using the chosen permission', async () => {
    const { input } = await mount();
    add(input, alice.email);
    fireEvent.change(input, { target: { value: bob.email } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Quyền người nhận' }), { target: { value: 'Editor' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chia sẻ' }));
    await waitFor(() => expect(onShareSuccess).toHaveBeenCalledWith('Đã chia sẻ tài liệu cho 2/2 người nhận.'));
    expect(vi.mocked(driveApi.shareFile).mock.calls.map(call => call.slice(0, 3))).toEqual([
      ['document', alice.email, 'Editor'], ['document', bob.email, 'Editor'],
    ]);
    expect(screen.queryByRole('button', { name: /Xóa người nhận/ })).not.toBeInTheDocument();
  });

  it('retains failed recipients and retries without resending successful recipients', async () => {
    vi.mocked(driveApi.shareFile).mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Ineligible recipient')).mockResolvedValue({});
    const { input } = await mount(); add(input, alice.email); add(input, bob.email);
    fireEvent.click(screen.getByRole('button', { name: 'Chia sẻ' }));
    expect(await screen.findByText('bob@example.test: Ineligible recipient')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xóa người nhận alice@example.test' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xóa người nhận bob@example.test' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Chia sẻ' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Chia sẻ' }));
    await waitFor(() => expect(driveApi.shareFile).toHaveBeenCalledTimes(3));
    expect(driveApi.shareFile).toHaveBeenLastCalledWith('document', bob.email, 'Viewer');
  });

  it('keeps existing recipient permission editing and revocation intact', async () => {
    vi.mocked(driveApi.getFileShares).mockResolvedValue([
      { recipientId: 'alice', email: alice.email, name: 'Alice', role: 'Viewer' },
    ]);
    const { input } = await mount();
    add(input, alice.email);
    expect(screen.getByText(/Tài khoản này đã được chia sẻ/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: `Quyền của ${alice.email}` }), { target: { value: 'Editor' } });
    await waitFor(() => expect(driveApi.shareFile).toHaveBeenCalledWith('document', alice.email, 'Editor', undefined));
    const revoke = screen.getByRole('button', { name: `Thu hồi chia sẻ với ${alice.email}` });
    await waitFor(() => expect(revoke).toBeEnabled()); fireEvent.click(revoke);
    await waitFor(() => expect(driveApi.revokeShare).toHaveBeenCalledWith('document', 'alice'));
  });

  it('blocks the entire picker for TenantAdmin', async () => {
    auth.user.role = 'TenantAdmin'; render(<ShareModal {...props} />);
    expect(screen.getByRole('combobox', { name: 'Email người nhận' })).toBeDisabled();
    expect(driveApi.getShareCandidates).not.toHaveBeenCalled(); expect(driveApi.getFileShares).not.toHaveBeenCalled();
  });

  it('stops scheduling recipients when the document changes during submission', async () => {
    let finish!: (value: unknown) => void;
    vi.mocked(driveApi.shareFile).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const { input, rerender } = await mount();
    add(input, alice.email); add(input, bob.email);
    fireEvent.click(screen.getByRole('button', { name: 'Chia sẻ' }));
    await waitFor(() => expect(driveApi.shareFile).toHaveBeenCalledOnce());
    rerender(<ShareModal {...props} item={{ ...item, id: 'another-document' }} />);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Email người nhận' })).toBeEnabled());
    finish({});
    await waitFor(() => expect(driveApi.getFileShares).toHaveBeenCalledWith('another-document'));
    expect(driveApi.shareFile).toHaveBeenCalledOnce(); expect(onShareSuccess).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Xóa người nhận/ })).not.toBeInTheDocument();
  });
});
