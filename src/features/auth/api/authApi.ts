import apiClient from '@/api/axiosClient';
import { MeResponse } from '@/types/auth.types';
import { BASE_URL } from '@/api/axiosClient';

export const getMeApi = async (): Promise<MeResponse> => {
  const response = await apiClient.get<any, MeResponse>('/me');
  return response;
};

/**
 * Trả về URL để điều hướng trình duyệt đến bắt đầu luồng Google OAuth.
 * mode='login': đăng nhập thông thường.
 * mode='invitation': nhận lời mời với token kèm theo.
 */
export const googleStartUrl = (mode: 'login' | 'invitation', invitationToken?: string): string => {
  let url = `${BASE_URL}/auth/google/start?mode=${mode}`;
  if (mode === 'invitation' && invitationToken) {
    url += `&invitation=${encodeURIComponent(invitationToken)}`;
  }
  return url;
};
