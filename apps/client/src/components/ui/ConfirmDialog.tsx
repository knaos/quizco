import React from "react";
import { useTranslation } from "react-i18next";
import Button from "./Button";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmVariant?: "primary" | "danger" | "success" | "warning";
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  confirmVariant = "danger",
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <div className="flex w-full justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            {cancelLabel ?? t("common.cancel")}
          </Button>
          <Button type="button" variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel ?? t("common.confirm")}
          </Button>
        </div>
      }
    >
      <p className="text-lg font-medium text-gray-700">{message}</p>
    </Modal>
  );
};
