import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider ml-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-5 py-4 rounded-2xl border-2 border-gray-100 focus:border-blue-500 outline-none transition-all font-medium text-lg bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-red-500 focus:border-red-500' : ''
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="text-sm font-bold text-red-500 ml-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

export const TextArea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider ml-1">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full px-5 py-4 rounded-2xl border-2 border-gray-100 focus:border-blue-500 outline-none transition-all font-medium text-lg bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-red-500 focus:border-red-500' : ''
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="text-sm font-bold text-red-500 ml-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
