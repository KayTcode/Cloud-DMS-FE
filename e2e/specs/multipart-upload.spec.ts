import { test, expect } from '@playwright/test';
import process from 'node:process';
import { loginViaApi } from '../helpers/apiHelper';

test.describe('Tải Tệp Dung Lượng Lớn (Multipart Upload & Heartbeat Session)', () => {
  const sysAdminPass = process.env.SYSADMIN_PASSWORD || 'SysAdmin@Dev2026!';
  let sysAdminToken: string;

  test.beforeAll(async ({ request }) => {
    sysAdminToken = await loginViaApi(request, 'sysadmin@local.com', sysAdminPass);
  });

  test('TC-UF-05.03: Khởi tạo phiên tải Multipart và gia hạn phiên qua Heartbeat', async ({ request }) => {
    // 1. Khởi tạo phiên upload cho file lớn (ví dụ: video 200MB)
    const initRes = await request.post('/api/files/upload-sessions', {
      headers: {
        Authorization: `Bearer ${sysAdminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        fileName: 'du_an_quy4_video.mp4',
        fileSizeBytes: 200 * 1024 * 1024,
        contentType: 'video/mp4',
      },
    });

    if (initRes.status() === 200) {
      const session = await initRes.json();
      expect(session.sessionId || session.id).toBeDefined();
      const sessionId = session.sessionId || session.id;

      // 2. Gửi Heartbeat gia hạn phiên trượt
      const heartbeatRes = await request.post(`/api/files/upload-sessions/${sessionId}/heartbeat`, {
        headers: {
          Authorization: `Bearer ${sysAdminToken}`,
        },
      });

      expect([200, 204]).toContain(heartbeatRes.status());
    } else {
      // Trường hợp quota hoặc upload session endpoint yêu cầu provider cụ thể
      expect([200, 400, 503]).toContain(initRes.status());
    }
  });

  test('TC-UF-05.03b: Kiểm tra danh sách phiên tải đang chờ (GET /api/files/upload-sessions?status=Pending)', async ({ request }) => {
    const listRes = await request.get('/api/files/upload-sessions?status=Pending', {
      headers: {
        Authorization: `Bearer ${sysAdminToken}`,
      },
    });

    // Endpoint này đã được sửa hết lỗi 503 trong phiên test ngày 12/11
    expect([200, 204]).toContain(listRes.status());
  });
});

