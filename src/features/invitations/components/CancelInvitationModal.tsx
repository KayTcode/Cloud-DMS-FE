import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button, ModalWrapper } from '@/components/common';
import type { PendingInvitationDto } from '../types/invitation.types';

interface CancelInvitationModalProps {
  invitation: PendingInvitationDto | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (userId: string) => void;
}

export const CancelInvitationModal: React.FC<CancelInvitationModalProps> = ({
  invitation,
  isSubmitting,
  onClose,
  onConfirm,
}) => {
  return (
    <ModalWrapper
      isOpen={invitation !== null}
      onClose={onClose}
      title="Hủy lời mời"
      icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Giữ lại
          </Button>
          <Button
            variant="danger"
            isLoading={isSubmitting}
            onClick={() => invitation && onConfirm(invitation.userId)}
          >
            Xác nhận hủy
          </Button>
        </>
      }
    >
      {invitation && (
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            Bạn sắp hủy lời mời gửi tới{' '}
            <strong className="text-slate-900">{invitation.email}</strong>. Hãy kiểm tra kỹ địa chỉ
            email trước khi xác nhận.
          </p>
          <p>Tùy trạng thái của người được mời, hệ thống sẽ xử lý theo một trong hai cách:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Nếu người được mời chưa từng đăng nhập: tài khoản, vai trò và hạn mức lưu trữ sẽ bị
              xóa hoàn toàn.
            </li>
            <li>
              Nếu là cựu nhân sự: tài khoản được giữ lại, nhưng bị gỡ liên kết khỏi tổ chức/phòng
              ban và vô hiệu hóa.
            </li>
          </ul>
          <p>Trong cả hai trường hợp, hạn mức lưu trữ đã cấp sẽ được hoàn trả.</p>
        </div>
      )}
    </ModalWrapper>
  );
};
