/**
 * Base generic API Response structure matching .NET Clean Architecture
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

/**
 * Paged Result contract matching .NET Application.Common.Models.PagedList<T>
 */
export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/**
 * RFC 7807 Problem Details format for .NET Validation / Exception middleware
 */
export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

/**
 * Toast Notification item
 */
export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  message: string;
}
