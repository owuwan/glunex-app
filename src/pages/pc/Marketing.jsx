import React, { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithCustomToken, 
  signInAnonymously 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot 
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

// --- 전역 변수 안전 체크 (ReferenceError 방지) ---
const getSafeFirebaseConfig = () => {
  try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      return JSON.parse(__firebase_config);
    }
  } catch (e) {
    console.error("Firebase Config Parsing Error:", e);
  }
  return null;
};

const firebaseConfig = getSafeFirebaseConfig();
const appId = typeof __app_id !== 'undefined' ? __app_id : 'glunex-marketing-default';

// Firebase 서비스 초기화 지연
let auth = null;
let db = null;

if (firebaseConfig) {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
}

const App = () => {
  // 상태 관리
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- 기존 데이터셋 유지 ---
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

  // 1. 인증 로직 (Rule 3)
  useEffect(() => {
    if (!auth) {
      setError("시스템 설정값이 유효하지 않습니다. (__firebase_config missing)");
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (token) {
          await signInWithCustomToken(auth, token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
        setError("인증 세션 생성에 실패했습니다.");
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 로딩 화면
  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500 w-10 h-10" />
      </div>
    );
  }

  // 에러 화면 (백색 화면 방지)
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-red-50 rounded-3xl border border-red-100 mx-auto max-w-2xl mt-10">
        <AlertCircle className="text-red-500 w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold text-red-900 mb-2">마케팅 센터 로드 오류</h2>
        <p className="text-red-600 text-center mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
        >
          <RefreshCcw size={18} /> 페이지 새로고침
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1. 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">마케팅 센터</h1>
          <p className="text-slate-500 mt-1">AI 에이전트를 활용하여 고객 재방문을 유도하고 브랜딩을 강화하세요.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
          <Plus size={20} /> 새 캠페인 만들기
        </button>
      </div>

      {/* 2. 마케팅 지표 섹션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {marketingStats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
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
        {/* AI 에이전트 상태 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
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

        {/* 최근 캠페인 리스트 */}
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
      
      {/* 하단 접속 정보 (디버깅 및 투명성) */}
      <div className="text-right pt-4">
        <span className="text-[10px] text-slate-300 font-mono">
          Session: {user?.uid || 'Authenticating...'}
        </span>
      </div>
    </div>
  );
};

export default App;