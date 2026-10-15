import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { departmentApi } from '../api';
import {
  DepartmentUsersQuotaSummaryDto,
  UserStorageQuotaDto,
  DepartmentEmployeeDto,
  CreateEmployeePayload,
  SetupDepartmentPayload,
  DepartmentDto,
} from '../types';

interface DepartmentContextType {
  departmentId: string | null;
  hasDepartment: boolean;
  summary: DepartmentUsersQuotaSummaryDto | null;
  employees: DepartmentEmployeeDto[];
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  allocateQuota: (userId: string, quotaBytes: number) => Promise<UserStorageQuotaDto>;
  createEmployee: (payload: CreateEmployeePayload) => Promise<DepartmentEmployeeDto>;
  setupDepartment: (payload: SetupDepartmentPayload) => Promise<DepartmentDto>;
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

export const DepartmentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, updateUser } = useAuth();
  const departmentId = user?.departmentId || null;

  const [summary, setSummary] = useState<DepartmentUsersQuotaSummaryDto | null>(null);
  const [employees, setEmployees] = useState<DepartmentEmployeeDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMutating, setIsMutating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartmentData = useCallback(async (deptId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [quotaSummary, empList] = await Promise.all([
        departmentApi.getQuotaSummary(deptId),
        departmentApi.getEmployees(deptId, 1, 100).catch(() => ({ items: [] })),
      ]);
      setSummary(quotaSummary);
      setEmployees(empList?.items || []);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Không thể tải dữ liệu phòng ban';
      setError(msg);
      console.error('[DepartmentContext] Lỗi nạp dữ liệu:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Tự động đồng bộ departmentId nếu tài khoản DepartmentAdmin chưa có departmentId trong session
  useEffect(() => {
    let isCancelled = false;
    if (!departmentId && user?.role === 'DepartmentAdmin') {
      departmentApi
        .getSetupInfo()
        .then((info) => {
          if (!isCancelled && info?.hasDepartment && info?.departmentId) {
            updateUser({ departmentId: info.departmentId });
          }
        })
        .catch(() => {
          // Bỏ qua lỗi nếu chưa setup
        });
    }
    return () => {
      isCancelled = true;
    };
  }, [departmentId, user?.role, updateUser]);

  useEffect(() => {
    if (departmentId) {
      fetchDepartmentData(departmentId);
    } else {
      setSummary(null);
      setEmployees([]);
    }
  }, [departmentId, fetchDepartmentData]);

  const refreshData = async () => {
    if (departmentId) {
      await fetchDepartmentData(departmentId);
    }
  };

  const allocateQuota = async (userId: string, quotaBytes: number): Promise<UserStorageQuotaDto> => {
    if (!departmentId) throw new Error('Chưa thiết lập phòng ban');
    setIsMutating(true);
    try {
      const res = await departmentApi.allocateUserQuota(departmentId, userId, quotaBytes);
      // Reload quota summary sau khi cấp phát thành công
      await refreshData();
      return res;
    } finally {
      setIsMutating(false);
    }
  };

  const createEmployee = async (payload: CreateEmployeePayload): Promise<DepartmentEmployeeDto> => {
    if (!departmentId) throw new Error('Chưa thiết lập phòng ban');
    setIsMutating(true);
    try {
      const res = await departmentApi.createEmployee(departmentId, payload);
      await refreshData();
      return res;
    } finally {
      setIsMutating(false);
    }
  };

  const setupDepartment = async (payload: SetupDepartmentPayload): Promise<DepartmentDto> => {
    setIsMutating(true);
    try {
      const res = await departmentApi.setupDepartment(payload);
      // Cập nhật departmentId vào AuthUser session và nạp ngay dữ liệu
      if (res?.id) {
        updateUser({ departmentId: res.id });
        await fetchDepartmentData(res.id);
      }
      return res;
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <DepartmentContext.Provider
      value={{
        departmentId,
        hasDepartment: !!departmentId,
        summary,
        employees,
        isLoading,
        isMutating,
        error,
        refreshData,
        allocateQuota,
        createEmployee,
        setupDepartment,
      }}
    >
      {children}
    </DepartmentContext.Provider>
  );
};

export const useDepartment = (): DepartmentContextType => {
  const context = useContext(DepartmentContext);
  if (!context) {
    throw new Error('useDepartment must be used within a DepartmentProvider');
  }
  return context;
};
