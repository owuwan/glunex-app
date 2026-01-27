import React from 'react';

const Input = ({ label, type = "text", placeholder, value, onChange, readOnly }) => (
  <div className="mb-5">
    <label className="block text-slate-500 text-xs mb-2 font-bold uppercase tracking-wider">{label}</label>
    <input 
      type={type} 
      className={`w-full border border-slate-200 rounded-xl p-4 text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 transition-all placeholder-slate-400 font-medium shadow-sm ${readOnly ? 'bg-slate-100 cursor-not-allowed' : 'bg-slate-50'}`}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
    />
  </div>
);

export default Input;