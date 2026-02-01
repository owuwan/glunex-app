import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Layout, Home, Users, Settings, User, Menu, X, Bell, Search, Sun, LogOut 
} from 'lucide-react';

/**
 * ResponsiveLayout: 모바일과 PC의 '입구'를 분리합니다.
 * 기존 모바일 코드는 그대로 두고, PC(md 이상)일 때만 새로운 레이아웃을 보여줍니다.
 */
const ResponsiveLayout = ({ children }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  const location = useLocation();

  // 화면 크기 변화 감지
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { id: '/', label: '대시보드', icon: Home },
    { id: '/sales', label: '영업 관리', icon: Layout },
    { id: '/marketing', label: '마케팅', icon: Users },
    { id: '/admin', label: '설정', icon: Settings },
  ];

  const activeId = location.pathname;

  // 1. 모바일 뷰: 기존에 쓰시던 모바일 틀을 거의 그대로 유지하거나 최소한으로 노출
  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
        {/* 모바일 컨텐츠 영역 (기존 코드와 충돌 없도록 단순 렌더링) */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    );
  }

  // 2. PC 뷰: 여기서부터 우리가 새롭게 하나씩 채워갈 PC 전용 레이아웃입니다.
  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans overflow-hidden">
      {/* PC 사이드바 */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Layout size={24} />
          </div>
          <span className="font-extrabold text-2xl tracking-tighter">GLUNEX PC</span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all ${
                activeId === item.id 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-300 overflow-hidden">
              <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" alt="Admin" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">관리자님</p>
              <button className="text-[10px] text-rose-500 font-bold uppercase hover:underline">Sign Out</button>
            </div>
          </div>
        </div>
      </aside>

      {/* PC 메인 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* PC 상단바 */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="PC 모드 검색..." 
              className="w-full pl-12 pr-4 py-2.5 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none" 
            />
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right mr-4">
               <p className="text-[10px] text-slate-400 font-bold uppercase">System Status</p>
               <p className="text-sm font-bold text-emerald-500 flex items-center gap-1 justify-end">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
               </p>
             </div>
             <button className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl relative">
               <Bell size={22} />
               <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
             </button>
          </div>
        </header>

        {/* 페이지 내용 */}
        <main className="flex-1 overflow-y-auto p-10">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ResponsiveLayout;