import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange' | 'gray';
}

const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'blue', 
  className = '', 
  ...props 
}) => {
  const baseStyles = 'px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center inline-flex';
  
  const variants = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
    gray: 'bg-gray-100 text-gray-700',
  };

  return (
    <span 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
