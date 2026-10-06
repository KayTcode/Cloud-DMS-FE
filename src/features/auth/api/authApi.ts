import apiClient from '@/api/axiosClient';
import { LoginPayload, LoginResponse } from '@/types/auth.types';

export interface InvitationValidationResponse {
  isValid: boolean;
  message: string;
  email?: string;
  fullName?: string;
  tenantName?: string;
}

export interface AcceptInvitationPayload {
  token: string;
  email: string;
  newPassword: string;
}

export const loginApi = async (payload: LoginPayload): Promise<LoginResponse> => {
  const response = await apiClient.post<any, LoginResponse>('/user/login', payload);
  return response;
};

export const validateInvitationApi = async (token: string, email: string): Promise<InvitationValidationResponse> => {
  const response = await apiClient.get<any, InvitationValidationResponse>(
    `/auth/validate-invitation?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
  );
  return response;
};

export const acceptInvitationApi = async (payload: AcceptInvitationPayload): Promise<LoginResponse> => {
  const response = await apiClient.post<any, LoginResponse>('/auth/accept-invitation', payload);
  return response;
};
