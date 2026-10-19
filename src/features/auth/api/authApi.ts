import apiClient from '@/api/axiosClient';
import { LoginPayload, LoginResponse } from '@/types/auth.types';

export interface InvitationValidationResponse {
  isValid: boolean;
  message: string;
  email?: string;
  fullName?: string;
  tenantName?: string;
  role?: string;
  departmentName?: string;
  tokenType?: string;
}

export interface AcceptInvitationPayload {
  token: string;
  email: string;
  newPassword?: string;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

export const loginApi = async (payload: LoginPayload): Promise<LoginResponse> => {
  const response = await apiClient.post<any, LoginResponse>('/auth/login', payload);
  return response;
};

export const refreshTokenApi = async (payload: RefreshTokenPayload): Promise<LoginResponse> => {
  const response = await apiClient.post<any, LoginResponse>('/auth/refresh', payload);
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

export interface GoogleAuthStatusResponse {
  isConfigured: boolean;
  issuer?: string;
  redirectUri?: string;
  allowedDomains: string[];
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasRedirectUri: boolean;
}

export const getGoogleAuthStatusApi = async (): Promise<GoogleAuthStatusResponse> => {
  const response = await apiClient.get<any, GoogleAuthStatusResponse>('/auth/google/status');
  return response;
};

export const getGoogleLoginUrl = (returnUrl?: string): string => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5289/api';
  const target = `${baseUrl}/auth/google/login`;
  return returnUrl ? `${target}?returnUrl=${encodeURIComponent(returnUrl)}` : target;
};
