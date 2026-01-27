import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';

const Input = ({ label, type = "text", placeholder }) => (
  <div className="mb-5">
    <label className="block text-slate-500 text-xs mb-2 font-bold uppercase tracking-wider">{label}</label>
    <input 
      type={type} 
      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 transition-all placeholder-slate-400 font-medium shadow-sm"
      placeholder={placeholder}
    />
  </div>
);

const Login = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full justify-center px-8 animate-fade-in bg-white">
      <div className="flex flex-col items-center mb-12">
        <div className="relative mb-6">
          <div className="w-24 h-24 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-900/30 rotate-3">
            <Crown size={40} className="text-amber-400" strokeWidth={1.5} />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-md">
             <span className="text-[10px] font-bold text-slate-900 tracking-widest">PRO</span>
          </div>
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-1">GLUNEX</h1>
        <p className="text-slate-500 text-sm font-medium tracking-wide">Global Luxury Warranty Nexus</p>
      </div>

      <div className="space-y-4 w-full max-w-sm mx-auto">
        <Input label="ID" placeholder="아이디 입력" />
        <Input label="Password" type="password" placeholder="비밀번호 입력" />
        <div className="pt-2">
            <button 
              onClick={() => navigate('/dashboard')}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95"
            >
              로그인
            </button>
        </div>
        <button 
          onClick={() => navigate('/register')}
          className="w-full py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all active:scale-95"
        >
          무료 회원가입
        </button>
      </div>
      
      <div className="mt-10 text-center">
        <p className="text-xs text-slate-300 font-medium">Powered by GLUNEX Platform</p>
      </div>
    </div>
  );
};

export default Login;