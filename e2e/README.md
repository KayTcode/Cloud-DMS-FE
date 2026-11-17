# Hướng Dẫn Vận Hành Trọn Bộ 27 Kiểm Thử E2E Playwright — Cloud-DMS

Tài liệu hướng dẫn chạy toàn bộ **27 test cases** kiểm thử End-to-End (E2E) qua Gateway `https://localhost:8443`.

---

## 1. Cấu trúc Kịch bản Kiểm thử (Test Suites)

Toàn bộ 27 test cases được phân thành 2 tầng kịch bản rõ ràng:

### Tầng 1: Kịch bản Đường Demo Vàng (Golden Demo Path)
* **File:** `e2e/specs/demo-path.spec.ts`
* **Mục đích:** Chạy tuần tự có giao diện người dùng thật (`--headed`) từ bước 1 đến bước 7 (SystemAdmin $\rightarrow$ TenantAdmin $\rightarrow$ DeptAdmin $\rightarrow$ Employee $\rightarrow$ Drive & ClamAV $\rightarrow$ Share $\rightarrow$ Quota).

### Tầng 2: Các kịch bản Kiểm thử Chuyên biệt (Feature & Security Specs)
* **`e2e/specs/invitation-lifecycle.spec.ts`:** Vòng đời lời mời (Xem danh sách pending theo quyền, Resend, Rate limit 120s 429, Smart Cleanup xóa cứng hoàn quota 100%, Smart Cleanup cựu nhân viên).
* **`e2e/specs/malware-scan.spec.ts`:** Kiểm tra ClamAV phát hiện và chặn mẫu virus chuẩn EICAR.
* **`e2e/specs/security-idor.spec.ts`:** Kiểm tra ranh giới bảo mật IDOR giữa các Tenant và kiểm tra chặn cấp quota vượt dung lượng ổ cứng.
* **`e2e/specs/sharing-permissions.spec.ts`:** Kiểm tra chia sẻ quyền Viewer/Editor và thu hồi quyền xóa cache Redis.
* **`e2e/specs/quota-approval.spec.ts`:** Kiểm tra quy trình xin tăng hạn mức và duyệt bù quota phân cấp.
* **`e2e/specs/offboarding-handover.spec.ts`:** Khóa tài khoản nhân viên thôi việc (văng session JWT) và bàn giao dữ liệu cho người kế nhiệm.
* **`e2e/specs/interim-governance.spec.ts`:** Quản trị lâm thời khi khuyết lãnh đạo: (1) System Admin tiếp quản khi Tenant vắng (Offboard Tenant Admin -> Interim Takeover -> Bổ nhiệm mới -> Hủy/Gửi lại lời mời); (2) Tenant Admin quản lý lâm thời khi Department vắng (Offboard Dept Admin -> Tạm giữ Kho chung -> Tự động leo thang duyệt Quota -> Thêm nhân viên mới -> Phân bổ hạn mức -> Bổ nhiệm Trưởng phòng mới); (3) UI Verification (Banner "Đang tạm quản lý", các Tab chức năng và modal bổ nhiệm).
* **`e2e/specs/multipart-upload.spec.ts`:** Khởi tạo phiên tải file lớn multipart và duy trì heartbeat.

---

## 2. Các Lệnh Chạy Kiểm thử (NPM Scripts)

Mở terminal tại thư mục `Cloud-DMS-FE`:

```powershell
# 1. Chạy diễn tập Đường Demo (có trình duyệt Chromium bật lên trên màn hình)
npm run test:e2e

# 2. Chạy TOÀN BỘ 27 test cases (Demo path + các bài test bảo mật/nghiệp vụ)
npm run test:e2e:all

# 3. Chạy từng file kịch bản chuyên biệt bất kỳ:
npx playwright test e2e/specs/malware-scan.spec.ts
npx playwright test e2e/specs/invitation-lifecycle.spec.ts
npx playwright test e2e/specs/security-idor.spec.ts
npx playwright test e2e/specs/sharing-permissions.spec.ts
npx playwright test e2e/specs/quota-approval.spec.ts
npx playwright test e2e/specs/offboarding-handover.spec.ts
npx playwright test e2e/specs/multipart-upload.spec.ts

# 4. Mở giao diện Playwright UI Mode để tương tác và debug
npm run test:e2e:ui

# 5. Xuất và xem báo cáo HTML
npx playwright show-report
```

---

## 3. Bảng Ánh xạ 27 Test Cases (Traceability Matrix)

| Mã Test Case | Tên Kịch bản / Luồng | File Playwright Spec |
| :--- | :--- | :--- |
| **TC-UF-01.01** | System Admin đăng nhập | `e2e/specs/demo-path.spec.ts` |
| **TC-UF-01.02** | Tạo Tenant & Cấp Quota 50 GB | `e2e/specs/demo-path.spec.ts` |
| **TC-UF-01.03** | Mời Tenant Admin qua email | `e2e/specs/demo-path.spec.ts` |
| **TC-UF-01.04** | [Negative] Cấp quota vượt dung lượng Provider (400) | `e2e/specs/security-idor.spec.ts` |
| **TC-UF-02.01** | Tenant Admin kích hoạt & đặt mật khẩu | `e2e/specs/demo-path.spec.ts` |
| **TC-UF-02.02** | Mời Trưởng phòng kèm ví ngân sách 20 GB (Self-Setup) | `e2e/specs/demo-path.spec.ts` |
| **TC-UF-02.03** | Tenant Admin mời Trưởng phòng vào phòng có sẵn | `e2e/specs/demo-path.spec.ts` |
| **TC-UF-02.04** | [IDOR] Chặn Tenant Admin truy cập Tenant khác (403) | `e2e/specs/security-idor.spec.ts` |
| **TC-UF-03.01** | Trưởng phòng kích hoạt & Tự thiết lập phòng KD (Self-Setup) | `e2e/specs/demo-path.spec.ts` |
| **TC-UF-03.02** | Trưởng phòng mời Nhân viên (2 GB) | `e2e/specs/demo-path.spec.ts` |
| **TC-UF-03.03** | Nhân viên kích hoạt & đăng nhập Drive | `e2e/specs/demo-path.spec.ts` |
| **TC-UF-04.01** | Xem danh sách pending scoped theo quyền | `e2e/specs/invitation-lifecycle.spec.ts` |
| **TC-UF-04.02** | Gửi lại lời mời (Resend) | `e2e/specs/invitation-lifecycle.spec.ts` |
| **TC-UF-04.03** | [Rate Limit] Chặn spam resend trong 2 phút (429) | `e2e/specs/invitation-lifecycle.spec.ts` |
| **TC-UF-04.04** | Hủy lời mời gửi nhầm - Hard Delete & Hoàn Quota | `e2e/specs/invitation-lifecycle.spec.ts` |
| **TC-UF-04.05** | Hủy lời mời cựu nhân viên - Bảo toàn danh tính | `e2e/specs/invitation-lifecycle.spec.ts` |
| **TC-UF-05.01** | Tải tệp sạch & ClamAV quét Clean | `e2e/specs/demo-path.spec.ts` |
| **TC-UF-05.02** | [Security] Chặn tải file mã độc chuẩn EICAR | `e2e/specs/malware-scan.spec.ts` |
| **TC-UF-05.03** | Tải tệp lớn Multipart & Heartbeat resume | `e2e/specs/multipart-upload.spec.ts` |
| **TC-UF-06.01** | Chia sẻ tệp quyền Viewer | `e2e/specs/sharing-permissions.spec.ts` |
| **TC-UF-06.02** | Chia sẻ tệp quyền Editor | `e2e/specs/sharing-permissions.spec.ts` |
| **TC-UF-06.03** | Thu hồi quyền chia sẻ & xóa cache Redis | `e2e/specs/sharing-permissions.spec.ts` |
| **TC-UF-07.01** | Nhân viên gửi yêu cầu tăng Quota | `e2e/specs/quota-approval.spec.ts` |
| **TC-UF-07.02** | Trưởng phòng duyệt khi đủ hạn mức phòng | `e2e/specs/quota-approval.spec.ts` |
| **TC-UF-07.03** | Định tuyến chuyển tiếp bù quota khi thiếu | `e2e/specs/quota-approval.spec.ts` |
| **TC-UF-08.01** | Khóa tài khoản thôi việc (văng session) | `e2e/specs/offboarding-handover.spec.ts` |
| **TC-UF-08.02** | Bàn giao toàn bộ tệp tin cho người tiếp quản | `e2e/specs/offboarding-handover.spec.ts` |
| **TC-IG-01.01** | [Interim] System Admin tiếp quản khi Tenant vắng (InterimTakeover) | `e2e/specs/interim-governance.spec.ts` |
| **TC-IG-01.02** | [Interim] Zero-Day Revocation cho Tenant Admin bị vô hiệu hóa | `e2e/specs/interim-governance.spec.ts` |
| **TC-IG-01.03** | [Interim] Bổ nhiệm Tenant Admin mới cho Tenant khuyết (AssignVacant) | `e2e/specs/interim-governance.spec.ts` |
| **TC-IG-01.04** | [Interim] Resend & Cancel lời mời Tenant Admin mới (Smart Cleanup) | `e2e/specs/interim-governance.spec.ts` |
| **TC-IG-02.01** | [Interim] Tenant Admin vô hiệu hóa Trưởng phòng chuyển Kho chung (InterimHold) | `e2e/specs/interim-governance.spec.ts` |
| **TC-IG-02.02** | [Interim] Tự động leo thang duyệt Quota lên Tenant Admin khi khuyết Lead | `e2e/specs/interim-governance.spec.ts` |
| **TC-IG-02.03** | [Interim] Tenant Admin thêm nhân viên mới vào phòng ban khuyết | `e2e/specs/interim-governance.spec.ts` |
| **TC-IG-02.04** | [Interim] Tenant Admin phân bổ Quota cá nhân cho nhân viên phòng ban khuyết | `e2e/specs/interim-governance.spec.ts` |
| **TC-IG-02.05** | [Interim] Tenant Admin bổ nhiệm Trưởng phòng mới cho phòng ban khuyết | `e2e/specs/interim-governance.spec.ts` |
| **TC-IG-03.01** | [UI] System Admin Portal hiển thị Banner Tiếp quản Lâm thời & Nút Bổ nhiệm | `e2e/specs/interim-governance.spec.ts` |
| **TC-IG-03.02** | [UI] Tenant Admin Portal hiển thị Panel "Đang tạm quản lý" & 4 Tabs chức năng | `e2e/specs/interim-governance.spec.ts` |
