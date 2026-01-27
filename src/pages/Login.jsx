import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { auth } from '../firebase'; // 파이어베이스 인증 도구 가져오기
import { signInWithEmailAndPassword } from 'firebase/auth';

const Input = ({ label, type = "text", placeholder, value, onChange }) => (
  <div className="mb-5">
    <label className="block text-slate-500 text-xs mb-2 font-bold uppercase tracking-wider">{label}</label>
    <input 
      type={type} 
      value={value}
      onChange={onChange}
      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 transition-all placeholder-slate-400 font-medium shadow-sm"
      placeholder={placeholder}
    />
  </div>
);

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) return alert("이메일과 비밀번호를 입력해주세요.");
    
    try {
      // 파이어베이스 서버에 로그인 요청
      await signInWithEmailAndPassword(auth, email, password);
      
      // 성공하면 대시보드로 이동
      navigate('/dashboard');
    } catch (error) {
      console.error("로그인 에러:", error);
      if (error.code === 'auth/invalid-credential') {
        alert("아이디(이메일) 또는 비밀번호가 틀렸습니다.");
      } else {
        alert("로그인 중 문제가 발생했습니다: " + error.message);
      }
    }
  };

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
        {/* 이메일 입력 (파이어베이스는 이메일 아이디를 사용합니다) */}
        <Input 
          label="Email ID" 
          placeholder="가입하신 이메일 입력" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input 
          label="Password" 
          type="password" 
          placeholder="비밀번호 입력" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="pt-2">
            <button 
              onClick={handleLogin}
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