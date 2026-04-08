import React from "react";
import { useTranslation } from "react-i18next";
import Button from "./Button";
import Input from "./Input";
import { Modal } from "./Modal";

interface PromptDialogProps {
  title: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel?: string;
  placeholder?: string;
  description?: string;
  error?: string;
}

export const PromptDialog: React.FC<PromptDialogProps> = ({
  title,
  label,
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  placeholder,
  description,
  error,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      title={title}
      description={description}
      onClose={onCancel}
      footer={
        <div className="flex w-full justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={onSubmit}>
            {submitLabel ?? t("common.save")}
          </Button>
        </div>
      }
    >
      <Input
        label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        error={error}
        autoFocus
      />
    </Modal>
  );
};
