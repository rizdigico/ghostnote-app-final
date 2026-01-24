import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
  spinnerClass?: string; // Optional class for the spinner (e.g., text-yellow-400)
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading = false, 
  className = '', 
  disabled,
  spinnerClass = 'text-current',
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md px-6 py-4 text-sm font-bold tracking-wide uppercase transition-all duration-75 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-accent hover:bg-white text-black focus:ring-accent shadow-[0_0_15px_-3px_rgba(217,249,157,0.3)]",
    secondary: "bg-surface hover:bg-border text-textMain border border-border focus:ring-textMuted",
    ghost: "bg-transparent hover:text-white text-textMuted",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className={`animate-spin h-4 w-4 ${spinnerClass}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          PROCESSING
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;