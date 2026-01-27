import React from 'react';

const Input = ({ label, type = "text", placeholder, value, onChange }) => (
  <div className="mb-5">
    <label className="block text-slate-500 text-xs mb-2 font-bold uppercase tracking-wider">{label}</label>
    <input 
      type={type} 
      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 transition-all placeholder-slate-400 font-medium shadow-sm"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  </div>
);

export default Input;