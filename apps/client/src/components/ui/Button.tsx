import React, { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success' | 'warning' | 'purple';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center transition-all font-bold rounded-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';
    
    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20',
      secondary: 'bg-gray-800 hover:bg-gray-700 text-white',
      danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200',
      success: 'bg-green-600 hover:bg-green-700 text-white shadow-lg',
      warning: 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg',
      purple: 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200',
      outline: 'bg-white border-2 border-gray-100 hover:bg-gray-50 text-gray-800 shadow-sm',
      ghost: 'text-gray-400 hover:bg-gray-800 hover:text-white',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3',
      xl: 'px-8 py-4 text-lg',
    };

    const variantStyles = variants[variant] || variants.primary;
    const sizeStyles = sizes[size] || sizes.md;

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{children}</span>
          </div>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
