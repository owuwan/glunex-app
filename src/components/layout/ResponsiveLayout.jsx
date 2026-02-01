import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Layout, Home, Users, Settings, Plus, Sparkles, MessageCircle, LogOut, ShieldCheck, Crown, User
} from 'lucide-react';
// 파이어베이스 연동 및 데이터 조회를 위한 임포트
// 경로 오류를 방지하기 위해 파일 구조(src/components/layout/...)에 맞춘 상대 경로를 재확인합니다.
import { auth, db } from '../../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

/**
 * ResponsiveLayout: PC와 모바일의 디자인을 물리적으로 분리합니다.
 * 실제 파이어베이스 데이터를 연결하여 사용자 프로필 정보를 실시간으로 반영합니다.
 */
const ResponsiveLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  
  // 실제 사용자 데이터를 담을 상태 (더미 데이터 제거)
  const [userData, setUserData] = useState({ 
    storeName: '연동 중...', 
    userStatus: 'free',
    loading: true 
  });

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);

    // [데이터 연결] 인증 상태 감시 및 실시간 Firestore 데이터 구독
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 사용자의 개별 문서 경로(/users/{userId})에서 정보를 실시간으로 수신합니다.
        const userRef = doc(db, "users", user.uid);
        const unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData({
              ...docSnap.data(),
              loading: false
            });
          } else {
            setUserData({ storeName: '정보 없음', userStatus: 'free', loading: false });
          }
        }, (error) => {
          console.error("사용자 정보 구독 오류:", error);
          setUserData(prev => ({ ...prev, loading: false }));
        });

        return () => unsubscribeDoc();
      } else {
        setUserData({ storeName: '로그인 필요', userStatus: 'free', loading: false });
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribeAuth();
    };
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
    { id: '/sales', label: '우리매장 고객리스트', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
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
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <ShieldCheck size={24} />
            </div>
            <span className="font-black text-2xl tracking-tighter text-slate-900 italic">GLUNEX <span className="text-indigo-600 not-italic font-bold">PC</span></span>
          </div>

          <div className="flex-1 px-4 flex flex-col gap-8">
            <nav className="space-y-1">
              <p className="px-5 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">메인 메뉴</p>
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-bold text-sm transition-all ${
                    location.pathname === item.id 
                    ? 'bg-slate-900 text-white shadow-lg shadow-indigo-200' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </nav>

            <nav className="space-y-1">
              <p className="px-5 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">주요 서비스</p>
              {quickServices.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50 transition-all group ${
                    location.pathname === item.id && item.id !== '/sales' ? 'bg-slate-100 text-indigo-600' : ''
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

          {/* 실제 앱 데이터가 연동된 프로필 섹션 */}
          <div className="p-6 mt-auto border-t border-slate-100 bg-slate-50/30">
            <div className="flex items-center gap-3 p-2">
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-indigo-600 shrink-0 overflow-hidden">
                {userData.userStatus === 'premium' ? <Crown size={18} fill="currentColor" className="text-amber-500" /> : <User size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tighter">
                  {userData.loading ? '연동 중...' : userData.storeName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                    userData.userStatus === 'premium' 
                    ? 'bg-amber-100 text-amber-600 border border-amber-200' 
                    : 'bg-slate-200 text-slate-500'
                  }`}>
                    {userData.userStatus === 'premium' ? 'PREMIUM' : 'FREE'}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full mt-4 py-2 flex items-center justify-center gap-2 text-rose-500 text-[10px] font-black uppercase hover:bg-rose-50 rounded-lg transition-all border border-transparent hover:border-rose-100"
            >
              <LogOut size={12} /> 로그아웃 (Sign Out)
            </button>
          </div>
        </aside>

        {/* PC 메인 컨텐츠 영역 (좌우 여백 없이 전체 화면 활용) */}
        <main className="flex-1 overflow-y-auto bg-[#FBFBFC] flex flex-col relative z-10">
          <div className="w-full p-4 lg:p-8">
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