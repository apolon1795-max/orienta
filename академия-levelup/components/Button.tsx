import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'fantasy';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-lg shadow-purple-900/40 hover:from-purple-600 hover:to-indigo-600 border border-white/10",
    fantasy: "bg-gradient-to-br from-amber-700 to-amber-900 border border-amber-500 text-amber-100 shadow-[0_4px_20px_rgba(245,158,11,0.2)] hover:shadow-[0_4px_25px_rgba(245,158,11,0.4)] hover:scale-105 font-serif tracking-wide",
    secondary: "bg-slate-800 text-slate-200 border border-slate-600 hover:bg-slate-700 hover:border-slate-500 hover:text-white",
    outline: "border-2 border-indigo-500 text-indigo-400 hover:bg-indigo-950/30",
    ghost: "text-slate-400 hover:text-white hover:bg-white/5"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};