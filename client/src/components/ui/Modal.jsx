import { useEffect, useRef } from 'react';
import Button from './Button.jsx';

export default function Modal({ title, children, onClose, onConfirm, confirmLabel = 'Save', loading = false, danger = false, confirmDisabled = false }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const loadingRef = useRef(loading);
  onCloseRef.current = onClose;
  loadingRef.current = loading;
  useEffect(() => {
    const previousFocus = document.activeElement;
    const focusable = () => [...(dialogRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]') || [])];
    focusable()[0]?.focus();
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !loadingRef.current) onCloseRef.current();
      if (event.key === 'Tab') {
        const elements = focusable();
        if (!elements.length) return;
        const focusOutside = !dialogRef.current?.contains(document.activeElement);
        if (focusOutside) {
          event.preventDefault();
          (event.shiftKey ? elements.at(-1) : elements[0]).focus();
        } else if (event.shiftKey && document.activeElement === elements[0]) {
          event.preventDefault();
          elements.at(-1).focus();
        } else if (!event.shiftKey && document.activeElement === elements.at(-1)) {
          event.preventDefault();
          elements[0].focus();
        }
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      previousFocus?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !loading) onClose();
    }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="modal-title" className="text-xl font-bold text-ink">{title}</h2>
        <div className="mt-5">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" type="button" disabled={loading} onClick={onClose}>Cancel</Button>
          {onConfirm && <Button variant={danger ? 'danger' : 'primary'} type="button" disabled={loading || confirmDisabled} onClick={onConfirm}>{loading ? 'Please wait…' : confirmLabel}</Button>}
        </div>
      </section>
    </div>
  );
}
