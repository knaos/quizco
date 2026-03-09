import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outline' | 'flat';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  variant = 'default', 
  ...props 
}) => {
  const baseStyles = 'rounded-3xl transition-all';
  const variants = {
    default: 'bg-white shadow-sm border border-gray-100',
    elevated: 'bg-white shadow-2xl border border-gray-100',
    outline: 'bg-transparent border-2 border-gray-100',
    flat: 'bg-gray-50 border border-gray-100',
  };

  return (
    <div 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  children, 
  className = '', 
  ...props 
}) => (
  <div className={`p-6 border-b border-gray-100 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ 
  children, 
  className = '', 
  ...props 
}) => (
  <h2 className={`text-xl font-black text-gray-800 uppercase tracking-wider ${className}`} {...props}>
    {children}
  </h2>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  children, 
  className = '', 
  ...props 
}) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  children, 
  className = '', 
  ...props 
}) => (
  <div className={`p-6 bg-gray-50 border-t border-gray-100 ${className}`} {...props}>
    {children}
  </div>
);
