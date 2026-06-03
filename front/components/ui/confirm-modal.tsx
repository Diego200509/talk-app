"use client";

import { TALK_BTN_SECONDARY } from "@/components/chat/chat-shell.helpers";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmVariant = "primary",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  const confirmClass =
    confirmVariant === "danger"
      ? "bg-rose-600 hover:bg-rose-500"
      : "bg-violet-600 hover:bg-violet-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--talk-modal-overlay)] p-4 backdrop-blur-[2px]">
      <div
        className="w-full max-w-sm rounded-2xl border border-[var(--talk-border)] bg-[var(--talk-modal-bg)] p-4 shadow-[var(--talk-popover-shadow)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <h3 id="confirm-modal-title" className="text-base font-semibold text-[var(--talk-text)]">
          {title}
        </h3>
        {description ? (
          <p className="mt-2 text-sm text-[var(--talk-muted)]">{description}</p>
        ) : null}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onCancel} className={TALK_BTN_SECONDARY}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex h-9 items-center rounded-md px-3 text-sm font-semibold text-white transition ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
