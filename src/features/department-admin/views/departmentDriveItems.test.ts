import { describe, it, expect } from 'vitest';
import { mapDriveChildrenToItems } from './departmentDriveItems';

// Hinh dang response cua GET api/drive/children (DriveChildrenDto, camelCase).
const children = (over: Record<string, unknown> = {}) => ({
  folders: [],
  files: [],
  breadcrumb: [],
  ...over,
});

const file = (over: Record<string, unknown> = {}) => ({
  id: 'f1',
  name: 'bao-cao.pdf',
  sizeBytes: 2048,
  originalSizeBytes: 4096,
  folderId: null,
  driveKind: 'Personal',
  driveOwnerId: 'u1',
  createdAt: '2026-11-17T10:00:00Z',
  archiveKind: null,
  scanStatus: 'Clean',
  ...over,
});

const folder = (over: Record<string, unknown> = {}) => ({
  id: 'd1',
  name: 'Ho so',
  parentFolderId: null,
  driveKind: 'Personal',
  driveOwnerId: 'u1',
  createdAt: '2026-11-16T10:00:00Z',
  isPendingHandover: false,
  ...over,
});

describe('mapDriveChildrenToItems', () => {
  it('khong chen node folder gia nao vao danh sach', () => {
    const items = mapDriveChildrenToItems(children({ files: [file()] }));

    expect(items).toHaveLength(1);
    expect(items.map((i) => i.id)).not.toContain('drive-personal');
    expect(items.map((i) => i.id)).not.toContain('drive-shared');
  });

  it('khong sinh ten folder vat ly cua storage', () => {
    const items = mapDriveChildrenToItems(children({ files: [file()], folders: [folder()] }));

    for (const item of items) {
      expect(item.name).not.toMatch(/-shared$/);
      expect(item.name).not.toMatch(/^[A-Za-z0-9]+-[A-Za-z0-9]+-[0-9a-f]{32}$/);
    }
  });

  it('giu parentId dung theo folderId cua backend, khong gan root ao', () => {
    const items = mapDriveChildrenToItems(children({ files: [file({ folderId: null })] }));

    expect(items[0].parentId).toBeNull();
  });

  it('map file voi ten, dung luong goc va trang thai quet', () => {
    const [item] = mapDriveChildrenToItems(children({ files: [file()] }));

    expect(item.type).toBe('file');
    expect(item.name).toBe('bao-cao.pdf');
    expect(item.size).toBe(4096);
    expect(item.scanStatus).toBe('Clean');
  });

  it('suy loai tep tu phan mo rong', () => {
    const items = mapDriveChildrenToItems(
      children({ files: [file({ name: 'bang-luong.xlsx' }), file({ id: 'f2', name: 'anh.png' })] })
    );

    expect(items.find((i) => i.name === 'bang-luong.xlsx')!.fileType).toBe('sheet');
    expect(items.find((i) => i.name === 'anh.png')!.fileType).toBe('image');
  });

  it('map folder va giu co isPendingHandover', () => {
    const items = mapDriveChildrenToItems(
      children({ folders: [folder({ isPendingHandover: true })] })
    );

    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('folder');
    expect(items[0].name).toBe('Ho so');
    expect(items[0].isPendingHandover).toBe(true);
  });

  it('dung nhan chu so huu mac dinh khi file khong co authorName', () => {
    const [item] = mapDriveChildrenToItems(children({ files: [file()] }), {
      ownerFallback: 'Phòng ban',
    });

    expect(item.owner.name).toBe('Phòng ban');
  });

  it('uu tien authorName cua file duoc share vao kho chung', () => {
    const [item] = mapDriveChildrenToItems(
      children({ files: [file({ authorName: 'Nguyen Van A', isSharedLink: true })] }),
      { ownerFallback: 'Phòng ban' }
    );

    expect(item.owner.name).toBe('Nguyen Van A');
    expect(item.isSharedLink).toBe(true);
  });

  it('tra mang rong khi khong co gi', () => {
    expect(mapDriveChildrenToItems(children())).toEqual([]);
  });

  it('chiu duoc response thieu truong folders/files', () => {
    expect(mapDriveChildrenToItems({} as never)).toEqual([]);
  });
});
