import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Layout, Home, Users, Settings, User, Menu, X, Bell, Search, Sun, LogOut 
} from 'lucide-react';

/**
 * ResponsiveLayout: PC와 모바일의 디자인을 물리적으로 분리합니다.
 * PC 상단바 영역을 완전히 제거하여 콘텐츠가 더 넓게 보이도록 최적화했습니다.
 */
const ResponsiveLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { id: '/', label: '대시보드', icon: Home },
    { id: '/sales', label: '영업 관리', icon: Layout },
    { id: '/marketing', label: '마케팅', icon: Users },
    { id: '/admin', label: '설정', icon: Settings },
  ];

  const activeId = location.pathname;

  // ==========================================
  // 1. PC 전용 레이아웃 (전체 화면 대시보드)
  // ==========================================
  if (isDesktop) {
    return (
      <div className="fixed inset-0 w-full h-full bg-slate-50 font-sans flex overflow-hidden">
        {/* PC 사이드바 */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm">
          <div className="p-8 flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <Layout size={24} />
            </div>
            <span className="font-extrabold text-2xl tracking-tighter text-slate-900">GLUNEX PC</span>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all ${
                  activeId === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3 p-2 text-left">
              <div className="w-10 h-10 rounded-full bg-slate-300 overflow-hidden border-2 border-white shadow-sm shrink-0">
                <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" alt="Admin" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate text-slate-900">관리자님</p>
                <button className="text-[10px] text-rose-500 font-bold uppercase hover:underline">Sign Out</button>
              </div>
            </div>
          </div>
        </aside>

        {/* PC 메인 영역: 상단 헤더 블록을 제거하여 공간을 최대로 확보 */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <main className="flex-1 overflow-y-auto p-10 bg-[#FBFBFC]">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. 모바일 전용 레이아웃
  // ==========================================
  return (
    <div className="bg-gray-100 min-h-screen flex justify-center items-center font-sans overflow-hidden">
      <div className="w-full max-w-md h-[100dvh] bg-white relative overflow-hidden shadow-2xl flex flex-col sm:rounded-[2rem] sm:h-[90dvh] sm:border-8 sm:border-slate-900 ring-4 ring-slate-900/10">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ResponsiveLayout;