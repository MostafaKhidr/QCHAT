import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      icon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseInputStyles = 'block w-full rounded-xl border px-4 py-3 text-base transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const stateStyles = error
      ? 'border-error-300 focus:border-error-500 focus:ring-error-500/20'
      : 'border-gray-300 focus:border-sa-500 focus:ring-sa-500/20';

    const iconPadding = icon ? 'pl-11' : '';

    const inputClassName = `${baseInputStyles} ${stateStyles} ${iconPadding} ${className}`;
    const containerClassName = fullWidth ? 'w-full' : '';

    return (
      <div className={containerClassName}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            className={inputClassName}
            disabled={disabled}
            {...props}
          />

          {error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-error-500">
              <AlertCircle size={20} />
            </div>
          )}
        </div>

        {error && (
          <p className="mt-2 text-sm text-error-600 flex items-center gap-1">
            <AlertCircle size={16} />
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="mt-2 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
