# Frontend: Quota đa tài khoản lưu trữ + Cây folder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giao diện cho:
- SystemAdmin cấp và giảm quota Tenant theo từng tài khoản lưu trữ.
- DepartmentAdmin cấp quota cho Kho chung và quản lý Kho chung.
- Employee và DepartmentAdmin dùng Drive cá nhân có cây folder đầy đủ thao tác và thùng rác 30 ngày.

**Architecture:**
- Lớp API mới `src/features/drive/` (API + types + component dùng chung) phục vụ cả Drive cá nhân lẫn Kho chung.
- Component `FolderDriveView` nhận `drive: 'personal' | 'shared'`, được nhúng vào `DriveView` (user) và `DepartmentFilesView` (department-admin).
- Phần quota sửa tại các modal/view hiện có.

**Tech Stack:** React 19, Vite 8, TypeScript 5.7, Tailwind 4, axios (`@/api/axiosClient`), lucide-react.

**Spec:** `../Cloud-DMS/docs/superpowers/specs/2026-10-28-multi-provider-folder-tree-design.md`

**Hợp đồng API:** bảng "Hợp đồng API" và các DTO trong `../Cloud-DMS/docs/superpowers/plans/2026-10-28-multi-provider-folder-tree-backend.md`. Plan này phụ thuộc plan backend; làm sau khi backend xong Task 10.

## Global Constraints

- Không thêm npm package mới.
- Chữ trên giao diện bằng tiếng Việt.
- User và DepartmentAdmin **không** thấy tên hay loại provider ở bất kỳ màn hình Drive nào (spec 7.6). Chỉ SystemAdmin thấy.
- Trùng tên folder, tên không hợp lệ và hết dung lượng: hiển thị đúng thông báo lỗi backend trả về, không tự đặt lại câu chữ.
- Repo chưa có test framework. Mỗi task kiểm chứng bằng:
  - `npm run lint` (là `tsc --noEmit`) → 0 lỗi
  - `npm run build` → thành công
  - chạy thử theo kịch bản ghi trong task, với backend chạy local
- Commit: theo quy định commit của repo backend (`AGENTS.md` §3), executor hỏi chủ dự án một lần trước Task 1. Làm trên branch `feature/multi-provider-folder-tree`, tách từ `fix/request-quota`. Lưu ý: `DecideQuotaModal.tsx` đang có thay đổi chưa commit, **không ghi đè**.
- Định dạng dung lượng dùng `formatBytes` hiện có trong `src/features/user/api/driveApi.ts`.

## Review Focus

1. Nhấn "Tạo" hai lần liên tiếp trong `NewFolderModal`: chỉ một request được gửi. Nút bị vô hiệu hoá khi đang gửi (Task 4).
2. Thùng rác rỗng, Drive rỗng, Kho chung chưa có quota: hiện trạng thái trống có hướng dẫn, không hiện lỗi (Task 4, 5, 6).
3. Drive đang bị khoá upload: nút "Tải lên" bị vô hiệu hoá **và** có banner. Thả file kéo-thả cũng bị chặn (Task 4).
4. Mở hộp "Di chuyển" cho một folder: không cho chọn chính folder đó hoặc folder con của nó (Task 4).
5. Backend trả lỗi giữa chừng khi di chuyển (provider lỗi): danh sách không bị thay đổi trên giao diện, hiện thông báo lỗi (Task 4).

---

### Task 1: Lớp API và kiểu dữ liệu

**Files:**
- Create: `src/features/drive/types/driveTree.types.ts`
- Create: `src/features/drive/api/driveTreeApi.ts`
- Create: `src/features/drive/index.ts`
- Modify: `src/features/system-admin/api/systemAdminCommands.ts:241-249` (thay `allocateTenantStorageQuotaApi`), `systemAdminQueries.ts` (query quota Tenant), `src/features/system-admin/types/systemAdmin.dto.ts`
- Modify: `src/features/quota/api/quotaApi.ts` (decide thêm `storageProviderId?`)
- Modify: `src/features/department-admin/api/departmentApi.ts` (shared quota)
- Modify: `src/features/user/api/driveApi.ts` (`uploadFiles` thêm `drive`/`departmentId`, xoá `createFolder`), `src/services/upload/CloudDirectUploader.ts` (truyền `drive`, `departmentId` khi tạo upload-session), `src/features/user/types` (`PersonalStorageQuotaDto.isUploadLocked`)

**Interfaces:**
- Produces:
```ts
export type DriveScope = 'personal' | 'shared';
export interface DriveRefParams { drive: DriveScope; departmentId?: string }
export interface FolderDto { id: string; name: string; parentFolderId: string | null; drive: 0 | 1; /* 0 = Personal, 1 = DepartmentShared */ driveOwnerId: string; createdAt: string; updatedAt?: string | null }
export interface DriveFileDto { id: string; name: string; contentType: string; sizeBytes: number; folderId: string | null; ownerName: string; createdAt: string; updatedAt?: string | null }
export interface BreadcrumbItemDto { id: string; name: string }
export interface DriveChildrenDto { breadcrumb: BreadcrumbItemDto[]; folders: FolderDto[]; files: DriveFileDto[] }
export interface TrashItemDto { id: string; name: string; isFolder: boolean; sizeBytes: number; deletedAt: string; daysLeft: number }

export const driveTreeApi: {
  getChildren(p: DriveRefParams & { folderId?: string | null }): Promise<DriveChildrenDto>;
  createFolder(p: DriveRefParams & { name: string; parentId?: string | null }): Promise<FolderDto>;
  renameFolder(id: string, name: string): Promise<FolderDto>;
  moveFolder(id: string, targetParentId: string | null): Promise<FolderDto>;
  trashFolder(id: string): Promise<void>;
  restoreFolder(id: string): Promise<FolderDto>;
  purgeFolder(id: string): Promise<void>;
  renameFile(id: string, name: string): Promise<DriveFileDto>;
  moveFile(id: string, targetFolderId: string | null): Promise<DriveFileDto>;
  getTrash(p: DriveRefParams): Promise<TrashItemDto[]>;
  emptyTrash(p: DriveRefParams): Promise<void>;
};
// Xoá/khôi phục/xoá vĩnh viễn file: dùng lại driveApi.moveToTrash/restoreFile/deletePermanently hiện có.

// system-admin
export interface TenantQuotaAllocationDto { allocationId: string; storageProviderId: string; storageProviderName: string; storageProviderType: number; grantedBytes: number; allocatedToChildrenBytes: number; usedBytes: number; createdAt: string }
export const grantTenantQuotaApi: (tenantId: string, payload: { storageProviderId: string; bytes: number }) => Promise<TenantStorageQuotaResponse>;
export const reduceTenantQuotaApi: (tenantId: string, payload: { bytes: number }) => Promise<TenantStorageQuotaResponse>;
// TenantStorageQuotaResponse (kiểu FE hiện có trong systemAdmin.dto.ts): thêm allocations: TenantQuotaAllocationDto[]; bỏ storageProviderId/Name/Type.

// department-admin
export interface DepartmentSharedQuotaDto { departmentId: string; quotaBytes: number; usedBytes: number; isUploadLocked: boolean }
getSharedQuota(departmentId: string): Promise<DepartmentSharedQuotaDto>;
setSharedQuota(departmentId: string, quotaBytes: number): Promise<DepartmentSharedQuotaDto>;
```
- Response unwrap theo mẫu hiện có: `res?.value ?? res?.data ?? res`.
- Enum `drive` gửi lên backend dạng chuỗi `personal`/`shared`.

- [ ] **Step 1:** Viết types và API như trên. Xoá `allocateTenantStorageQuotaApi` và `driveApi.createFolder`.
- [ ] **Step 2:** `npm run lint`. Kỳ vọng: **có lỗi** ở những nơi đang gọi hai hàm vừa xoá (`AllocateQuotaModal`, `CreateTenantModal` nếu có dùng, `DriveView`/`NewFolderModal`). Ghi lại danh sách file lỗi; các task sau sửa chúng.
- [ ] **Step 3:** Tạm thời chưa sửa nơi gọi. Task này kết thúc khi `src/features/drive/**` và các file API không có lỗi riêng. Kiểm tra: `npm run lint 2>&1 | grep "features/drive\|api/"` → rỗng.
- [ ] **Step 4: Commit** `feat(drive): lop API cay folder va quota da tai khoan`

---

### Task 2: SystemAdmin: cấp/giảm quota Tenant theo tài khoản lưu trữ

**Files:**
- Modify: `src/features/system-admin/components/AllocateQuotaModal.tsx`
- Modify: `src/features/system-admin/components/TenantDetailsModal.tsx` (phần hiển thị quota/provider)
- Modify: `src/features/system-admin/views/TenantManagementView.tsx` (chỉ ở những chỗ đọc `storageProviderName` của tenant, nếu có)
- Kiểm tra: `src/features/system-admin/components/CreateTenantModal.tsx` vẫn gửi `storageProviderId` + `storageQuotaBytes` như cũ (backend không đổi hợp đồng tạo user)

**Interfaces:**
- Consumes: `grantTenantQuotaApi`, `reduceTenantQuotaApi`, `TenantQuotaAllocationDto` (Task 1); danh sách tài khoản lưu trữ từ query hiện có (`StorageProvidersView` đang dùng) kèm `available-quota`.

Giao diện `AllocateQuotaModal`:
- **Bảng phần quota:** các cột Tài khoản (tên + loại), Đã cấp, Đã chia cho phòng ban, Đã dùng. Sắp theo `createdAt` tăng dần, kèm chú thích "Phần cấp trước được dùng trước".
- **Hai tab:**
  - "Cấp thêm": chọn tài khoản (chỉ tài khoản đang hoạt động, hiện dung lượng còn cấp được từ `GET api/admin/storage-providers/{id}/available-quota`) + nhập GB → `grantTenantQuotaApi`.
  - "Giảm": nhập GB → `reduceTenantQuotaApi`. Cảnh báo: "Giảm sẽ bớt từ phần cấp sau cùng trước. Nếu giảm dưới mức đã dùng, tổ chức sẽ bị khoá tải lên."
- Thành công: làm mới bảng và báo lên component cha như hiện nay. Lỗi: hiện message từ backend.
- `TenantDetailsModal`: thay dòng "Nhà cung cấp: X" bằng danh sách gọn các phần (tên tài khoản – đã cấp).

- [ ] **Step 1:** Sửa các component như trên.
- [ ] **Step 2:** `npm run lint` → không còn lỗi trong `features/system-admin`.
- [ ] **Step 3: Chạy thử** (`npm run dev`, backend chạy local, đăng nhập SystemAdmin):
  1. Cấp 1GB từ tài khoản Google cho Tenant mẫu.
  2. Cấp tiếp 2GB từ OneDrive. Bảng hiện 2 dòng, Google ở trên.
  3. Cấp thêm 1GB Google. Vẫn 2 dòng, Google = 2GB.
  4. Giảm 1.5GB. OneDrive còn 0.5GB.
  5. Cấp vượt dung lượng còn lại. Hiện lỗi backend.
- [ ] **Step 4: Commit** `feat(system-admin): cap/giam quota Tenant theo tai khoan luu tru`

---

### Task 3: Màn hình duyệt yêu cầu quota cho SystemAdmin + chọn tài khoản khi duyệt

`DecideQuotaModal` hiện chỉ được gắn trong `department-admin/views/DepartmentQuotaView.tsx` và `tenants/views/TenantQuotaView.tsx`. Portal SystemAdmin chưa có chỗ nào để xem và duyệt yêu cầu, nên task này phải tạo màn hình đó.

**Files:**
- Create: `src/features/system-admin/views/QuotaRequestsView.tsx`: dùng `PendingQuotaTable` + `DecideQuotaModal` (từ `@/features/quota`), lấy dữ liệu từ `GET api/quota/requests/pending-for-me` qua `quotaApi` sẵn có. Học cách gắn từ `tenants/views/TenantQuotaView.tsx`.
- Modify: `src/features/system-admin/views/index.ts`, `src/features/system-admin/SystemAdminPortal.tsx` (thêm mục điều hướng "Yêu cầu quota")
- Modify: `src/features/quota/components/DecideQuotaModal.tsx` (file đang có thay đổi chưa commit: đọc kỹ và giữ nguyên các thay đổi đó)
- Modify: `src/features/quota/types/quota.types.ts` (nếu request DTO khai báo ở đây)

**Interfaces:**
- Consumes: decide API có `storageProviderId?` (Task 1).

Hành vi: khi người duyệt là SystemAdmin **và** requester là TenantAdmin (dựa trên thông tin vai trò/requester đã có trong `QuotaRequestDto`; nếu DTO chưa có trường vai trò thì dùng việc người đang đăng nhập là SystemAdmin, vì chỉ TenantAdmin gửi yêu cầu lên SystemAdmin):
- Hiện ô chọn tài khoản lưu trữ, bắt buộc chọn trước khi bấm "Duyệt".
- Các trường hợp khác không hiện ô này.

- [ ] **Step 1:** Sửa modal.
- [ ] **Step 2:** `npm run lint` → không lỗi trong `features/quota`.
- [ ] **Step 3: Chạy thử:**
  1. Bật feature quota request cho Tenant.
  2. TenantAdmin gửi yêu cầu 1GB.
  3. SystemAdmin mở "Yêu cầu quota", thấy yêu cầu. Duyệt mà không chọn tài khoản: nút bị vô hiệu hoá.
  4. Chọn OneDrive rồi duyệt. Trong `AllocateQuotaModal`, phần OneDrive tăng 1GB.
- [ ] **Step 4: Commit** `feat(quota): chon tai khoan luu tru khi duyet yeu cau cua TenantAdmin`

---

### Task 4: `FolderDriveView`: cây folder dùng chung, gắn vào Drive cá nhân

**Files:**
- Create: `src/features/drive/components/FolderDriveView.tsx`
- Create: `src/features/drive/components/DriveBreadcrumb.tsx`, `RenameDialog.tsx`, `MoveDialog.tsx`, `UploadLockedBanner.tsx`
- Modify: `src/features/user/components/NewFolderModal.tsx` (nhận `onSubmit(name): Promise<void>`, vô hiệu hoá nút khi đang gửi)
- Modify: `src/features/user/UserPortal.tsx`: file này đang giữ state folder, thùng rác, quota và gọi `driveApi.createFolder` (dòng 289), `getTrashFiles` (dòng 113), `getMyQuota` (dòng 126). Bỏ state folder/danh sách file của "Drive của tôi" khỏi đây. Giữ state quota (truyền `isUploadLocked` xuống) và state của tab chia sẻ.
- Modify: `src/features/user/views/DriveView.tsx` (phần "Drive của tôi" dùng `FolderDriveView drive="personal"`. Giữ nguyên tab chia sẻ, xem trước, chia sẻ file)

`FolderDriveView` **tự tải dữ liệu** (không nhận danh sách từ cha), để portal DepartmentAdmin gắn thẳng nó vào mà không cần dựng lại state của `UserPortal`.

**Interfaces:**
- Consumes: `driveTreeApi`, types (Task 1); `driveApi.uploadFiles` / `uploadDirectFiles` (thêm `drive`, `departmentId`); `driveApi.moveToTrash` cho file; `userApi.getMyQuota().isUploadLocked`.
- Produces:
```ts
export interface FolderDriveViewProps {
  drive: DriveScope;
  departmentId?: string;          // bắt buộc khi drive = 'shared'
  isUploadLocked: boolean;
  onQuotaChanged?: () => void;    // gọi sau upload/xoá để cha làm mới số liệu quota
  onOpenFile?: (file: DriveFileDto) => void; // mở preview hiện có
  onShareFile?: (file: DriveFileDto) => void; // mở ShareModal hiện có; không truyền thì ẩn mục "Chia sẻ"
}
export function FolderDriveView(props: FolderDriveViewProps): JSX.Element;
export interface MoveDialogProps { drive: DriveScope; departmentId?: string; movingFolderId?: string; onConfirm(targetFolderId: string | null): Promise<void>; onClose(): void }
```

Hành vi:
- **Trạng thái:** `currentFolderId` (null = gốc). Tải bằng `getChildren`. Breadcrumb "Drive của tôi" (hoặc "Kho chung") › … › folder hiện tại, bấm được.
- **Danh sách:** folder trước, file sau. Double-click folder để mở. Menu từng mục: Đổi tên, Di chuyển, Xoá. File có thêm Tải xuống, Xem trước và **Chia sẻ** (`onShareFile`, giữ luồng chia sẻ file hiện có theo spec §4), dùng component sẵn có. Drive cá nhân truyền `onShareFile`; Kho chung không truyền, vì chia sẻ từ Kho chung làm sau.
- **Thao tác:**
  - Tạo folder → `createFolder({ ...driveRef, name, parentId: currentFolderId })`.
  - Upload → truyền `folderId = currentFolderId`, `drive`, `departmentId`.
- **Khoá upload:** nếu `isUploadLocked`, hiện `UploadLockedBanner` ("Đã vượt hạn mức lưu trữ, không thể tải lên. Hãy xoá bớt tệp hoặc xin cấp thêm dung lượng."), vô hiệu hoá nút Tải lên và chặn kéo-thả.
- **`MoveDialog`:** duyệt cây bằng `getChildren`, bắt đầu từ gốc. Ẩn `movingFolderId` và mọi folder con của nó (không mở được vào nhánh đó). Có lựa chọn "Gốc Drive".
- **Sau mỗi thao tác thành công:** tải lại danh sách. Lỗi thì hiện message từ backend, danh sách giữ nguyên (không cập nhật lạc quan).
- **Trạng thái trống:** "Thư mục trống. Tạo thư mục mới hoặc tải tệp lên."
- Không hiện tên provider ở đâu cả.

- [ ] **Step 1:** Viết các component, rồi nối `DriveView`.
- [ ] **Step 2:** `npm run lint` → không lỗi trong `features/drive` và `features/user`.
- [ ] **Step 3: Chạy thử** (đăng nhập Employee có quota):
  1. Tạo folder "Báo cáo", vào trong, tạo "2026".
  2. Upload 1 file vào "2026".
  3. Đổi tên "2026" thành "Năm 2026".
  4. Mở "Di chuyển" cho "Báo cáo": không thấy chính nó và "Năm 2026".
  5. Di chuyển file về gốc.
  6. Tạo trùng tên "Báo cáo": hiện lỗi backend.
  7. Bấm "Tạo" hai lần nhanh: chỉ một folder được tạo.
  8. Hạ quota của user xuống dưới mức đã dùng: banner hiện, nút Tải lên bị vô hiệu hoá.
- [ ] **Step 4: Commit** `feat(drive): cay folder cho Drive ca nhan`

---

### Task 5: Thùng rác theo Drive

**Files:**
- Create: `src/features/drive/components/DriveTrashView.tsx`
- Modify: `src/features/user/views/DriveView.tsx` (tab/mục "Thùng rác" hiện có chuyển sang `DriveTrashView drive="personal"`)
- Modify: `src/features/user/UserPortal.tsx` (bỏ state/lời gọi `getTrashFiles` dòng 113)

**Interfaces:**
- Consumes: `driveTreeApi.getTrash/restoreFolder/purgeFolder/emptyTrash`; `driveApi.restoreFile/deletePermanently` cho file (Task 1).
- Produces: `export function DriveTrashView(props: { drive: DriveScope; departmentId?: string; onQuotaChanged?: () => void }): JSX.Element`

Hành vi:
- **Danh sách:** các cột Tên (icon folder/file), Kích thước, Ngày xoá, "Còn {daysLeft} ngày". Mục có `daysLeft <= 3` tô cảnh báo.
- **Khôi phục:** folder → `restoreFolder`, file → `restoreFile`.
- **Xoá vĩnh viễn:** folder → `purgeFolder`, file → `deletePermanently`. Có hộp xác nhận "Không thể hoàn tác".
- **"Dọn sạch thùng rác":** xác nhận rồi gọi `emptyTrash`. Sau khi xoá vĩnh viễn hoặc dọn sạch, gọi `onQuotaChanged`.
- **Ghi chú đầu trang:** "Mục trong thùng rác vẫn tính vào dung lượng và sẽ tự xoá vĩnh viễn sau 30 ngày."
- **Trống:** "Thùng rác trống."

- [ ] **Step 1:** Viết component và nối vào `DriveView`.
- [ ] **Step 2:** `npm run lint` → không lỗi.
- [ ] **Step 3: Chạy thử:**
  1. Xoá folder "Báo cáo". Thùng rác chỉ hiện "Báo cáo", không hiện các mục con. "Còn 30 ngày".
  2. Khôi phục. Folder về đúng chỗ, mục con đầy đủ.
  3. Xoá rồi xoá vĩnh viễn. Dung lượng đã dùng giảm.
  4. Dọn sạch thùng rác rỗng: hiện trạng thái trống, không lỗi.
- [ ] **Step 4: Commit** `feat(drive): thung rac theo Drive`

---

### Task 6: DepartmentAdmin: quota Kho chung, màn hình Kho chung, Drive cá nhân

**Files:**
- Modify: `src/features/department-admin/views/DepartmentQuotaView.tsx` (hoặc `StaffManagementView.tsx`, nơi đang có bảng cấp quota nhân viên dùng `EditQuotaModal`): thêm dòng "Kho chung phòng"
- Modify: `src/features/department-admin/components/EditQuotaModal.tsx` (cho phép mục tiêu là Kho chung)
- Modify: `src/features/department-admin/views/DepartmentFilesView.tsx` (thay nội dung bằng `FolderDriveView drive="shared"` + `DriveTrashView drive="shared"`)
- Modify: `src/features/department-admin/DepartmentAdminPortal.tsx`:
  - Thêm mục điều hướng "Drive của tôi" gắn thẳng `FolderDriveView drive="personal"` + `DriveTrashView drive="personal"`, **không** dùng lại `DriveView`/`UserPortal` vì state nằm ở đó.
  - Đổi nhãn mục file phòng thành "Kho chung".
- Modify: `src/features/department-admin/views/DepartmentStorageReportView.tsx` (và `DepartmentFilesView.tsx` cũ): bỏ nhãn provider và giá trị dự phòng "Google Drive Primary", vì DepartmentAdmin không được thấy tên provider.

**Interfaces:**
- Consumes: `getSharedQuota`, `setSharedQuota` (Task 1); `FolderDriveView` (Task 4); `DriveTrashView` (Task 5).

Hành vi:
- Dòng "Kho chung phòng" trong bảng quota hiện Đã cấp và Đã dùng, có nút Chỉnh sửa → `setSharedQuota`. Thông báo lỗi lấy từ backend (ví dụ phòng không đủ hạn mức).
- **Màn hình Kho chung:**
  - `isUploadLocked` lấy từ `getSharedQuota`.
  - Chưa có quota (`quotaBytes = 0`): hiện "Kho chung chưa được cấp dung lượng. Hãy cấp quota cho Kho chung ở mục Hạn mức." Vẫn cho tạo folder.
- **Drive của tôi** của DepartmentAdmin: dùng chung với Employee. `isUploadLocked` lấy từ `userApi.getMyQuota()`.
- Không còn chỗ nào trong portal DepartmentAdmin liệt kê file cá nhân của nhân viên.

- [ ] **Step 1:** Sửa như trên.
- [ ] **Step 2:** `npm run lint` → 0 lỗi trên **toàn repo**, rồi `npm run build` → thành công.
- [ ] **Step 3: Chạy thử** (đăng nhập DepartmentAdmin):
  1. Cấp 2GB cho Kho chung. Dòng Kho chung cập nhật.
  2. Vào Kho chung, tạo folder, upload file, xoá và khôi phục.
  3. Vào "Drive của tôi": không thấy file của Kho chung.
  4. Đăng nhập Employee cùng phòng: không có mục Kho chung, không thấy file của Trưởng phòng.
  5. Đăng nhập TenantAdmin: không có màn hình liệt kê file nào.
- [ ] **Step 4: Commit** `feat(department-admin): quota va man hinh Kho chung, Drive ca nhan cho Truong phong`
