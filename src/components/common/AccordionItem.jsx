import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const AccordionItem = ({ icon: Icon, title, children, isOpen: defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white mb-3 shadow-sm transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg transition-colors ${isOpen ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
             <Icon size={18} />
          </div>
          <span className={`font-bold text-sm ${isOpen ? 'text-slate-900' : 'text-slate-600'}`}>{title}</span>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-5 pt-0 text-sm text-slate-600 bg-white leading-relaxed border-t border-slate-50 animate-fade-in">
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccordionItem;