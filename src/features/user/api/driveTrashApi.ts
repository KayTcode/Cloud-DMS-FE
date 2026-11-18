import apiClient from '@/api/axiosClient';
import { API_ENDPOINTS } from '@/api/endpoints';

export type DriveKindName = 'Personal' | 'DepartmentShared';

export interface DriveTrashItem {
  id: string;
  name: string;
  kind: 'folder' | 'file';
  sizeBytes: number;
  deletedAt: string;
  daysLeft: number;
  /**
   * Đã bấm xoá vĩnh viễn nhưng cloud chưa xoá xong (backend: Lifecycle=Purging). Tệp vẫn
   * chiếm dung lượng thật trên provider, nên không được coi là đã xoá và không cho khôi phục
   * hay xoá lại.
   */
  cloudDeletePending: boolean;
}

/**
 * Tham số scope ổ đĩa mà backend yêu cầu: `drive=personal|shared` và
 * `departmentId` chỉ dùng cho Kho chung của phòng ban.
 */
const driveParams = (driveKind: DriveKindName, driveOwnerId: string) =>
  driveKind === 'Personal'
    ? { drive: 'personal', departmentId: undefined }
    : { drive: 'shared', departmentId: driveOwnerId };

/** TrashItemKind của backend: enum số (Folder = 0, File = 1), chấp nhận cả dạng chuỗi. */
const toKind = (raw: unknown): 'folder' | 'file' => {
  if (typeof raw === 'string') return raw.toLowerCase() === 'file' ? 'file' : 'folder';
  return raw === 1 ? 'file' : 'folder';
};

const mapItem = (dto: any): DriveTrashItem => ({
  id: dto.id,
  name: dto.name,
  kind: toKind(dto.kind),
  sizeBytes: dto.sizeBytes ?? 0,
  deletedAt: dto.deletedAt,
  daysLeft: dto.daysLeft ?? 0,
  cloudDeletePending: dto.cloudDeletePending === true,
});

export const driveTrashApi = {
  /**
   * GET api/drive/trash — danh sách thùng rác (thư mục + tệp) của một ổ đĩa.
   * Lỗi được ném ra ngoài để tầng UI báo cho người dùng, không trả mảng rỗng
   * khiến thùng rác có dữ liệu trông như đang trống.
   */
  getTrash: async (
    driveKind: DriveKindName,
    driveOwnerId: string
  ): Promise<DriveTrashItem[]> => {
    const res: any = await apiClient.get(API_ENDPOINTS.DRIVE.TRASH, {
      params: driveParams(driveKind, driveOwnerId),
    });
    const data = res?.value ?? res;
    const rows = Array.isArray(data) ? data : [];
    return rows.map(mapItem);
  },

  /** DELETE api/drive/trash — dọn sạch thùng rác của một ổ đĩa. */
  emptyTrash: async (driveKind: DriveKindName, driveOwnerId: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.DRIVE.TRASH, {
      params: driveParams(driveKind, driveOwnerId),
    });
  },

  /** POST api/folders/{id}/restore */
  restoreFolder: async (folderId: string): Promise<void> => {
    await apiClient.post(`/folders/${folderId}/restore`);
  },

  /** DELETE api/folders/{id}/purge — xoá vĩnh viễn; `DELETE /folders/{id}` là xoá mềm. */
  purgeFolder: async (folderId: string): Promise<void> => {
    await apiClient.delete(`/folders/${folderId}/purge`);
  },
};
