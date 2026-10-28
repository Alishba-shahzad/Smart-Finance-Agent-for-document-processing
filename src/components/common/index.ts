/**
 * Reusable Common UI Components
 * 
 * Directory Structure:
 * - PageHeader: Standard page title, description, and action button bar
 * - EmptyState: Clean illustration / icon and message when collections are empty
 * - LoadingSpinner: Consistent loading indicator with optional label
 * - ConfirmDialog: Generic confirmation modal for destructive operations (e.g., delete)
 * - StatusChip: Generic color-coded chip
 * 
 * Common reusable UI component interfaces.
 */

import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface StatusChipProps {
  label: string;
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  size?: 'small' | 'medium';
}
