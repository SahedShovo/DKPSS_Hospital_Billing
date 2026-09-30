import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = '', children, ...props }, ref) => {
    return (
      <div>
        {label && <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>}
        <select
          ref={ref}
          className={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'focus:border-teal-600 focus:ring-teal-600'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';