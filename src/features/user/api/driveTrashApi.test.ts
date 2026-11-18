import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet, mockPost, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@/api/axiosClient', () => ({
  default: { get: mockGet, post: mockPost, delete: mockDelete },
}));

import { driveTrashApi } from './driveTrashApi';

// Backend: GET api/drive/trash trả Result<IReadOnlyList<TrashItemDto>>.
// TrashItemKind là enum tuần tự hoá thành số (Folder = 0, File = 1) vì
// AddControllers() không đăng ký JsonStringEnumConverter.
const dto = (over: Record<string, unknown> = {}) => ({
  id: '11111111-1111-1111-1111-111111111111',
  name: 'bao-cao.pdf',
  kind: 1,
  sizeBytes: 2048,
  deletedAt: '2026-11-17T13:34:59Z',
  daysLeft: 30,
  ...over,
});

describe('driveTrashApi.getTrash', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockDelete.mockReset();
  });

  it('gọi GET /drive/trash với drive=personal cho ổ cá nhân', async () => {
    mockGet.mockResolvedValue({ value: [] });

    await driveTrashApi.getTrash('Personal', 'user-1');

    expect(mockGet).toHaveBeenCalledWith('/drive/trash', {
      params: { drive: 'personal', departmentId: undefined },
    });
  });

  it('gọi GET /drive/trash với drive=shared kèm departmentId cho Kho chung', async () => {
    mockGet.mockResolvedValue({ value: [] });

    await driveTrashApi.getTrash('DepartmentShared', 'dept-9');

    expect(mockGet).toHaveBeenCalledWith('/drive/trash', {
      params: { drive: 'shared', departmentId: 'dept-9' },
    });
  });

  it('map kind=1 thành mục tệp tin', async () => {
    mockGet.mockResolvedValue({ value: [dto({ kind: 1 })] });

    const items = await driveTrashApi.getTrash('Personal', 'user-1');

    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('file');
  });

  it('map kind=0 thành mục thư mục', async () => {
    mockGet.mockResolvedValue({ value: [dto({ kind: 0, name: 'Tai lieu' })] });

    const items = await driveTrashApi.getTrash('Personal', 'user-1');

    expect(items[0].kind).toBe('folder');
  });

  it('map được cả dạng enum chuỗi nếu backend bật JsonStringEnumConverter', async () => {
    mockGet.mockResolvedValue({ value: [dto({ kind: 'File' })] });

    const items = await driveTrashApi.getTrash('Personal', 'user-1');

    expect(items[0].kind).toBe('file');
  });

  it('giữ nguyên name, deletedAt, daysLeft và sizeBytes', async () => {
    mockGet.mockResolvedValue({ value: [dto()] });

    const [item] = await driveTrashApi.getTrash('Personal', 'user-1');

    expect(item.id).toBe('11111111-1111-1111-1111-111111111111');
    expect(item.name).toBe('bao-cao.pdf');
    expect(item.deletedAt).toBe('2026-11-17T13:34:59Z');
    expect(item.daysLeft).toBe(30);
    expect(item.sizeBytes).toBe(2048);
  });

  it('đọc được payload mảng trần (không bọc Result)', async () => {
    mockGet.mockResolvedValue([dto()]);

    const items = await driveTrashApi.getTrash('Personal', 'user-1');

    expect(items).toHaveLength(1);
  });

  // Lifecycle=Purging: đã bấm xoá vĩnh viễn nhưng cloud chưa xoá xong. Tệp vẫn chiếm dung
  // lượng thật, nên thùng rác phải hiện và phải phân biệt được trạng thái này.
  it('map cloudDeletePending=true khi cloud chưa xoá xong', async () => {
    mockGet.mockResolvedValue({ value: [dto({ cloudDeletePending: true })] });

    const [item] = await driveTrashApi.getTrash('Personal', 'user-1');

    expect(item.cloudDeletePending).toBe(true);
  });

  it('cloudDeletePending mặc định false khi backend không trả về', async () => {
    mockGet.mockResolvedValue({ value: [dto()] });

    const [item] = await driveTrashApi.getTrash('Personal', 'user-1');

    expect(item.cloudDeletePending).toBe(false);
  });

  it('ném lỗi ra ngoài thay vì trả mảng rỗng khi request thất bại', async () => {
    mockGet.mockRejectedValue(new Error('Lỗi kết nối máy chủ'));

    await expect(driveTrashApi.getTrash('Personal', 'user-1')).rejects.toThrow(
      'Lỗi kết nối máy chủ'
    );
  });
});

describe('driveTrashApi hành động trên mục trong thùng rác', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockDelete.mockReset();
  });

  it('emptyTrash gọi DELETE /drive/trash với drive=personal', async () => {
    mockDelete.mockResolvedValue(undefined);

    await driveTrashApi.emptyTrash('Personal', 'user-1');

    expect(mockDelete).toHaveBeenCalledWith('/drive/trash', {
      params: { drive: 'personal', departmentId: undefined },
    });
  });

  it('emptyTrash gọi DELETE /drive/trash với drive=shared kèm departmentId', async () => {
    mockDelete.mockResolvedValue(undefined);

    await driveTrashApi.emptyTrash('DepartmentShared', 'dept-9');

    expect(mockDelete).toHaveBeenCalledWith('/drive/trash', {
      params: { drive: 'shared', departmentId: 'dept-9' },
    });
  });

  it('restoreFolder gọi POST /folders/{id}/restore', async () => {
    mockPost.mockResolvedValue(undefined);

    await driveTrashApi.restoreFolder('folder-1');

    expect(mockPost).toHaveBeenCalledWith('/folders/folder-1/restore');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('purgeFolder gọi DELETE /folders/{id}/purge, không phải DELETE /folders/{id}', async () => {
    mockDelete.mockResolvedValue(undefined);

    await driveTrashApi.purgeFolder('folder-1');

    expect(mockDelete).toHaveBeenCalledWith('/folders/folder-1/purge');
  });
});
