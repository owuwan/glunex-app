import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Layout, Home, Users, Settings, User, Menu, X, Bell, Search, Sun, LogOut 
} from 'lucide-react';

/**
 * ResponsiveLayout: 모바일과 PC의 '입구'를 완전히 분리합니다.
 * JS 상태값 대신 CSS(Tailwind) 반응형 클래스를 사용하여 렌더링 지연이나 오류를 방지합니다.
 */
const ResponsiveLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: '/', label: '대시보드', icon: Home },
    { id: '/sales', label: '영업 관리', icon: Layout },
    { id: '/marketing', label: '마케팅', icon: Users },
    { id: '/admin', label: '설정', icon: Settings },
  ];

  const activeId = location.pathname;

  return (
    <div className="min-h-screen w-full bg-slate-50 font-noto">
      
      {/* ==========================================
          1. PC 전용 레이아웃 (768px 이상에서만 보임)
      ========================================== */}
      <div className="hidden md:flex h-screen overflow-hidden">
        {/* PC 사이드바 */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-8 flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
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
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3 p-2">
              <div className="w-10 h-10 rounded-full bg-slate-300 overflow-hidden border-2 border-white shadow-sm">
                <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" alt="Admin" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate text-slate-900">관리자님</p>
                <button className="text-[10px] text-rose-500 font-bold uppercase hover:underline">Sign Out</button>
              </div>
            </div>
          </div>
        </aside>

        {/* PC 메인 영역 */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* PC 상단바 */}
          <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0">
            <div className="relative w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="관리자 모드 검색..." 
                className="w-full pl-12 pr-4 py-2.5 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium" 
              />
            </div>
            <div className="flex items-center gap-4">
               <div className="text-right mr-4">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">System Status</p>
                 <p className="text-sm font-bold text-emerald-500 flex items-center gap-1 justify-end">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                 </p>
               </div>
               <button className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl relative transition-colors">
                 <Bell size={22} />
                 <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
               </button>
            </div>
          </header>

          {/* PC 컨텐츠 스크롤 영역 */}
          <main className="flex-1 overflow-y-auto p-10 bg-[#FBFBFC]">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* ==========================================
          2. 모바일 전용 레이아웃 (768px 미만에서만 보임)
      ========================================== */}
      <div className="md:hidden flex flex-col min-h-screen bg-[#F8F9FB]">
        {/* 모바일은 기존의 children(모바일용 Dashboard 등)을 그대로 노출합니다. */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>

    </div>
  );
};

export default ResponsiveLayout;