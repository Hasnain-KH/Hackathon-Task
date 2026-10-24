import { useEffect } from 'react';
import Button from './Button.jsx';

export default function Modal({ title, children, onClose, onConfirm, confirmLabel = 'Save', loading = false, danger = false }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [loading, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !loading) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="modal-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="modal-title" className="text-xl font-bold text-ink">{title}</h2>
        <div className="mt-5">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" type="button" disabled={loading} onClick={onClose}>Cancel</Button>
          {onConfirm && <Button variant={danger ? 'danger' : 'primary'} type="button" disabled={loading} onClick={onConfirm}>{loading ? 'Please wait…' : confirmLabel}</Button>}
        </div>
      </section>
    </div>
  );
}
