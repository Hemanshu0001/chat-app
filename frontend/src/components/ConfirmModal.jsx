import { useEffect, useRef } from 'react';
import { FaTrash, FaQuestionCircle, FaHourglassHalf } from 'react-icons/fa';

export default function ConfirmModal({
  isOpen,
  title = 'Confirm',
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  confirmStyle = 'danger', // 'danger' | 'primary'
  onConfirm,
  onCancel,
  loading = false
}) {
  const confirmBtnRef = useRef(null);

  // Focus confirm button when modal opens
  useEffect(() => {
    if (isOpen) {
      confirmBtnRef.current?.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onCancel?.();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="confirm-overlay" onClick={loading ? undefined : onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon">
          {confirmStyle === 'danger' ? <FaTrash /> : <FaQuestionCircle />}
        </div>
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            ref={confirmBtnRef}
            className={`btn ${confirmStyle === 'danger' ? 'btn-delete' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <><FaHourglassHalf style={{ marginRight: '4px' }} /> Processing...</> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
