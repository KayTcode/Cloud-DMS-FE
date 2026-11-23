import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SharedFileItem } from '@/features/user/types';

vi.mock('@/features/user/api/driveApi', () => ({ driveApi: {
  getSharedFiles: vi.fn(), getSharedChildren: vi.fn(), downloadFile: vi.fn(),
  getArchiveTree: vi.fn(), downloadArchiveMember: vi.fn(),
} }));
vi.mock('@/features/document-submission', () => ({ DocumentDetailsModal: () => null }));

import { driveApi } from '@/features/user/api/driveApi';
import { DepartmentSharedFilesView } from './DepartmentSharedFilesView';

const shared = (overrides: Partial<SharedFileItem> = {}): SharedFileItem => ({
  id: 'file', name: 'report.txt', type: 'file', fileType: 'docx', extension: 'txt',
  size: 4, sizeFormatted: '4 B', ownerId: 'colleague',
  owner: { name: 'Colleague', email: 'colleague@example.test' },
  sharedAt: '2026-11-23T00:00:00Z', sharedAtFormatted: '23/11/2026',
  createdAt: '2026-11-23T00:00:00Z', permissionLevel: 'Viewer',
  canRead: true, canWrite: false, canDelete: false, scanStatus: 'Clean', ...overrides,
});
const list = (items: SharedFileItem[] = []) => ({
  items, totalCount: items.length, pageNumber: 1, pageSize: 20, hasMore: false,
});

describe('Department Manager shared files and folders', () => {
  const toast = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(driveApi.getSharedFiles).mockResolvedValue(list());
    vi.mocked(driveApi.getSharedChildren).mockResolvedValue({ folders: [], totalFolders: 0, files: list() });
    vi.mocked(driveApi.downloadFile).mockResolvedValue(undefined);
    vi.mocked(driveApi.getArchiveTree).mockResolvedValue([]);
  });

  it('loads received shares and downloads an ordinary file through the existing API', async () => {
    vi.mocked(driveApi.getSharedFiles).mockResolvedValue(list([shared()]));
    render(<DepartmentSharedFilesView onShowToast={toast} />);
    fireEvent.click(await screen.findByText('report.txt'));
    await waitFor(() => expect(driveApi.downloadFile).toHaveBeenCalledWith('file', 'report.txt', undefined));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.any(String), 'success'));
    expect(driveApi.getArchiveTree).not.toHaveBeenCalled();
  });

  it('browses a received folder and downloads its child without changing drive scope', async () => {
    vi.mocked(driveApi.getSharedChildren)
      .mockResolvedValueOnce({ folders: [{ id: 'folder', name: 'Handover', parentId: null }], totalFolders: 1, files: list() })
      .mockResolvedValue({ folders: [], totalFolders: 0, files: list([shared()]) });
    render(<DepartmentSharedFilesView onShowToast={toast} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Handover' }));
    expect(await screen.findByText('report.txt')).toBeInTheDocument();
    expect(driveApi.getSharedChildren).toHaveBeenLastCalledWith('folder', 1, 20);
    fireEvent.click(screen.getByRole('button', { name: 'Tải xuống report.txt' }));
    await waitFor(() => expect(driveApi.downloadFile).toHaveBeenCalledWith('file', 'report.txt', undefined));
  });

  it.each(['folder', 'batch'] as const)('opens a %s archive tree and supports package/member downloads', async archiveKind => {
    vi.mocked(driveApi.getSharedFiles).mockResolvedValue(list([shared({ archiveKind, name: 'Project', id: 'package' })]));
    vi.mocked(driveApi.getArchiveTree).mockResolvedValue([
      { id: 'member', path: 'note.txt', parentPath: '', name: 'note.txt', isDirectory: false, sizeBytes: 4 },
    ]);
    render(<DepartmentSharedFilesView onShowToast={toast} />);
    fireEvent.click(await screen.findByText('Project'));
    expect(await screen.findByText('note.txt')).toBeInTheDocument();
    expect(driveApi.downloadFile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tải note.txt' }));
    await waitFor(() => expect(driveApi.downloadArchiveMember).toHaveBeenCalledWith('package', 'member', 'note.txt'));
    fireEvent.click(screen.getByText('Tải thư mục về máy'));
    await waitFor(() => expect(driveApi.downloadFile).toHaveBeenCalledWith('package', 'Project', archiveKind));
  });

  it('reports download denial without claiming success', async () => {
    vi.mocked(driveApi.getSharedFiles).mockResolvedValue(list([shared()]));
    vi.mocked(driveApi.downloadFile).mockRejectedValue(new Error('Access revoked'));
    render(<DepartmentSharedFilesView onShowToast={toast} />);
    fireEvent.click(await screen.findByText('report.txt'));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Access revoked', 'error'));
    expect(toast).not.toHaveBeenCalledWith(expect.any(String), 'success');
  });

  it('displays the existing empty received-files state', async () => {
    render(<DepartmentSharedFilesView onShowToast={toast} />);
    expect(await screen.findByText('Chưa có tài liệu nào được chia sẻ với bạn')).toBeInTheDocument();
    expect(driveApi.downloadFile).not.toHaveBeenCalled();
  });
});
