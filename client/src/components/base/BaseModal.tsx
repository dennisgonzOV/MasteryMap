import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FullscreenLoader } from "@/components/ui/loading-spinner";
import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";

/**
 * Base modal component to eliminate duplication across modal implementations
 */

export interface BaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOutsideClick?: boolean;
  className?: string;
}

export function BaseModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  closeOnOutsideClick = true,
  className
}: BaseModalProps) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-3xl',
    full: 'max-w-full h-full'
  };

  return (
    <Dialog open={open} onOpenChange={closeOnOutsideClick ? onOpenChange : undefined}>
      <DialogContent className={`${sizeClasses[size]} ${className || ''}`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {description && (
            <DialogDescription className="text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="py-4">
          {children}
        </div>

        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Confirmation modal with standardized buttons and actions
 */
export interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'warning';
  isLoading?: boolean;
}

export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false
}: ConfirmationModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'destructive':
        return 'destructive';
      case 'warning':
        return 'outline';
      default:
        return 'default';
    }
  };

  const footer = (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        onClick={handleCancel}
        disabled={isLoading}
      >
        {cancelText}
      </Button>
      <Button
        variant={getVariantClasses() as any}
        onClick={handleConfirm}
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : confirmText}
      </Button>
    </div>
  );

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={footer}
      size="sm"
    >
      {children}
    </BaseModal>
  );
}

/**
 * Form modal with standardized form handling
 */
export interface FormModalProps<T = any> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit: (data: T) => void | Promise<void>;
  onCancel?: () => void;
  submitText?: string;
  cancelText?: string;
  isSubmitting?: boolean;
  isValid?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function FormModal<T = any>({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  onCancel,
  submitText = 'Save',
  cancelText = 'Cancel',
  isSubmitting = false,
  isValid = true,
  size = 'md'
}: FormModalProps<T>) {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  const footer = (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        onClick={handleCancel}
        disabled={isSubmitting}
      >
        {cancelText}
      </Button>
      <Button
        type="submit"
        disabled={isSubmitting || !isValid}
        form="modal-form"
      >
        {isSubmitting ? 'Saving...' : submitText}
      </Button>
    </div>
  );

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={footer}
      size={size}
      closeOnOutsideClick={!isSubmitting}
    >
      <form
        id="modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const data = Object.fromEntries(formData.entries()) as T;
          onSubmit(data);
        }}
      >
        {children}
      </form>
    </BaseModal>
  );
}

/**
 * Loading modal for async operations
 */
export interface LoadingModalProps {
  open: boolean;
  title?: string;
  message?: string;
}

export function LoadingModal({
  open,
  title = 'Processing',
  message = 'Please wait while we process your request...'
}: LoadingModalProps) {
  return (
    <BaseModal
      open={open}
      onOpenChange={() => {}} // Cannot close loading modal
      title={title}
      size="sm"
      showCloseButton={false}
      closeOnOutsideClick={false}
    >
      <div className="flex flex-col items-center space-y-4 py-6">
        <FullscreenLoader text="" />
        <p className="text-sm text-muted-foreground text-center">{message}</p>
      </div>
    </BaseModal>
  );
}

/**
 * Alert modal for notifications and messages
 */
export interface AlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onClose?: () => void;
}

export function AlertModal({
  open,
  onOpenChange,
  title,
  message,
  type = 'info',
  onClose
}: AlertModalProps) {
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
    onOpenChange(false);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getAlertClass = () => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const footer = (
    <Button onClick={handleClose} className="w-full">
      OK
    </Button>
  );

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={footer}
      size="sm"
    >
      <Alert className={getAlertClass()}>
        {getIcon()}
        <AlertDescription className="ml-2">
          {message}
        </AlertDescription>
      </Alert>
    </BaseModal>
  );
}