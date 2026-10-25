# Quota "Available Capacity" Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent quota requests/approvals at all 3 escalation levels (User→DepartmentAdmin, DepartmentAdmin→TenantAdmin, TenantAdmin→SystemAdmin) from exceeding the approver's actual remaining ("available") capacity, both when the request is created and when it is decided.

**Architecture:** The app already has one generic quota module (`src/features/quota/`) whose `RequestQuotaModal`, `DecideQuotaModal` and `PendingQuotaTable` components are reused by all three levels. We add a `maxAvailableBytes` (and, for System Admin only, a per-row async resolver) capability to these three shared components and a small pure-validation util, then wire each level's view to pass in the correct "remaining capacity of the approver" number using data sources that already exist in each view/context. Where a role genuinely has no accessible API to see the parent's remaining capacity ahead of time, validation is skipped there (soft warning only) rather than guessed — this is the project owner's explicit, confirmed decision for this plan.

**Tech Stack:** React + TypeScript, existing `apiClient`/axios services, no new libraries.

**Spec:** This plan document. No separate spec file exists; requirements were gathered via a Q&A session preceding this plan (summarized in Global Constraints below) because no written spec existed for this feature.

## Global Constraints

- "Available capacity" at Department/Tenant level = `allocated − used − 0 (do NOT subtract other pending requests)`. Per project owner: only approved/allocated amounts count, pending requests do not reduce the displayed available figure. (Confirmed answer: "chỉ trừ trong trường hợp chấp thuận cấp".)
- Validation must run **both** when a request is created (requester side) **and** when it is decided (approver side), wherever the needed data is reachable.
- Where the requester's role has no accessible API to read the parent's remaining capacity, do **not** block submission — only show a soft, non-blocking info/warning note. Never throw a hard error to the user for a missing permission/API (403/network failure must degrade gracefully, never crash the view).
- Boundary rule: requesting/approving an amount **equal to** the available capacity is allowed (`<=`, not `<`).
- Do not change the existing hard cap `MAX_GB = 500` or the `MAX_TEMPORARY_DAYS = 90` rule in `RequestQuotaModal.tsx` — the new "available capacity" check is an additional, independent constraint on top of them.
- Reuse the existing `QuotaRequestDto`, `quotaApi`, and role-based `getPendingForMe()` — this plan does not change backend contracts for request/decide/reject/history.
- System Admin's Pending Approvals screen is in scope for this plan (confirmed answer: "Có, thêm vào DashboardView của System Admin").
- Department Admin's request-to-Tenant screen must receive the **Tenant's** remaining pool, not the Department's own remaining pool, which is what it currently (incorrectly) passes in (confirmed answer: "Có, thêm prop/fetch...").

## Review Focus

- A department/tenant/provider that is fully allocated (`availableBytes <= 0`) must block *any* positive request/approval amount with a clear message, not silently allow it because `0` is falsy in a naive `if (available)` check.
- A failed/forbidden lookup of the parent's remaining capacity (403, network error, missing field) must leave the requester able to submit and the approver able to decide — never a crash or a stuck spinner. Covered by tasks 2, 3, 6, 8.
- The boundary case `requestedBytes === maxAvailableBytes` (and `approvedBytes === maxAvailableBytes`) must succeed, not be rejected as ">=". Covered by tasks 1, 2, 3.
- The quick-add preset buttons (`+2/+5/+10/+20/+50 GB`) in `RequestQuotaModal` must not let the user pick a preset that is already known to exceed `maxAvailableBytes` — they should be disabled, not silently fail on submit. Covered by task 2.
- In System Admin's resolver chain (requester → tenant → storage provider), a tenant whose `storageProviderId` is missing/unassigned must resolve to "unknown" (skip validation for that one row) instead of throwing and breaking the whole pending table. Covered by task 8.

---

### Task 1: Shared availability-validation util

**Files:**
- Create: `src/features/quota/utils/quotaAvailability.ts`
- Test: `src/features/quota/utils/__tests__/quotaAvailability.test.ts`

**Interfaces:**
- Produces:
  - `export const GB_IN_BYTES = 1024 * 1024 * 1024;`
  - `export function bytesToGB(bytes?: number | null, precision?: number): number`
  - `export function gbToBytes(gb?: number | null): number`
  - `export function checkAvailability(requestedBytes: number, maxAvailableBytes: number | null | undefined): { ok: boolean; message?: string }` — returns `{ ok: true }` when `maxAvailableBytes` is `null`/`undefined` (unknown → skip, per Global Constraints) or when `requestedBytes <= maxAvailableBytes`; otherwise `{ ok: false, message: "Vượt quá hạn mức còn trống (<X> GB)." }` with `<X>` formatted to 2 decimals.

- [ ] **Step 1: Write the failing tests**

```ts
import { checkAvailability, bytesToGB, gbToBytes, GB_IN_BYTES } from '../quotaAvailability';

test('allows amount strictly below available', () => {
  expect(checkAvailability(5 * GB_IN_BYTES, 10 * GB_IN_BYTES).ok).toBe(true);
});

test('allows amount exactly equal to available (boundary)', () => {
  expect(checkAvailability(10 * GB_IN_BYTES, 10 * GB_IN_BYTES).ok).toBe(true);
});

test('rejects amount above available, zero available included', () => {
  expect(checkAvailability(1 * GB_IN_BYTES, 0).ok).toBe(false);
  expect(checkAvailability(11 * GB_IN_BYTES, 10 * GB_IN_BYTES).ok).toBe(false);
});

test('skips validation when available is unknown', () => {
  expect(checkAvailability(999 * GB_IN_BYTES, null).ok).toBe(true);
  expect(checkAvailability(999 * GB_IN_BYTES, undefined).ok).toBe(true);
});

test('bytesToGB/gbToBytes round-trip', () => {
  expect(bytesToGB(gbToBytes(5))).toBe(5);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- quotaAvailability`
Expected: FAIL with "Cannot find module '../quotaAvailability'"

- [ ] **Step 3: Implement the module in `src/features/quota/utils/quotaAvailability.ts`**

Plain arithmetic, no framework dependency; mirror the rounding behavior already used in `RequestQuotaModal.tsx` (`toFixed`/`Math.round`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- quotaAvailability`
Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add src/features/quota/utils/quotaAvailability.ts src/features/quota/utils/__tests__/quotaAvailability.test.ts
git commit -m "feat(quota): add shared available-capacity validation util"
```

---

### Task 2: `RequestQuotaModal` — enforce and surface `maxAvailableBytes`

**Files:**
- Modify: `src/features/quota/components/RequestQuotaModal.tsx`

**Interfaces:**
- Consumes: `checkAvailability`, `bytesToGB` from Task 1 (`../utils/quotaAvailability`).
- Produces: `RequestQuotaModalProps` gains `maxAvailableBytes?: number | null` (optional, defaults to `undefined` = unknown/skip, per Global Constraints).

- [ ] **Step 1: Add the prop and info banner**

Add `maxAvailableBytes` to `RequestQuotaModalProps`. When it is a finite number, render a banner near the GB input showing "Hạn mức còn trống của cấp trên: `{bytesToGB(maxAvailableBytes)}` GB" (reuse the existing `Info` banner style already in the file). When it is `null`/`undefined`, render the existing softer note: "Không thể xác minh hạn mức còn trống của cấp trên lúc này — yêu cầu vẫn được gửi, nhưng có thể bị từ chối nếu vượt quá." No test for this step (pure render — exercised by Step 2's test via DOM query if the project has component tests already set up; otherwise this step is visual-only, confirmed manually per step 5).

- [ ] **Step 2: Disable quick-add presets above the available amount and validate on submit**

In `handleQuickAdd`'s button list (`[2, 5, 10, 20, 50]`), add `disabled={maxAvailableBytes != null && gb * GB_IN_BYTES > maxAvailableBytes}` to each preset button. In `handleSubmit`, after the existing `MAX_GB` check, add:

```ts
const availability = checkAvailability(Math.round(requestedGB * GB_IN_BYTES), maxAvailableBytes);
if (!availability.ok) {
  setErrorMessage(availability.message!);
  return;
}
```

- [ ] **Step 3: Manually verify in the running app**

Run the dev server, open "Xin thêm dung lượng" as a seeded test User whose department has e.g. 3 GB available; enter 10 GB; confirm the submit is blocked with the availability message and the +5/+10/+20/+50 presets are visibly disabled while +2 remains enabled.
Expected: blocked with message, presets >3GB disabled.

- [ ] **Step 4: Commit**

```bash
git add src/features/quota/components/RequestQuotaModal.tsx
git commit -m "feat(quota): validate requested amount against approver's available capacity"
```

---

### Task 3: `DecideQuotaModal` — enforce and surface `maxAvailableBytes`

**Files:**
- Modify: `src/features/quota/components/DecideQuotaModal.tsx`

**Interfaces:**
- Consumes: `checkAvailability`, `bytesToGB` from Task 1.
- Produces: `DecideQuotaModalProps` gains `maxAvailableBytes?: number | null`.

- [ ] **Step 1: Add the prop and summary row**

Add `maxAvailableBytes` to `DecideQuotaModalProps`. In the existing summary card (the `<div className="mt-4 p-3.5 bg-slate-50 ...">` block), add one more row showing "Hạn mức còn trống (của bạn)" with the same `HardDrive` icon style, only when `maxAvailableBytes != null`.

- [ ] **Step 2: Validate both full and partial approval**

In `handleApprove`, right before the existing `try { setIsLoading(true); ... }` block, after `bytesToApprove` is finalized (covers both `full` and `partial` branches), add:

```ts
const availability = checkAvailability(bytesToApprove, maxAvailableBytes);
if (!availability.ok) {
  setErrorMessage(availability.message!);
  return;
}
```

- [ ] **Step 3: Manually verify in the running app**

As a Department Admin with e.g. 4 GB department-level available capacity, open a pending employee request for +10 GB and attempt "Duyệt đủ 100%"; confirm it is blocked with the availability message. Then switch to "Duyệt một phần" with 4 GB; confirm it succeeds (boundary case).
Expected: full approval blocked, exact-boundary partial approval succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/features/quota/components/DecideQuotaModal.tsx
git commit -m "feat(quota): validate approved amount against approver's own available capacity"
```

---

### Task 4: `PendingQuotaTable` — thread `maxAvailableBytes` through, support an async per-row resolver

**Files:**
- Modify: `src/features/quota/components/PendingQuotaTable.tsx`

**Interfaces:**
- Consumes: `DecideQuotaModal` (Task 3) — same `maxAvailableBytes` prop name.
- Produces: `PendingQuotaTableProps` gains:
  - `maxAvailableBytes?: number | null` — static value, used as-is for every row (Department/Tenant Admin cases: the approver's own capacity is one fixed number regardless of which row they're deciding).
  - `resolveMaxAvailableBytes?: (request: QuotaRequestDto) => Promise<number | null>` — optional per-row async resolver (System Admin case: differs per request because each Tenant's provider differs). When provided, it takes precedence over the static prop.

- [ ] **Step 1: Add props and resolved-value state**

Add both props to `PendingQuotaTableProps`. Add `const [decideMaxAvailableBytes, setDecideMaxAvailableBytes] = useState<number | null | undefined>(undefined);` and `const [isResolvingAvailability, setIsResolvingAvailability] = useState(false);`.

- [ ] **Step 2: Resolve before opening the decide modal**

Change `handleOpenDecide` to:

```ts
const handleOpenDecide = async (req: QuotaRequestDto) => {
  setSelectedRequest(req);
  if (resolveMaxAvailableBytes) {
    setIsResolvingAvailability(true);
    setDecideMaxAvailableBytes(undefined);
    try {
      const resolved = await resolveMaxAvailableBytes(req);
      setDecideMaxAvailableBytes(resolved);
    } catch {
      setDecideMaxAvailableBytes(null); // unknown -> DecideQuotaModal skips the hard block
    } finally {
      setIsResolvingAvailability(false);
    }
  } else {
    setDecideMaxAvailableBytes(maxAvailableBytes ?? null);
  }
  setIsDecideModalOpen(true);
};
```

Pass `maxAvailableBytes={decideMaxAvailableBytes}` to `<DecideQuotaModal ... />`. While `isResolvingAvailability` is true, disable the row's "Xử lý" button and show a small spinner on it instead of the label, so the admin never opens the modal with a stale/wrong value mid-resolution.

- [ ] **Step 3: Manually verify graceful degradation**

Temporarily make `resolveMaxAvailableBytes` throw (e.g. a `Promise.reject` test wiring in Task 8's consumer) and confirm the "Xử lý" click still opens `DecideQuotaModal` (now with no hard block, just the soft note from Task 3 Step 1) instead of hanging or crashing.
Expected: modal opens normally, no console error surfaced to the user.

- [ ] **Step 4: Commit**

```bash
git add src/features/quota/components/PendingQuotaTable.tsx
git commit -m "feat(quota): thread approver available-capacity (static or resolved) into decide flow"
```

---

### Task 5: Wire User → DepartmentAdmin level (request side)

**Files:**
- Modify: `src/features/user/views/StorageView.tsx`
- Modify: `src/features/department-admin/api/departmentApi.ts` (no signature change — confirm `getQuotaSummary` is reused as-is)

**Interfaces:**
- Consumes: `departmentApi.getQuotaSummary(departmentId): Promise<DepartmentUsersQuotaSummaryDto>` (existing, `departmentAvailableBytes` field), `useAuth()` for `user.departmentId`.
- Produces: passes `maxAvailableBytes` to `<RequestQuotaModal />`.

- [ ] **Step 1: Fetch the department's available bytes with graceful fallback**

In `StorageView.tsx`, import `useAuth` from `@/context/AuthContext` and `departmentApi` from `@/features/department-admin/api`. Add `const [deptAvailableBytes, setDeptAvailableBytes] = useState<number | null>(null);`. Add an effect that, when `user?.departmentId` is set, calls `departmentApi.getQuotaSummary(user.departmentId)` inside `try/catch`, setting `deptAvailableBytes` to `res.departmentAvailableBytes` on success and leaving it `null` on any error (403 included) — per Global Constraints, never block the UI on this failing.

- [ ] **Step 2: Pass it to the modal**

Change the `<RequestQuotaModal .../>` call at the bottom of the file to also pass `maxAvailableBytes={deptAvailableBytes}`.

- [ ] **Step 3: Manually verify**

As a seeded User in a department with a known `departmentAvailableBytes` (check via the Department Admin's own quota view for the same department), open "Xin thêm dung lượng" and confirm the available-capacity banner from Task 2 shows the same figure, and that requesting more than it is blocked.
Expected: banner figure matches Department Admin's view; over-request blocked.

- [ ] **Step 4: Commit**

```bash
git add src/features/user/views/StorageView.tsx
git commit -m "feat(quota): validate user's quota request against department's available capacity"
```

---

### Task 6: Wire DepartmentAdmin level (decide side + corrected request side)

**Files:**
- Modify: `src/features/department-admin/views/DepartmentQuotaView.tsx`
- Modify: `src/features/department-admin/DepartmentAdminPortal.tsx`

**Interfaces:**
- Consumes: `useTenantContext()` (`tenant.availableBytes`, `quotaData`) — already imported in `DepartmentAdminPortal.tsx`; `gbToBytes` from Task 1's util (or the existing `src/features/department-admin/utils/quotaUtils.ts`, which already has an equivalent — reuse that one here to avoid duplicating logic in this feature).
- Produces: `DepartmentQuotaViewProps` gains `tenantAvailableBytes?: number | null` (decide-side keeps using the existing `availableQuotaGB` prop, now also converted to bytes and passed to `PendingQuotaTable`/`RequestQuotaModal` correctly as described below).

- [ ] **Step 1: Fix the decide-side wiring (department's own capacity)**

In `DepartmentQuotaView.tsx`, convert the existing `availableQuotaGB` prop to bytes (`gbToBytes(availableQuotaGB)`) and pass it as `maxAvailableBytes` to `<PendingQuotaTable ... maxAvailableBytes={gbToBytes(availableQuotaGB)} />`. This is the Department's own remaining capacity — correct for a Department Admin approving an employee's request.

- [ ] **Step 2: Add the tenant-pool prop and pass it to the request-side modal**

Add `tenantAvailableBytes?: number | null` to `DepartmentQuotaViewProps`. Pass it to `<RequestQuotaModal ... maxAvailableBytes={tenantAvailableBytes} />` (this is the correct value for "Dept Admin requests more *for the department* from Tenant Admin" — the Tenant's own remaining pool, not the Department's).

- [ ] **Step 3: Supply `tenantAvailableBytes` from `DepartmentAdminPortal.tsx`**

In `DepartmentAdminPortal.tsx`, destructure `tenant, quotaData` from `useTenantContext()` (already imported). At each of the 4 call sites of `<DepartmentQuotaView ... />` (lines ~219, ~231, ~279, ~294 per the current file), add `tenantAvailableBytes={quotaData ? tenant.availableBytes : null}`. Gating on `quotaData` (only set when the tenant fetch genuinely succeeded) avoids passing a stale mock/placeholder number when the fetch failed or is still loading — satisfies the graceful-degradation constraint.

- [ ] **Step 4: Manually verify**

As a seeded Department Admin: (a) open "Yêu cầu chờ phê duyệt" and confirm an employee request above the department's own available GB is blocked at decide-time; (b) open "Xin thêm dung lượng phòng ban" and confirm the banner now shows the **Tenant's** available GB (cross-check against the Tenant Admin's own `TenantQuotaView` for the same tenant), not the department's own number.
Expected: decide-side blocks against department capacity; request-side banner shows tenant capacity.

- [ ] **Step 5: Commit**

```bash
git add src/features/department-admin/views/DepartmentQuotaView.tsx src/features/department-admin/DepartmentAdminPortal.tsx
git commit -m "fix(quota): department decide uses dept capacity, department request uses tenant capacity"
```

---

### Task 7: Wire TenantAdmin level (decide side; document request-side limitation)

**Files:**
- Modify: `src/features/tenants/views/TenantQuotaView.tsx`

**Interfaces:**
- Consumes: existing `tenant: TenantInfo` prop already received by this view (`tenant.availableBytes`, already computed as `availablePoolGB` in the file).

- [ ] **Step 1: Wire the decide side**

Pass `maxAvailableBytes={Math.round(availablePoolGB * GB_IN_BYTES)}` (reuse the file's existing `GB_IN_BYTES` constant... note: this file currently has no `GB_IN_BYTES` constant, only `formatBytesToGB`; use `tenant.availableBytes` directly instead, since it is already in bytes) to `<PendingQuotaTable ... maxAvailableBytes={tenant.availableBytes ?? null} />`. This lets the Tenant Admin's approval of a Department's request be checked against the Tenant's own remaining pool — data already present in this view.

- [ ] **Step 2: Leave the request side unvalidated, with a one-line code comment explaining why**

Do **not** add a `maxAvailableBytes` prop to the `<RequestQuotaModal .../>` call in this file. Add a short comment above it: `// No API lets TenantAdmin see the storage provider's remaining capacity ahead of time (that data is System-Admin-only, see systemAdminQueries.getStorageProviderAvailableQuotaApi) — validation for this level happens at decide-time in System Admin's PendingQuotaTable (Task 8).` This matches the project owner's confirmed fallback choice for cases with no accessible API, and avoids guessing at an endpoint shape that doesn't exist for this role.

- [ ] **Step 3: Manually verify**

As a seeded Tenant Admin, open "Yêu cầu chờ phê duyệt" and confirm a Department's request above the tenant's own available GB is blocked at decide-time (mirrors Task 6 Step 4a).
Expected: blocked with availability message.

- [ ] **Step 4: Commit**

```bash
git add src/features/tenants/views/TenantQuotaView.tsx
git commit -m "feat(quota): validate tenant admin's decisions against tenant's available pool"
```

---

### Task 8: Add System Admin Pending Approvals (decide side, resolved per-row)

**Files:**
- Modify: `src/features/system-admin/views/DashboardView.tsx`
- Modify: `src/features/system-admin/api/systemAdminQueries.ts`

**Interfaces:**
- Consumes: existing `getAdminUserByIdApi(id): Promise<AdminUserDto | null>`, `getTenantStorageQuotaApi(tenantId): Promise<any>`, `getStorageProviderAvailableQuotaApi(providerId): Promise<any>` (all already present in `systemAdminQueries.ts`).
- Produces: new exported helper `export const resolveTenantRequestMaxAvailableBytes = async (request: QuotaRequestDto): Promise<number | null> => { ... }` in `systemAdminQueries.ts`, used as `PendingQuotaTable`'s `resolveMaxAvailableBytes` prop (Task 4).

- [ ] **Step 1: Implement the resolver chain**

In `systemAdminQueries.ts`, add:

```ts
export const resolveTenantRequestMaxAvailableBytes = async (
  request: QuotaRequestDto
): Promise<number | null> => {
  try {
    const requester = await getAdminUserByIdApi(request.requesterId);
    if (!requester?.tenantId) return null;
    const tenantQuota = await getTenantStorageQuotaApi(requester.tenantId);
    const providerId = tenantQuota?.storageProviderId;
    if (!providerId) return null;
    const providerQuota = await getStorageProviderAvailableQuotaApi(providerId);
    const available = providerQuota?.availableToAllocateBytes;
    return typeof available === 'number' ? available : null;
  } catch {
    return null;
  }
};
```

This resolves "how much the storage provider backing this Tenant Admin's tenant still has free to allocate" — the correct check for a Tenant→SystemAdmin escalation. Any failure at any step (unassigned provider, 403, network) degrades to `null` (validation skipped for that row, per Global Constraints), never throws.

- [ ] **Step 2: Add the Pending Approvals section to `DashboardView.tsx`**

Import `PendingQuotaTable` from `@/features/quota` and `resolveTenantRequestMaxAvailableBytes` from `../api/systemAdminQueries`. Add a new section (near the existing `QuotaMetricsCard` usage at line 112) rendering:

```tsx
<PendingQuotaTable
  resolveMaxAvailableBytes={resolveTenantRequestMaxAvailableBytes}
  onShowToast={(message, type) => /* reuse this view's existing toast mechanism */}
/>
```

Wire `onShowToast`/`onCountChange` to whatever toast/notification mechanism `DashboardView.tsx` already uses elsewhere (match its existing pattern rather than introducing a new one).

- [ ] **Step 3: Manually verify end-to-end**

As a seeded System Admin, with a Tenant Admin's pending request for more than the assigned storage provider's remaining capacity, open the new Pending Approvals section and confirm "Duyệt đủ" is blocked with the availability message; confirm a request from a tenant whose provider is unassigned still opens the decide modal without the hard block (graceful `null` case).
Expected: over-limit blocked; unknown-provider case degrades gracefully.

- [ ] **Step 4: Commit**

```bash
git add src/features/system-admin/views/DashboardView.tsx src/features/system-admin/api/systemAdminQueries.ts
git commit -m "feat(quota): add System Admin pending quota approvals with provider-capacity validation"
```

---

## Self-Review Notes

- **Coverage:** All three escalation levels have decide-side validation (Tasks 3, 6, 7, 8) wired to data each respective view already holds or can already fetch. Request-side validation is wired wherever an accessible data source exists (Tasks 2, 5, 6-Step-2/3); the one level with no accessible API (TenantAdmin viewing the provider's pool ahead of time) is explicitly left unvalidated with a documented reason (Task 7), per the project owner's confirmed decision rather than a guess.
- **Type consistency:** `maxAvailableBytes?: number | null` is the consistent prop name/type across `RequestQuotaModal`, `DecideQuotaModal`, and `PendingQuotaTable` (Tasks 2–4); `resolveMaxAvailableBytes` is the consistent resolver name across `PendingQuotaTable` (Task 4) and `systemAdminQueries.ts` (Task 8).
- **Boundary case** (`requested === available` succeeds) is pinned by a unit test in Task 1 and manually re-verified in Tasks 3 and 6.
- **Graceful-degradation** (unknown/forbidden available capacity never blocks or crashes) is pinned by Task 1's unit tests and manually re-verified in Tasks 4, 5, 6, 8.
