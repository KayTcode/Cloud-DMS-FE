import * as readline from 'readline';

/**
 * Helper lấy liên kết kích hoạt lời mời (Invitation Link) từ biến môi trường hoặc terminal prompt.
 */
export async function getInvitationLink(roleName: string, envVarName: string): Promise<string> {
  const envVal = process.env[envVarName];
  if (envVal && envVal.trim().length > 0) {
    console.log(`[E2E] Sử dụng link kích hoạt từ biến môi trường ${envVarName}: ${envVal.trim()}`);
    return envVal.trim();
  }

  console.log(`\n======================================================================`);
  console.log(`[HÀNH ĐỘNG]: Vui lòng mở hộp thư Gmail nhận thư mời của vai trò: ${roleName}`);
  console.log(`Copy liên kết kích hoạt (dạng: https://localhost:8443/accept-invitation?token=...)`);
  console.log(`và dán vào terminal bên dưới rồi nhấn ENTER để kịch bản tiếp tục:`);
  console.log(`======================================================================\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`👉 Dán liên kết cho [${roleName}]: `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

