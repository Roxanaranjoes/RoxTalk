import React from "react";
import { Button } from "./Button";

export interface ModalProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  onCancel: () => void;
  onSave: () => void;
  isSaving?: boolean;
  isSaveDisabled?: boolean;
  isCancelDisabled?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  hideCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  title,
  description,
  children,
  onClose,
  onCancel,
  onSave,
  isSaving = false,
  isSaveDisabled = false,
  isCancelDisabled = false,
  saveLabel = "Guardar",
  cancelLabel = "Cancelar",
  hideCloseButton = false
}) => {
  const shouldShowCancel = Boolean(cancelLabel && cancelLabel.trim().length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/55 px-4 py-8 backdrop-blur"
      role="dialog"
      aria-modal="true"
    >
      <div
        role="presentation"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl rounded-3xl border border-sky-200/60 bg-gradient-to-br from-white/95 via-[#f7f1ff]/90 to-[#e7f6ff]/85 px-8 py-8 text-[var(--rt-foreground)] shadow-2xl shadow-[rgba(147,170,204,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{title}</h2>
            {description ? <p className="mt-2 text-sm text-[#6f7a9c]">{description}</p> : null}
          </div>
          {hideCloseButton ? null : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-transparent p-2 text-[#7a809c] transition hover:border-[#cfd8f6] hover:bg-white/70 hover:text-[#2f2a4a]"
              aria-label="Cerrar modal"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          )}
        </div>
        <div className="mt-6 space-y-5 text-sm text-[#4b5375]">
          {children}
        </div>
        <div className="mt-8 flex justify-end gap-3">
          {shouldShowCancel ? (
            <Button variant="ghost" onClick={onCancel} disabled={isCancelDisabled}>
              {cancelLabel}
            </Button>
          ) : null}
          <Button
            variant="primary"
            onClick={onSave}
            isLoading={isSaving}
            disabled={isSaveDisabled}
          >
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
