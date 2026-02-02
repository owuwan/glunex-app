import React, { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithCustomToken, 
  signInAnonymously 
} from 'firebase/auth';
import { 
  initializeFirestore, 
  collection, 
  onSnapshot,
  terminate
} from 'firebase/firestore';
import { 
  Megaphone, 
  MessageSquare, 
  Sparkles, 
  BarChart, 
  Plus, 
  ChevronRight, 
  Instagram, 
  Send,
  Target,
  Zap,
  AlertCircle,
  Loader2,
  RefreshCcw
} from 'lucide-react';

/**
 * PC 전용 Marketing 페이지
 * 파일 경로: src/pages/pc/Marketing.jsx
 */

// --- Firebase 초기화 및 통신 설정 최적화 ---
const getFirebaseInstance = () => {
  try {
    const configStr = window.__firebase_config || (typeof __firebase_config !== 'undefined' ? __firebase_config : null);
    
    if (!configStr) return { auth: null, db: null, error: "Firebase Configuration missing" };

    const firebaseConfig = typeof configStr === 'string' ? JSON.parse(configStr) : configStr;
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    
    // [중요] Fetch API/CORS 오류 해결을 위해 experimentalForceLongPolling 설정 추가
    const db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      useFetchStreams: false
    });

    return {
      auth: getAuth(app),
      db: db,
      error: null
    };
  } catch (e) {
    console.error("Firebase Init Error:", e);
    return { auth: null, db: null, error: e.message };
  }
};

const { auth, db, error: initError } = getFirebaseInstance();
const appId = window.__app_id || (typeof __app_id !== 'undefined' ? __app_id : 'glunex-app');

const Marketing = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState(initError);

  // --- 기존 데이터셋 (디자인 유지) ---
  const marketingStats = [
    { label: '이번 달 발송 메시지', value: '1,250 / 5,000', icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'AI 포스팅 생성', value: '42건', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: '평균 클릭률(CTR)', value: '4.8%', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: '마케팅 전환 매출', value: '₩3,420,000', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const aiAgents = [
    { name: '네이버 블로그 에이전트', status: '활성', lastWork: '2시간 전', count: '12회' },
    { name: '인스타그램 피드 에이전트', status: '대기', lastWork: '어제', count: '28회' },
    { name: '카카오 알림톡 에이전트', status: '활성', lastWork: '15분 전', count: '154회' },
  ];

  const recentCampaigns = [
    { name: '설 연휴 감사 문자', target: '전체 고객', perf: '85% 발송', date: '2026.01.28' },
    { name: '신차 패키지 프로모션', target: '미방문 3개월', perf: '12% 클릭', date: '2026.01.20' },
    { name: '겨울철 관리 팁 가이드', target: '코팅 고객', perf: '95% 발송', date: '2026.01.15' },
    { name: '리뷰 작성 리워드 알림', target: '최근 시공', perf: '22건 작성', date: '2026.01.10' },
  ];

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const token = window.__initial_auth_token || (typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null);
        if (token) {
          await signInWithCustomToken(auth, token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.warn("Auth check failed, proceeding as guest.");
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 상단 안내바 (데이터 연결 상태 표시) */}
      {firebaseError ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800 text-sm">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
          <p>현재 실시간 연결이 제한되어 오프라인 모드로 표시됩니다. (설정 확인 필요)</p>
        </div>
      ) : (
        !user && !loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3 text-blue-800 text-sm">
            <Loader2 size={18} className="text-blue-600 animate-spin" />
            <p>데이터 보안 연결을 구성 중입니다...</p>
          </div>
        )
      )}

      {/* 1. 페이지 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">마케팅 센터</h1>
          <p className="text-slate-500 mt-1">AI 에이전트를 활용하여 고객 재방문을 유도하고 브랜딩을 강화하세요.</p>
        </div>
        <button className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
          <Plus size={20} /> 새 캠페인 만들기
        </button>
      </div>

      {/* 2. 마케팅 지표 섹션 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {marketingStats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-3">
              <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon size={20} />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
            </div>
            <h3 className="text-2xl font-black text-slate-900">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* 3. 하단 컨텐츠 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-full">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Sparkles size={20} className="text-purple-600" /> 운영 중인 AI 에이전트
            </h2>
            <div className="space-y-4">
              {aiAgents.map((agent, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 font-bold text-indigo-600 text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{agent.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">최근 작업: {agent.lastWork}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${agent.status === '활성' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                      {agent.status}
                    </span>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">누적 {agent.count}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-bold">최근 캠페인 이력</h2>
            <button className="text-indigo-600 text-sm font-bold flex items-center gap-1 hover:underline">
              자세히 보기 <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">캠페인명</th>
                  <th className="px-6 py-4">대상</th>
                  <th className="px-6 py-4">성과</th>
                  <th className="px-6 py-4">일자</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentCampaigns.map((camp, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                    <td className="px-6 py-4 font-bold text-slate-900 text-sm">{camp.name}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">{camp.target}</td>
                    <td className="px-6 py-4 text-xs font-black text-indigo-600">{camp.perf}</td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-medium">{camp.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="text-right pt-4">
        <span className="text-[10px] text-slate-300 font-mono">
          UID: {user?.uid || 'Guest Mode'} | API: {appId}
        </span>
      </div>
    </div>
  );
};

export default Marketing;