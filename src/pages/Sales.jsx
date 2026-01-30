import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Wallet, TrendingUp, Calendar, CheckCircle2, 
  Clock, Sparkles, ArrowRight, MessageSquare, Edit3, 
  ChevronRight, Info, AlertCircle, X, ExternalLink
} from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';

const Sales = () => {
  const navigate = useNavigate();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'glunex-app';

  // --- 상태 관리 ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  
  // 매출 데이터 상태
  const [stats, setStats] = useState({
    confirmed: 0, // 보증서 발행
    completed: 0, // 지난 예약
    expected: 0,  // 미래 예약
    total: 0
  });

  // 그래프용 데이터 (최근 7일)
  const [chartData, setChartData] = useState([]);

  // --- 인증 로직 ---
  useEffect(() => {
    const initAuth = async () => {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 데이터 페칭 및 계산 ---
  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 1. 보증서 데이터 리스너 (확정 매출)
    const warrantiesRef = collection(db, "warranties");
    const qWarranties = query(warrantiesRef, where("userId", "==", user.uid));
    
    // 2. 스케줄 데이터 리스너 (완료 및 예상 매출)
    const schedulesRef = collection(db, 'artifacts', appId, 'public', 'data', 'schedules');
    
    const unsubW = onSnapshot(qWarranties, (wSnap) => {
      const unsubS = onSnapshot(schedulesRef, (sSnap) => {
        let confirmedSum = 0;
        let completedSum = 0;
        let expectedSum = 0;

        const dailyMap = {}; // 그래프용 날짜별 맵

        // 확정 매출 계산
        wSnap.docs.forEach(doc => {
          const data = doc.data();
          const price = Number(String(data.price || "0").replace(/[^0-9]/g, '')) || 0;
          confirmedSum += price;
        });

        // 스케줄 기반 매출 계산
        sSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.userId !== user.uid) return;

          const price = Number(String(data.price || "0").replace(/[^0-9]/g, '')) || 0;
          const isPastDate = data.date < todayStr;
          const isTodayPastTime = data.date === todayStr && data.time < currentTimeStr;

          if (isPastDate || isTodayPastTime) {
            completedSum += price;
          } else {
            expectedSum += price;
          }
        });

        setStats({
          confirmed: confirmedSum,
          completed: completedSum,
          expected: expectedSum,
          total: confirmedSum + completedSum + expectedSum
        });

        // 그래프 데이터 생성 (단순 시뮬레이션용 7일치)
        const days = ['월', '화', '수', '목', '금', '토', '일'];
        const dummyChart = days.map((day, idx) => ({
          name: day,
          confirmed: Math.floor(Math.random() * 50 + 20),
          completed: Math.floor(Math.random() * 30 + 10),
          expected: Math.floor(Math.random() * 40 + 5),
        }));
        setChartData(dummyChart);

      });
      return () => unsubS();
    });

    return () => unsubW();
  }, [user, appId]);

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-[#F8F9FB] text-slate-800 font-sans overflow-hidden max-w-md mx-auto relative select-none">
      
      {/* 헤더 */}
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 bg-white border-b border-slate-100 z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">매출 및 실적 분석</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6 pb-32 scrollbar-hide">
        
        {/* 총 매출 요약 카드 */}
        <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Total Monthly Revenue</p>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-4xl font-black tracking-tighter">{(stats.confirmed + stats.completed).toLocaleString()}</span>
              <span className="text-lg font-bold opacity-60">원</span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-slate-500 text-[9px] font-bold mb-1">보증서 발행</p>
                <p className="text-sm font-black text-blue-400">{stats.confirmed.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[9px] font-bold mb-1">시공 완료</p>
                <p className="text-sm font-black text-green-400">{stats.completed.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[9px] font-bold mb-1">예약(예상)</p>
                <p className="text-sm font-black text-amber-400">{stats.expected.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 트리플 매출 그래프 (SVG 커스텀) */}
        <section className="bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-600" /> 매출 트렌드
            </h3>
            <div className="flex gap-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-[9px] font-bold text-slate-400">확정</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-[9px] font-bold text-slate-400">완료</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-[9px] font-bold text-slate-400">예상</span>
              </div>
            </div>
          </div>

          {/* 그래프 영역 */}
          <div className="h-40 w-full flex items-end justify-between px-2 gap-2">
            {chartData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="w-full flex flex-col-reverse gap-0.5 max-w-[12px] h-full justify-start">
                   <div style={{ height: `${d.expected}%` }} className="w-full bg-amber-500/80 rounded-t-sm transition-all duration-500 group-hover:opacity-100"></div>
                   <div style={{ height: `${d.completed}%` }} className="w-full bg-green-500 transition-all duration-500"></div>
                   <div style={{ height: `${d.confirmed}%` }} className="w-full bg-blue-500 transition-all duration-500"></div>
                </div>
                <span className="text-[10px] font-black text-slate-300 group-hover:text-slate-900">{d.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 매출 상세 분석 정보 */}
        <section className="space-y-3">
           <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100"><CheckCircle2 size={20} /></div>
                 <div>
                    <p className="text-xs font-black text-blue-900 mb-0.5">확정 매출액</p>
                    <p className="text-[10px] text-blue-600 font-medium tracking-tight">발행된 보증서 기준 실매출</p>
                 </div>
              </div>
              <p className="text-lg font-black text-slate-900">{stats.confirmed.toLocaleString()}원</p>
           </div>

           <div className="bg-green-50/50 p-6 rounded-3xl border border-green-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-green-600 rounded-2xl text-white shadow-lg shadow-green-100"><Clock size={20} /></div>
                 <div>
                    <p className="text-xs font-black text-green-900 mb-0.5">미발행 완료건</p>
                    <p className="text-[10px] text-green-600 font-medium tracking-tight">시간이 지난 예약 미정산액</p>
                 </div>
              </div>
              <p className="text-lg font-black text-slate-900">{stats.completed.toLocaleString()}원</p>
           </div>

           <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-amber-500 rounded-2xl text-white shadow-lg shadow-amber-100"><Calendar size={20} /></div>
                 <div>
                    <p className="text-xs font-black text-amber-900 mb-0.5">예약 대기 매출</p>
                    <p className="text-[10px] text-amber-600 font-medium tracking-tight">미래 시공 예정 금액</p>
                 </div>
              </div>
              <p className="text-lg font-black text-slate-900">{stats.expected.toLocaleString()}원</p>
           </div>
        </section>

        <div className="p-4 bg-slate-100 rounded-2xl flex items-start gap-3 opacity-60">
           <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
           <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              모든 매출 데이터는 부가세(VAT) 포함 기준이며, 스케줄러의 금액은 시공 현장에 따라 변동될 수 있습니다.
           </p>
        </div>

      </main>

      {/* 하단 고정 액션 버튼 */}
      <footer className="fixed bottom-0 left-0 right-0 p-8 bg-white/80 backdrop-blur-2xl border-t border-slate-100 max-w-md mx-auto z-40">
        <button 
          onClick={() => setShowMarketingModal(true)}
          className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all shadow-slate-900/40"
        >
          <Sparkles size={20} className="text-amber-400" /> 부족한 매출 채우러 가기
        </button>
      </footer>

      {/* 마케팅 선택 브릿지 모달 */}
      {showMarketingModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowMarketingModal(false)}>
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl relative flex flex-col p-8 pb-12 overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
              <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8"></div>
              
              <div className="flex justify-between items-start mb-10">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">매출 상승을 위한<br/>전략을 선택하세요</h3>
                    <p className="text-xs text-slate-400 font-bold mt-2 tracking-tight">상황에 맞는 마케팅으로 매출을 극대화합니다.</p>
                 </div>
                 <button onClick={() => setShowMarketingModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-300 active:scale-90"><X size={24}/></button>
              </div>

              <div className="space-y-4">
                 {/* 단골 고객 케어 (마케팅 센터) */}
                 <button 
                    onClick={() => navigate('/marketing')}
                    className="w-full p-6 bg-blue-600 rounded-[2rem] flex items-center justify-between group active:scale-95 transition-all shadow-xl shadow-blue-100"
                 >
                    <div className="flex items-center gap-5">
                       <div className="p-3 bg-white/20 rounded-2xl text-white"><MessageSquare size={24} /></div>
                       <div className="text-left">
                          <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-1">CRM Marketing</p>
                          <p className="text-lg font-black text-white">기존 고객에게 연락하기</p>
                       </div>
                    </div>
                    <ChevronRight className="text-white opacity-40 group-hover:opacity-100" />
                 </button>

                 {/* 신규 유입 공략 (마케팅 에이전트) */}
                 <button 
                    onClick={() => navigate('/creator')}
                    className="w-full p-6 bg-slate-900 rounded-[2rem] flex items-center justify-between group active:scale-95 transition-all shadow-xl shadow-slate-200"
                 >
                    <div className="flex items-center gap-5">
                       <div className="p-3 bg-white/10 rounded-2xl text-white"><Edit3 size={24} /></div>
                       <div className="text-left">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Viral Marketing</p>
                          <p className="text-lg font-black text-white">새로운 홍보글 쓰기</p>
                       </div>
                    </div>
                    <ChevronRight className="text-white opacity-40 group-hover:opacity-100" />
                 </button>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 text-center">
                 <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.4em]">Optimized Growth Strategy</p>
              </div>
           </div>
        </div>
      )}

      {/* 애니메이션 스타일 */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s ease-out forwards;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default Sales;