'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ==========================================
// LOADING SKELETON
// ==========================================

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'title' | 'card' | 'circle';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className = '', variant = 'text', width, height }: SkeletonProps) {
  const baseClass = 'skeleton';
  const variantClass = variant === 'title' ? 'skeleton-title'
    : variant === 'card' ? 'skeleton-card'
    : variant === 'circle' ? 'rounded-full'
    : 'skeleton-text';

  return (
    <div
      className={`${baseClass} ${variantClass} ${className}`}
      style={{
        width: width || (variant === 'circle' ? '40px' : '100%'),
        height: height || (variant === 'circle' ? '40px' : undefined),
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card">
      <Skeleton variant="title" className="mb-4" />
      <Skeleton className="mb-2" />
      <Skeleton className="mb-2" width="80%" />
      <Skeleton width="60%" />
    </div>
  );
}

// ==========================================
// TREND BADGE
// ==========================================

export interface TrendBadgeProps {
  value: number;
  suffix?: string;
  showArrow?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function TrendBadge({ value, suffix = '%', showArrow = true, size = 'md' }: TrendBadgeProps) {
  const trend = value > 0 ? 'up' : value < 0 ? 'down' : 'stable';
  const trendClass = trend === 'up' ? 'trend-badge-up'
    : trend === 'down' ? 'trend-badge-down'
    : 'trend-badge-stable';

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-1'
    : size === 'lg' ? 'text-base px-4 py-2'
    : 'text-sm px-3 py-1';

  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;

  return (
    <span className={`trend-badge ${trendClass} ${sizeClass}`}>
      {showArrow && (
        trend === 'up' ? <TrendingUp size={iconSize} />
        : trend === 'down' ? <TrendingDown size={iconSize} />
        : <Minus size={iconSize} />
      )}
      {value > 0 ? '+' : ''}{value.toFixed(1)}{suffix}
    </span>
  );
}

// ==========================================
// CONFIDENCE BAR
// ==========================================

export interface ConfidenceBarProps {
  level: 'low' | 'medium' | 'high';
  showLabel?: boolean;
}

export function ConfidenceBar({ level, showLabel = true }: ConfidenceBarProps) {
  const segments = 3;
  const activeSegments = level === 'high' ? 3 : level === 'medium' ? 2 : 1;

  return (
    <div className="flex items-center gap-2">
      <div className="confidence-bar">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`confidence-bar-segment ${i < activeSegments ? `active ${level}` : ''}`}
          />
        ))}
      </div>
      {showLabel && (
        <span
          className="text-xs capitalize"
          style={{
            color: level === 'high' ? 'var(--positive)'
              : level === 'medium' ? 'var(--warning)'
              : 'var(--negative)'
          }}
        >
          {level}
        </span>
      )}
    </div>
  );
}

// ==========================================
// STAT CARD (Simple version)
// ==========================================

export interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: number;
  icon?: React.ReactNode;
  highlight?: boolean;
}

export function StatCard({ label, value, subValue, trend, icon, highlight = false }: StatCardProps) {
  return (
    <div className={`stat-card ${highlight ? 'ring-2 ring-[var(--accent)]' : ''}`}>
      <p className="stat-label flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="stat-value" style={highlight ? { color: 'var(--accent)' } : undefined}>
        {value}
      </p>
      {(subValue || trend !== undefined) && (
        <div className="flex items-center gap-2 mt-1">
          {subValue && (
            <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
              {subValue}
            </p>
          )}
          {trend !== undefined && <TrendBadge value={trend} size="sm" />}
        </div>
      )}
    </div>
  );
}

// ==========================================
// TOAST (Basic implementation)
// ==========================================

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning';
  onClose?: () => void;
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  const typeClass = type === 'success' ? 'toast-success'
    : type === 'error' ? 'toast-error'
    : 'toast-warning';

  return (
    <div className={`toast ${typeClass}`} onClick={onClose}>
      <p style={{ color: 'var(--foreground)' }}>{message}</p>
    </div>
  );
}

// ==========================================
// EMPTY STATE
// ==========================================

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card text-center py-12">
      <div className="mx-auto mb-4" style={{ color: 'var(--foreground-muted)' }}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      {description && (
        <p className="mb-6" style={{ color: 'var(--foreground-secondary)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
          {description}
        </p>
      )}
      {action && (
        <button className="btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

// ==========================================
// ACTION BUTTONS
// ==========================================

export interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  children: React.ReactNode;
}

export function ActionButton({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ActionButtonProps) {
  const variantClass = variant === 'primary' ? 'btn-primary'
    : variant === 'secondary' ? 'btn-secondary'
    : variant === 'ghost' ? 'btn-ghost'
    : 'btn-danger';

  const sizeClass = size === 'sm' ? 'text-sm px-3 py-2'
    : size === 'lg' ? 'text-lg px-6 py-4'
    : '';

  return (
    <button
      className={`${variantClass} ${sizeClass} flex items-center justify-center gap-2 ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon}
      {children}
    </button>
  );
}
