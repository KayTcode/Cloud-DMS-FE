import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/driveTrashApi', () => ({
  driveTrashApi: {
    getTrash: vi.fn(),
    emptyTrash: vi.fn(),
    restoreFolder: vi.fn(),
    purgeFolder: vi.fn(),
  },
}));

vi.mock('../api/driveApi', () => ({
  driveApi: {
    restoreFile: vi.fn(),
    deletePermanently: vi.fn(),
  },
}));

import { DriveTrashView } from './DriveTrashView';
import { driveTrashApi } from '../api/driveTrashApi';
import { driveApi } from '../api/driveApi';
import type { DriveTrashItem } from '../api/driveTrashApi';

const fileItem = (over: Partial<DriveTrashItem> = {}): DriveTrashItem => ({
  id: 'file-1',
  name: 'bao-cao-quy-4.pdf',
  kind: 'file',
  sizeBytes: 2048,
  deletedAt: '2026-11-17T13:34:59Z',
  daysLeft: 30,
  ...over,
});

const folderItem = (over: Partial<DriveTrashItem> = {}): DriveTrashItem => ({
  id: 'folder-1',
  name: 'Ho so nhan su',
  kind: 'folder',
  sizeBytes: 10240,
  deletedAt: '2026-11-16T09:00:00Z',
  daysLeft: 29,
  ...over,
});

describe('DriveTrashView', () => {
  beforeEach(() => {
    vi.mocked(driveTrashApi.getTrash).mockReset();
    vi.mocked(driveTrashApi.restoreFolder).mockReset();
    vi.mocked(driveApi.restoreFile).mockReset();
  });

  it('hiển thị tệp tin đã xoá mềm của ổ cá nhân', async () => {
    vi.mocked(driveTrashApi.getTrash).mockResolvedValue([fileItem()]);

    render(<DriveTrashView driveKind="Personal" driveOwnerId="user-1" />);

    expect(await screen.findByText('bao-cao-quy-4.pdf')).toBeInTheDocument();
    expect(screen.getByText('Tệp tin')).toBeInTheDocument();
    expect(screen.queryByText('Thùng rác trống.')).not.toBeInTheDocument();
  });

  it('hiển thị tệp tin đã xoá mềm của Kho chung phòng ban', async () => {
    vi.mocked(driveTrashApi.getTrash).mockResolvedValue([fileItem()]);

    render(<DriveTrashView driveKind="DepartmentShared" driveOwnerId="dept-9" />);

    expect(await screen.findByText('bao-cao-quy-4.pdf')).toBeInTheDocument();
    expect(driveTrashApi.getTrash).toHaveBeenCalledWith('DepartmentShared', 'dept-9');
  });

  it('hiển thị cả thư mục lẫn tệp trong cùng danh sách', async () => {
    vi.mocked(driveTrashApi.getTrash).mockResolvedValue([folderItem(), fileItem()]);

    render(<DriveTrashView driveKind="Personal" driveOwnerId="user-1" />);

    expect(await screen.findByText('Ho so nhan su')).toBeInTheDocument();
    expect(screen.getByText('bao-cao-quy-4.pdf')).toBeInTheDocument();
    expect(screen.getByText('Thư mục')).toBeInTheDocument();
    expect(screen.getByText('Tệp tin')).toBeInTheDocument();
  });

  it('báo lỗi khi không nạp được thùng rác, không hiện "Thùng rác trống"', async () => {
    vi.mocked(driveTrashApi.getTrash).mockRejectedValue(
      new Error('Hệ thống bảo mật chưa sẵn sàng. Vui lòng thử lại sau.')
    );

    render(<DriveTrashView driveKind="Personal" driveOwnerId="user-1" />);

    expect(
      await screen.findByText('Hệ thống bảo mật chưa sẵn sàng. Vui lòng thử lại sau.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Thùng rác trống.')).not.toBeInTheDocument();
  });

  it('khôi phục tệp tin gọi driveApi.restoreFile', async () => {
    vi.mocked(driveTrashApi.getTrash).mockResolvedValue([fileItem()]);
    vi.mocked(driveApi.restoreFile).mockResolvedValue(undefined);

    render(<DriveTrashView driveKind="Personal" driveOwnerId="user-1" />);
    await screen.findByText('bao-cao-quy-4.pdf');
    await userEvent.click(screen.getByRole('button', { name: /Khôi phục/i }));

    await waitFor(() => expect(driveApi.restoreFile).toHaveBeenCalledWith('file-1'));
    expect(driveTrashApi.restoreFolder).not.toHaveBeenCalled();
  });

  it('khôi phục thư mục gọi driveTrashApi.restoreFolder', async () => {
    vi.mocked(driveTrashApi.getTrash).mockResolvedValue([folderItem()]);
    vi.mocked(driveTrashApi.restoreFolder).mockResolvedValue(undefined);

    render(<DriveTrashView driveKind="Personal" driveOwnerId="user-1" />);
    await screen.findByText('Ho so nhan su');
    await userEvent.click(screen.getByRole('button', { name: /Khôi phục/i }));

    await waitFor(() =>
      expect(driveTrashApi.restoreFolder).toHaveBeenCalledWith('folder-1')
    );
    expect(driveApi.restoreFile).not.toHaveBeenCalled();
  });
});
