import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'dark' | 'gradient';
  hover?: boolean;
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'glass', hover = false, className = '', children, ...props }, ref) => {
    const baseStyles = 'rounded-xl overflow-hidden transition-all duration-300';

    const variantStyles = {
      glass: 'bg-dark-800/40 backdrop-blur-xl border border-dark-700/50 hover:border-neon-blue/30',
      dark: 'bg-dark-800 border border-dark-700',
      gradient: 'bg-gradient-to-br from-dark-800 to-dark-900 border border-dark-700',
    };

    const hoverStyles = hover ? 'hover:shadow-lg hover:shadow-neon-blue/20' : '';

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${hoverStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`px-6 py-4 border-b border-dark-700/50 ${className}`} {...props}>
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`px-6 py-4 ${className}`} {...props}>
      {children}
    </div>
  )
);

CardBody.displayName = 'CardBody';

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`px-6 py-4 border-t border-dark-700/50 ${className}`} {...props}>
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';
