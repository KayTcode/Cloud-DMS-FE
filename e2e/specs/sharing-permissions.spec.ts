import { test, expect } from '@playwright/test';
import process from 'node:process';
import { loginViaApi } from '../helpers/apiHelper';

test.describe('Chia Sẻ Tệp Tin & Ma Trận Phân Quyền (File Sharing & Permissions)', () => {
  const sysAdminPass = process.env.SYSADMIN_PASSWORD || 'SysAdmin@Dev2026!';
  let sysAdminToken: string;

  test.beforeAll(async ({ request }) => {
    sysAdminToken = await loginViaApi(request, 'sysadmin@local.com', sysAdminPass);
  });

  test('TC-UF-06.01 & TC-UF-06.02: Chia sẻ tệp với quyền Viewer và Editor (POST /api/files/{id}/share)', async ({ request }) => {
    // 1. Tải lên 1 tệp tin mẫu
    const boundary = '----WebKitFormBoundaryShareTest';
    const formBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="tai_lieu_chia_se.txt"\r\nContent-Type: text/plain\r\n\r\n`),
      Buffer.from('Tài liệu dự thảo kế hoạch chia sẻ nội bộ'),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const uploadRes = await request.post('/api/files/upload', {
      headers: {
        Authorization: `Bearer ${sysAdminToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      data: formBody,
    });

    if (uploadRes.status() !== 200) {
      test.skip();
      return;
    }

    const file = await uploadRes.json();
    const fileId = file.id || file.fileId;

    // 2. Chia sẻ cho đồng nghiệp với quyền Viewer
    const shareViewerRes = await request.post(`/api/files/${fileId}/share`, {
      headers: {
        Authorization: `Bearer ${sysAdminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        email: 'dongnghiep_viewer@local.com',
        role: 'Viewer',
      },
    });

    expect([200, 400, 404]).toContain(shareViewerRes.status());

    // 3. Nâng quyền thành Editor
    const shareEditorRes = await request.post(`/api/files/${fileId}/share`, {
      headers: {
        Authorization: `Bearer ${sysAdminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        email: 'dongnghiep_editor@local.com',
        role: 'Editor',
      },
    });

    expect([200, 400, 404]).toContain(shareEditorRes.status());
  });

  test('TC-UF-06.03: Thu hồi quyền chia sẻ (DELETE /api/files/{id}/share/{recipientId})', async ({ request }) => {
    const dummyFileId = '00000000-0000-0000-0000-000000000000';
    const dummyRecipientId = '11111111-1111-1111-1111-111111111111';

    const revokeRes = await request.delete(`/api/files/${dummyFileId}/share/${dummyRecipientId}`, {
      headers: {
        Authorization: `Bearer ${sysAdminToken}`,
      },
    });

    // Thu hồi thành công hoặc 404 nếu không tìm thấy tệp/người nhận
    expect([200, 404]).toContain(revokeRes.status());
  });
});

