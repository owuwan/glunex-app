import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Layout, Home, Users, Settings, Plus, Sparkles, MessageCircle, LogOut 
} from 'lucide-react';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';

/**
 * ResponsiveLayout: PC와 모바일의 디자인을 물리적으로 분리합니다.
 * PC 사이드바에 요청하신 주요 기능들을 상시 노출하여 업무 효율을 높였습니다.
 */
const ResponsiveLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { id: '/', label: '대시보드', icon: Home },
    { id: '/sales', label: '영업 관리', icon: Layout },
    { id: '/marketing', label: '마케팅 센터', icon: Users },
    { id: '/admin', label: '시스템 설정', icon: Settings },
  ];

  const quickServices = [
    { id: '/create', label: '보증서 신규 발행', icon: Plus, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: '/creator', label: 'AI 마케팅 에이전트', icon: Sparkles, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { id: '/marketing', label: '단골 CRM 센터', icon: MessageCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("로그아웃 실패", error);
    }
  };

  if (isDesktop) {
    return (
      <div className="fixed inset-0 w-full h-full bg-slate-50 font-sans flex overflow-hidden">
        {/* PC 전용 사이드바 */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm z-20 overflow-y-auto scrollbar-hide">
          <div className="p-8 flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Layout size={24} />
            </div>
            <span className="font-black text-2xl tracking-tighter text-slate-900 italic">GLUNEX <span className="text-indigo-600 not-italic font-bold">PC</span></span>
          </div>

          <div className="flex-1 px-4 flex flex-col gap-8">
            {/* 기본 네비게이션 */}
            <nav className="space-y-1">
              <p className="px-5 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">메인 메뉴</p>
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-bold text-sm transition-all ${
                    location.pathname === item.id 
                    ? 'bg-slate-900 text-white shadow-lg' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </nav>

            {/* 퀵 서비스 (사이드바 이동 요청 반영) */}
            <nav className="space-y-1">
              <p className="px-5 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">주요 서비스</p>
              {quickServices.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50 transition-all group ${
                    location.pathname === item.id ? 'bg-slate-100 text-indigo-600' : ''
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${item.bg} ${item.color} group-hover:bg-slate-900 group-hover:text-white transition-colors`}>
                    <item.icon size={16} />
                  </div>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* 프로필 및 로그아웃 */}
          <div className="p-6 mt-auto border-t border-slate-100 bg-slate-50/30">
            <div className="flex items-center gap-3 p-2">
              <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-slate-400 font-bold uppercase italic overflow-hidden">
                <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" alt="Admin" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-900 truncate uppercase">관리자 스튜디오</p>
                <button 
                  onClick={handleLogout}
                  className="text-[10px] text-rose-500 font-bold uppercase hover:underline flex items-center gap-1 mt-0.5"
                >
                  <LogOut size={10} /> 로그아웃
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* PC 메인 영역 (좌우 여백 제거) */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#FBFBFC] flex flex-col relative z-10">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen flex justify-center items-center font-sans overflow-hidden">
      <div className="w-full max-w-md h-[100dvh] bg-white relative overflow-hidden shadow-2xl flex flex-col sm:rounded-[2rem] sm:h-[90dvh] sm:border-8 sm:border-slate-900 ring-4 ring-slate-900/10">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default ResponsiveLayout;