import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-200 mb-2">
            {label}
            {props.required && <span className="text-neon-pink ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && <div className="absolute left-3 top-3 text-gray-400">{icon}</div>}
          <input
            ref={ref}
            className={`
              w-full px-4 py-2.5 rounded-lg
              bg-dark-800/50 border border-dark-700
              text-white placeholder-gray-400
              transition-all duration-200
              focus:outline-none focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/20
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? 'pl-10' : ''}
              ${error ? 'border-neon-pink focus:border-neon-pink focus:ring-neon-pink/20' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="text-neon-pink text-sm mt-2">{error}</p>}
        {helperText && !error && <p className="text-gray-400 text-sm mt-2">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
