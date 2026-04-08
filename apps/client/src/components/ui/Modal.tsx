import React from "react";
import { XCircle } from "lucide-react";
import Button from "./Button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./Card";

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  title,
  children,
  onClose,
  footer,
  description,
  className = "",
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <Card
        variant="elevated"
        className={`w-full max-w-2xl border-none shadow-2xl ${className}`}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-gray-900">{title}</CardTitle>
            {description ? (
              <div className="mt-1 text-sm text-gray-500">{description}</div>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-gray-100"
          >
            <XCircle className="h-6 w-6" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">{children}</CardContent>
        {footer ? <CardFooter>{footer}</CardFooter> : null}
      </Card>
    </div>
  );
};
