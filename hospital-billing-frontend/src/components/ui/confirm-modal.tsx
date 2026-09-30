import { Button } from './button';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'নিশ্চিত করুন',
  isSubmitting,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mb-5 text-sm text-gray-600">{message}</p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            বাতিল
          </Button>
          <Button variant="danger" className="flex-1" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'অপেক্ষা করুন...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}