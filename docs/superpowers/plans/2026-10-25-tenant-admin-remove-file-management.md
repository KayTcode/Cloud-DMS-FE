# Tenant Admin: Remove File Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all file browsing / file-detail-viewing UI from the Tenant Admin portal, so Tenant Admin only manages Department Admin accounts (org structure, quota, lifecycle) and Department Admin keeps its existing, unchanged scope (own department's staff + storage report).

**Architecture:** The app has no react-router; navigation is role-based conditional rendering (`src/App.tsx`) plus an internal tab state (`TenantContext.tsx` `activeTab`). Tenant Admin's file browser lives entirely behind one tab (`activeTab === 'storage'` → `TenantStorageView`), reachable from one sidebar nav item (`storage-providers` → "Kho lưu trữ") and one dashboard card link (`StorageStatsCard`'s "Mở rộng" / "Quản lý chi tiết ổ đĩa" buttons). Removing the tab, its nav entry, and its two card buttons fully removes file management from Tenant Admin without touching Department Admin's own, separately-scoped `department-admin` feature module (which already exists and is out of scope per user decision).

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS.

**Spec:** This plan's header and the conversation above (no separate spec doc) — captured requirements:
1. Tenant Admin must not browse/list department files or view file details.
2. Tenant Admin keeps managing Department Admin accounts (create, assign lead, offboard, allocate quota) — i.e. `TenantDepartmentsView.tsx` and `TenantQuotaView.tsx` stay unchanged (quota approval is not file browsing).
3. Department Admin's own scope (single department, `StaffManagementView`, `DepartmentStorageReportView`, `DepartmentFilesView`) is explicitly **not** touched in this plan (confirmed by user).
4. Backend/API layer (`fileApi.ts`) stays as-is; this is a UI-only removal.

## Global Constraints

- Single-tenant-admin scope: do not modify anything under `src/features/department-admin/`.
- Do not delete or modify `src/features/tenants/api/fileApi.ts` — `StorageStatsCard.tsx` still needs `getTenantFilesApi` for aggregate stats, and the other exports (`downloadTenantFileApi`, `deleteTenantFileApi`, `uploadTenantFilesApi`, `uploadDirectTenantFilesApi`) become naturally unused dead exports once `TenantStorageView.tsx` is deleted — leave them; no backend contract changes requested.
- Do not touch `TenantDepartmentsView.tsx`, `TenantQuotaView.tsx`, `AllocateDepartmentQuotaModal.tsx`, `AssignVacantDepartmentLeadModal.tsx`, `OffboardDepartmentAdminModal.tsx` — these implement "quản lý department admin", which Tenant Admin keeps.
- Keep `StorageStatsCard` itself (aggregate dashboard stats are not "file browsing/viewing details") — only remove its two click-through buttons that navigated to the now-removed file browser.
- Run `npm run build` (or the project's TypeScript check) after the type (`ActiveTab`) change, since removing a union member can surface now-invalid references at compile time — this is the primary verification mechanism for this plan (no existing test suite covers this UI).

## Review Focus

- Stale deep-link/state: if a user had `activeTab` persisted as `'storage'` from a previous session (e.g. via browser back/forward re-render or leftover context state), the tab content area must not crash — covered by Task 1's removal of the `'storage'` case, which simply renders nothing for that value (same as any other unknown tab).
- Sidebar nav for **other roles** (`SystemAdmin`, `DepartmentAdmin`, `User`/`Employee`) must keep their own `storage-providers` nav entries working — covered by Task 4 scoping the removal strictly to the `isTenantAdmin` branch of `Sidebar.tsx` and the `role === 'TenantAdmin'` branch of `MainLayout.tsx`'s `getHeaderTitle`.
- `StorageStatsCard` must still render correctly with its buttons simply absent (not broken/empty button shells) when `onNavigateToStorage`/`onExpandStorage` are no longer passed — covered by Task 3 making both props genuinely optional-and-omitted rather than passed as no-ops.
- `TenantTabs.tsx` is dead code (imported in `TenantPortal.tsx` but never rendered) — must still compile after `ActiveTab` drops `'storage'`, since it references the type — covered by Task 2.
- Removing the whole `TenantStorageView.tsx` file must not break the `views/index.ts` barrel export or any other importer — covered by Task 2's grep-verified removal of the export and re-check of all importers found during research (only `TenantPortal.tsx`).

---

## Task 1: Remove the `storage` tab from `TenantPortal.tsx` and the `ActiveTab` type

**Files:**
- Modify: `src/features/tenants/types/tenant.dto.ts:1-10` (remove `'storage'` from the `ActiveTab` union)
- Modify: `src/features/tenants/TenantPortal.tsx:10-20` (remove `TenantStorageView` import), `TenantPortal.tsx:171-178` (remove the `activeTab === 'storage'` block)

**Interfaces:**
- Consumes: nothing new.
- Produces: `ActiveTab` no longer includes `'storage'`; any later task referencing `ActiveTab` must not use `'storage'`.

- [ ] **Step 1: Remove `'storage'` from the `ActiveTab` union in `src/features/tenants/types/tenant.dto.ts`**

Edit the union at lines 1-10 to drop the `| 'storage'` line, keeping `'hub' | 'overview' | 'users' | 'departments' | 'activity' | 'settings' | 'quota' | 'create-department-user'`.

- [ ] **Step 2: Remove the storage tab block and its import from `TenantPortal.tsx`**

Remove `TenantStorageView` from the import list at lines 10-20, and remove the entire `{activeTab === 'storage' && (...)}` JSX block at lines 171-178.

- [ ] **Step 3: Run the TypeScript build to verify no remaining references break**

Run: `npm run build` (or `tsc --noEmit` if that's the project's check script)
Expected: compiler errors point at every remaining `'storage'` reference (in `TenantTabs.tsx`, `TenantOverviewView.tsx`, `StorageStatsCard.tsx`, `TenantContext.tsx`) — this is expected at this point; they get fixed in Tasks 2-4. Confirm no error originates from `TenantPortal.tsx` or `tenant.dto.ts` itself.

- [ ] **Step 4: Commit**

```bash
git add src/features/tenants/types/tenant.dto.ts src/features/tenants/TenantPortal.tsx
git commit -m "feat(tenant-admin): drop storage tab from TenantPortal"
```

---

## Task 2: Delete `TenantStorageView.tsx` and clean up its barrel exports and dead-code references

**Files:**
- Delete: `src/features/tenants/views/TenantStorageView.tsx`
- Modify: `src/features/tenants/views/index.ts` (remove the `TenantStorageView` export line)
- Modify: `src/features/tenants/components/TenantTabs.tsx:13-22` (remove the `{ id: 'storage', label: 'Storage' }` entry)

**Interfaces:**
- Consumes: Task 1's updated `ActiveTab` type (no `'storage'` member).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Delete the file**

```bash
rm "src/features/tenants/views/TenantStorageView.tsx"
```

- [ ] **Step 2: Remove its export from `src/features/tenants/views/index.ts`**

Remove the line exporting `TenantStorageView` (e.g. `export * from './TenantStorageView';` or named export line — match whatever form is in the file).

- [ ] **Step 3: Remove the `storage` entry from `TenantTabs.tsx`'s tab list**

In `src/features/tenants/components/TenantTabs.tsx:13-22`, delete the `{ id: 'storage', label: 'Storage' }` array entry (lines ~18).

- [ ] **Step 4: Run the TypeScript build to verify**

Run: `npm run build`
Expected: no error referencing `TenantStorageView` or `views/index.ts`; errors should now only point at `TenantOverviewView.tsx` and `StorageStatsCard.tsx` (fixed in Task 3) and `TenantContext.tsx`/layout files (fixed in Task 4).

- [ ] **Step 5: Commit**

```bash
git add src/features/tenants/views/index.ts src/features/tenants/components/TenantTabs.tsx
git status
git add -u src/features/tenants/views/
git commit -m "feat(tenant-admin): delete TenantStorageView and its barrel export"
```

---

## Task 3: Remove the file-browser link from the Tenant Overview dashboard card

**Files:**
- Modify: `src/features/tenants/components/StorageStatsCard.tsx:19-29` (make `onNavigateToStorage`/`onExpandStorage` removed entirely, not just optional) and `StorageStatsCard.tsx:245-253,456-464` (remove the two button blocks that use them)
- Modify: `src/features/tenants/views/TenantOverviewView.tsx:11` (narrow the `onNavigateTab` prop type to drop `'storage'`) and `TenantOverviewView.tsx:63-67` (stop passing `onNavigateToStorage`/`onExpandStorage`)

**Interfaces:**
- Consumes: Task 1's `ActiveTab` type (so `onNavigateTab`'s inline type in `TenantOverviewView.tsx` stays consistent with `ActiveTab`).
- Produces: `StorageStatsCard` component with only `tenant: TenantInfo` as its prop (no navigation props).

- [ ] **Step 1: Remove the two navigation props and their buttons from `StorageStatsCard.tsx`**

In `src/features/tenants/components/StorageStatsCard.tsx`:
- Remove `onNavigateToStorage` and `onExpandStorage` from `StorageStatsCardProps` (lines 19-23) and from the destructured props (lines 25-29).
- Remove the `{onExpandStorage && (...)}` "Mở rộng" button block (lines ~245-253).
- Remove the `{onNavigateToStorage && (...)}` "Quản lý chi tiết ổ đĩa & phân vùng" button block (lines ~456-464) — the surrounding footer `div` (lines 444-465) keeps its left-hand status text, just drops the right-hand button.

- [ ] **Step 2: Update `TenantOverviewView.tsx` to match the trimmed `StorageStatsCard` API**

In `src/features/tenants/views/TenantOverviewView.tsx`:
- Change the `onNavigateTab` prop type at line 11 from `(tab: 'users' | 'departments' | 'storage' | 'activity') => void` to `(tab: 'users' | 'departments' | 'activity') => void`.
- Remove the `onNavigateToStorage={...}` and `onExpandStorage={...}` lines (65-66) from the `<StorageStatsCard ... />` call at lines 63-67, leaving only `tenant={tenant}`.

- [ ] **Step 3: Run the TypeScript build to verify**

Run: `npm run build`
Expected: no error referencing `StorageStatsCard` or `TenantOverviewView`; remaining errors (if any) should only be in `TenantContext.tsx` / layout files (fixed in Task 4).

- [ ] **Step 4: Commit**

```bash
git add src/features/tenants/components/StorageStatsCard.tsx src/features/tenants/views/TenantOverviewView.tsx
git commit -m "feat(tenant-admin): remove file-browser link from storage stats card"
```

---

## Task 4: Remove the "Kho lưu trữ" sidebar entry and header title for Tenant Admin only

**Files:**
- Modify: `src/layouts/Sidebar.tsx:102-112` (remove the `{ id: 'storage-providers', label: 'Kho lưu trữ', icon: HardDrive }` line from the `isTenantAdmin` branch only)
- Modify: `src/context/TenantContext.tsx:426-449` (remove the `case 'storage-providers': setActiveTab('storage'); break;` block)
- Modify: `src/layouts/MainLayout.tsx:59-77` (remove the `case 'storage-providers': return 'Kho lưu trữ Cloud';` line from the `role === 'TenantAdmin'` branch only)

**Interfaces:**
- Consumes: Task 1's `ActiveTab` type (the removed `handleSelectNav` case referenced the now-gone `'storage'` value).
- Produces: nothing consumed by later tasks (final task).

- [ ] **Step 1: Remove the sidebar nav item for Tenant Admin**

In `src/layouts/Sidebar.tsx`, inside the `if (isTenantAdmin) { return [...] }` block (lines 102-112), delete the line `{ id: 'storage-providers', label: 'Kho lưu trữ', icon: HardDrive },`. Leave the `isSysAdmin`, `isDeptAdmin`, and default (`User`/`Employee`) branches untouched — they each have their own, separate `storage-providers` entry that must keep working.

- [ ] **Step 2: Remove the `storage-providers` → `storage` tab mapping in `TenantContext.tsx`**

In `src/context/TenantContext.tsx`'s `handleSelectNav` function (lines 426-449), delete the `case 'storage-providers': setActiveTab('storage'); break;` block (lines 439-441). The switch only runs `if (authUser?.role === 'TenantAdmin')`, so this is already scoped correctly.

- [ ] **Step 3: Remove the Tenant Admin header title case in `MainLayout.tsx`**

In `src/layouts/MainLayout.tsx`'s `getHeaderTitle` function, inside the `if (role === 'TenantAdmin') { switch (activeNav) {...} }` block (lines 60-77), delete the `case 'storage-providers': return 'Kho lưu trữ Cloud';` line (lines 66-67). Leave the `DepartmentAdmin`, `User`/`Employee`, and default `SystemAdmin` branches untouched.

- [ ] **Step 4: Run the TypeScript build and confirm zero errors**

Run: `npm run build`
Expected: PASS with no TypeScript errors anywhere in the project.

- [ ] **Step 5: Manual verification in the browser**

Run the dev server (`npm run dev`), log in as a `TenantAdmin` user, and confirm:
- The sidebar no longer shows "Kho lưu trữ".
- The Tenant Overview dashboard's storage stats card shows no "Mở rộng" button and no "Quản lý chi tiết ổ đĩa & phân vùng" link.
- There is no way to reach a file list or file detail view anywhere in the Tenant Admin portal.
- `TenantDepartmentsView` (Phòng ban & Nhân viên) and `TenantQuotaView` (Quản lý Quota) still work exactly as before.
- Log in as `SystemAdmin`, `DepartmentAdmin`, and `User`/`Employee` and confirm their own "Storage"/"Kho lưu trữ"/"Dung lượng lưu trữ" sidebar items and pages are unaffected.

- [ ] **Step 6: Commit**

```bash
git add src/layouts/Sidebar.tsx src/context/TenantContext.tsx src/layouts/MainLayout.tsx
git commit -m "feat(tenant-admin): remove storage nav entry and header title for Tenant Admin"
```
