import React from 'react';

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "w-full py-4 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 text-sm tracking-wide";
  const variants = {
    primary: "bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm",
    gold: "bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 text-amber-950 shadow-lg shadow-amber-500/20 hover:brightness-110",
    outline: "border border-slate-300 text-slate-600 hover:bg-slate-50",
    disabled: "bg-gray-200 text-gray-400 cursor-not-allowed active:scale-100 shadow-none"
  };
  
  return (
    <button 
      onClick={disabled ? null : onClick} 
      className={`${baseStyle} ${disabled ? variants.disabled : variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;