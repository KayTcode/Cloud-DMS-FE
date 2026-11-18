import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet, mockPost, mockPut, mockPatch, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockPatch: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@/api/axiosClient', () => ({
  default: {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    patch: mockPatch,
    delete: mockDelete,
  },
}));

import { folderApi } from './folderApi';

// Contract thật của FoldersController (route api/folders):
//   PATCH  {id}/name   body { name }
//   POST   {id}/move   body { targetParentFolderId }
//   DELETE {id}        không body (xoá mềm, đưa vào thùng rác)
describe('folderApi.renameFolder', () => {
  beforeEach(() => {
    mockPut.mockReset();
    mockPatch.mockReset();
    mockPost.mockReset();
    mockDelete.mockReset();
  });

  it('gọi PATCH /folders/{id}/name với body { name }', async () => {
    mockPatch.mockResolvedValue({ value: { id: 'f1', name: 'Ten moi' } });

    await folderApi.renameFolder('f1', { name: 'Ten moi' });

    expect(mockPatch).toHaveBeenCalledWith('/folders/f1/name', { name: 'Ten moi' });
  });

  it('không dùng PUT (backend không có PUT /folders/{id}/rename)', async () => {
    mockPatch.mockResolvedValue({ value: {} });

    await folderApi.renameFolder('f1', { name: 'Ten moi' });

    expect(mockPut).not.toHaveBeenCalled();
  });

  it('bóc vỏ Result và trả về FolderDto', async () => {
    mockPatch.mockResolvedValue({ value: { id: 'f1', name: 'Ten moi' } });

    const folder = await folderApi.renameFolder('f1', { name: 'Ten moi' });

    expect(folder).toEqual({ id: 'f1', name: 'Ten moi' });
  });
});

describe('folderApi.moveFolder', () => {
  beforeEach(() => {
    mockPut.mockReset();
    mockPatch.mockReset();
    mockPost.mockReset();
    mockDelete.mockReset();
  });

  it('gọi POST /folders/{id}/move với body { targetParentFolderId }', async () => {
    mockPost.mockResolvedValue({ value: { id: 'f1' } });

    await folderApi.moveFolder('f1', { targetParentFolderId: 'parent-2' });

    expect(mockPost).toHaveBeenCalledWith('/folders/f1/move', {
      targetParentFolderId: 'parent-2',
    });
  });

  it('gửi targetParentFolderId = null khi chuyển về gốc ổ đĩa', async () => {
    mockPost.mockResolvedValue({ value: { id: 'f1' } });

    await folderApi.moveFolder('f1', { targetParentFolderId: null });

    expect(mockPost).toHaveBeenCalledWith('/folders/f1/move', {
      targetParentFolderId: null,
    });
  });

  it('không dùng PUT (backend không có PUT /folders/{id}/move)', async () => {
    mockPost.mockResolvedValue({ value: {} });

    await folderApi.moveFolder('f1', { targetParentFolderId: null });

    expect(mockPut).not.toHaveBeenCalled();
  });
});

describe('folderApi.trashFolder', () => {
  beforeEach(() => {
    mockPut.mockReset();
    mockPatch.mockReset();
    mockPost.mockReset();
    mockDelete.mockReset();
  });

  it('gọi DELETE /folders/{id}', async () => {
    mockDelete.mockResolvedValue(undefined);

    await folderApi.trashFolder('f1');

    expect(mockDelete).toHaveBeenCalledWith('/folders/f1');
  });

  it('không dùng PUT (backend không có PUT /folders/{id})', async () => {
    mockDelete.mockResolvedValue(undefined);

    await folderApi.trashFolder('f1');

    expect(mockPut).not.toHaveBeenCalled();
  });

});
