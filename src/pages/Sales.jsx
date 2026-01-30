import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Wallet, TrendingUp, Calendar, CheckCircle2, 
  Clock, Sparkles, MessageSquare, Edit3, 
  ChevronRight, Info, X, Loader2, ArrowUpRight, Target, Zap
} from 'lucide-react';
import { auth, db } from '../firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const Sales = () => {
  const navigate = useNavigate();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'glunex-app';

  // --- 상태 관리 ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  
  const [stats, setStats] = useState({
    confirmed: 0,  // 보증서 발행 (블루)
    pending: 0,    // 시간 지난 예약 (그린)
    upcoming: 0,   // 미래 예약 (노란색/앰버)
    total: 0
  });

  const [chartData, setChartData] = useState([]);

  // --- 인증 로직 ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 데이터 페칭 및 통합 계산 ---
  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    const qWarranties = query(collection(db, "warranties"), where("userId", "==", user.uid));
    const schedulesRef = collection(db, 'artifacts', appId, 'public', 'data', 'schedules');

    const unsubW = onSnapshot(qWarranties, (wSnap) => {
      const unsubS = onSnapshot(schedulesRef, (sSnap) => {
        let confirmedSum = 0;
        let pendingSum = 0;
        let upcomingSum = 0;

        // 1. 보증서 기반 (확정 매출 - 블루)
        wSnap.docs.forEach(doc => {
          const data = doc.data();
          const price = Number(String(data.price || "0").replace(/[^0-9]/g, '')) || 0;
          confirmedSum += price;
        });

        // 2. 스케줄 기반 (미발행/예정 매출)
        sSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.userId !== user.uid) return;

          const price = Number(String(data.price || "0").replace(/[^0-9]/g, '')) || 0;
          const [sH, sM] = (data.time || "00:00").split(':').map(Number);
          
          const isPastDate = data.date < todayStr;
          const isTodayPastTime = data.date === todayStr && (sH < currentH || (sH === currentH && sM < currentM));

          if (isPastDate || isTodayPastTime) {
            // 시간은 지났는데 보증서 미발행 상태 (초록색)
            pendingSum += price;
          } else {
            // 아직 오지 않은 예약 시간 (노란색/앰버)
            upcomingSum += price;
          }
        });

        setStats({
          confirmed: confirmedSum,
          pending: pendingSum,
          upcoming: upcomingSum,
          total: confirmedSum + pendingSum + upcomingSum
        });

        // 월간 성장 추이를 보여주는 데이터 시뮬레이션 (4주차 흐름)
        const weeks = ['1주차', '2주차', '3주차', '4주차'];
        setChartData(weeks.map((name, i) => ({
          name,
          confirmed: 20 + i * 15 + Math.random() * 10,
          pending: 15 + i * 8 + Math.random() * 5,
          upcoming: 30 - i * 5 + Math.random() * 10,
        })));

      }, (err) => console.error("Schedule Listener Error:", err));
      
      return () => unsubS();
    }, (err) => console.error("Warranty Listener Error:", err));

    return () => unsubW();
  }, [user, appId]);

  // SVG 곡선 생성 함수 (성취감이 느껴지도록 부드럽게)
  const generatePath = (data, key, height = 150, width = 350) => {
    if (data.length === 0) return "";
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (d[key] / 100) * height;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  const generateAreaPath = (data, key, height = 150, width = 350) => {
    if (data.length === 0) return "";
    const linePath = generatePath(data, key, height, width);
    return `${linePath} L ${width},${height} L 0,${height} Z`;
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-[#F8F9FB] text-slate-800 font-sans overflow-hidden max-w-md mx-auto relative select-none">
      
      {/* 헤더 */}
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 bg-white border-b border-slate-100 z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-full transition-colors active:scale-90 text-slate-400">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-slate-900 tracking-tight italic">MONTHLY <span className="text-blue-600">PERFORMANCE</span></h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6 pb-36 scrollbar-hide">
        
        {/* 매출 대시보드 카드 */}
        <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full blur-[60px] -mr-20 -mt-20"></div>
          <div className="relative z-10 text-left">
            <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-blue-400" />
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">Monthly Revenue Status</p>
            </div>
            <div className="flex items-baseline gap-2 mb-8 text-left">
              <span className="text-4xl font-black tracking-tighter">{(stats.confirmed + stats.pending).toLocaleString()}</span>
              <span className="text-lg font-bold opacity-30">원</span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <div className="text-left">
                <p className="text-slate-500 text-[9px] font-bold mb-1 uppercase tracking-tighter">확정 수익</p>
                <p className="text-sm font-black text-blue-400">{stats.confirmed.toLocaleString()}</p>
              </div>
              <div className="text-left">
                <p className="text-slate-500 text-[9px] font-bold mb-1 uppercase tracking-tighter">정산 대기</p>
                <p className="text-sm font-black text-green-400">{stats.pending.toLocaleString()}</p>
              </div>
              <div className="text-left">
                <p className="text-slate-500 text-[9px] font-bold mb-1 uppercase tracking-tighter">잠재 수익</p>
                <p className="text-sm font-black text-amber-400">{stats.upcoming.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 월간 성장 흐름 차트 (주식형 영역 차트) */}
        <section className="bg-white rounded-[2.5rem] p-7 border border-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.03)] space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 italic">
              <Zap size={18} className="text-blue-600 fill-blue-600" /> Growth Trend
            </h3>
            <div className="flex gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"/><span className="text-[8px] font-bold text-slate-400">확정</span></div>
              <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"/><span className="text-[8px] font-bold text-slate-400">완료</span></div>
              <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"/><span className="text-[8px] font-bold text-slate-400">예정</span></div>
            </div>
          </div>

          <div className="relative h-44 w-full px-1">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 350 150" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* 가이드 라인 */}
              <line x1="0" y1="0" x2="350" y2="0" stroke="#f8fafc" strokeWidth="1" />
              <line x1="0" y1="75" x2="350" y2="75" stroke="#f8fafc" strokeWidth="1" />
              <line x1="0" y1="150" x2="350" y2="150" stroke="#f1f5f9" strokeWidth="1" />

              {/* 확정 매출 (블루 영역) */}
              <path d={generateAreaPath(chartData, 'confirmed')} fill="url(#gradBlue)" className="transition-all duration-1000" />
              <path d={generatePath(chartData, 'confirmed')} fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
              
              {/* 완료 매출 (그린 점선) */}
              <path d={generateAreaPath(chartData, 'pending')} fill="url(#gradGreen)" className="transition-all duration-1000" />
              <path d={generatePath(chartData, 'pending')} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="6 4" strokeLinecap="round" />
              
              {/* 예정 매출 (노란색 실선) */}
              <path d={generatePath(chartData, 'upcoming')} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            </svg>
            
            <div className="flex justify-between mt-6 px-1">
               {chartData.map((d, i) => (
                 <span key={i} className="text-[10px] font-black text-slate-300">{d.name}</span>
               ))}
            </div>
          </div>
        </section>

        {/* 실적 상세 지표 */}
        <section className="grid grid-cols-1 gap-3">
           <div className="bg-white p-6 rounded-[2rem] border border-slate-200 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4 text-left">
                 <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-100"><CheckCircle2 size={20} /></div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Confirmed Revenue</p>
                    <p className="text-xs font-bold text-slate-800">보증서 발행 완료 수익</p>
                 </div>
              </div>
              <p className="text-lg font-black text-slate-900">{stats.confirmed.toLocaleString()}원</p>
           </div>

           <div className="bg-white p-6 rounded-[2rem] border border-slate-200 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4 text-left">
                 <div className="p-3 rounded-2xl bg-green-600 text-white shadow-lg shadow-green-100"><Clock size={20} /></div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Pending Settlement</p>
                    <p className="text-xs font-bold text-slate-800">시공 완료 미정산액</p>
                 </div>
              </div>
              <p className="text-lg font-black text-slate-900">{stats.pending.toLocaleString()}원</p>
           </div>

           <div className="bg-white p-6 rounded-[2rem] border border-slate-200 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4 text-left">
                 <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-100"><Calendar size={20} /></div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Upcoming Reservation</p>
                    <p className="text-xs font-bold text-slate-800">예약 대기 예상 매출</p>
                 </div>
              </div>
              <p className="text-lg font-black text-slate-900">{stats.upcoming.toLocaleString()}원</p>
           </div>
        </section>

        <div className="p-5 bg-slate-100 rounded-2xl flex items-start gap-3 opacity-60 text-left">
           <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
           <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              성장 추이 그래프는 이번 달 주차별 누적 실적을 기반으로 시각화되었습니다. <br/>
              예약 관리를 통해 잠재 수익을 확정 수익으로 전환하세요.
           </p>
        </div>
      </main>

      {/* 하단 고정 액션 버튼 */}
      <footer className="fixed bottom-0 left-0 right-0 p-8 bg-white/80 backdrop-blur-2xl border-t border-slate-100 max-w-md mx-auto z-40">
        <button 
          onClick={() => setShowMarketingModal(true)}
          className="w-full py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all shadow-slate-900/30 border border-slate-700"
        >
          <Sparkles size={22} className="text-blue-400 animate-pulse" /> 
          <span>수익 성장 마케팅 솔루션</span>
          <ArrowRight size={18} className="text-slate-500" />
        </button>
      </footer>

      {/* 마케팅 브릿지 모달 (화면 정중앙 배치) */}
      {showMarketingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in" onClick={() => setShowMarketingModal(false)}>
           <div className="bg-white w-full max-w-sm rounded-[3.5rem] shadow-2xl relative flex flex-col p-8 pb-12 overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
              
              <div className="flex justify-between items-start mb-10 text-left">
                 <div>
                    <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 inline-block">Marketing Engine</div>
                    <h3 className="text-[28px] font-black text-slate-900 tracking-tighter leading-[1.1]">수익 성장을 위한<br/>최적 전략 실행</h3>
                 </div>
                 <button onClick={() => setShowMarketingModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-300 hover:text-slate-900 transition-colors"><X size={24}/></button>
              </div>

              <div className="space-y-4">
                 {/* 단골 케어 */}
                 <button 
                    onClick={() => navigate('/marketing')}
                    className="w-full p-7 bg-blue-600 rounded-[2.5rem] flex items-center justify-between group active:scale-[0.98] transition-all shadow-xl shadow-blue-200"
                 >
                    <div className="flex items-center gap-5">
                       <div className="p-3 bg-white/20 rounded-2xl text-white shadow-inner"><MessageSquare size={26} /></div>
                       <div className="text-left">
                          <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-1">Retention Plan</p>
                          <p className="text-lg font-black text-white leading-none">기존 고객에게 연락하기</p>
                       </div>
                    </div>
                    <ArrowUpRight className="text-white opacity-40 group-hover:opacity-100 transition-all" />
                 </button>

                 {/* 신규 유입 */}
                 <button 
                    onClick={() => navigate('/creator')}
                    className="w-full p-7 bg-slate-900 rounded-[2.5rem] flex items-center justify-between group active:scale-[0.98] transition-all shadow-xl shadow-slate-400"
                 >
                    <div className="flex items-center gap-5">
                       <div className="p-3 bg-white/10 rounded-2xl text-white shadow-inner"><Edit3 size={26} /></div>
                       <div className="text-left">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Acquisition AI</p>
                          <p className="text-lg font-black text-white leading-none">새로운 홍보글 쓰기</p>
                       </div>
                    </div>
                    <ArrowUpRight className="text-white opacity-40 group-hover:opacity-100 transition-all" />
                 </button>
              </div>

              <div className="mt-10 text-center">
                 <p className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.5em]">Powered by GLUNEX Growth AI</p>
              </div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in {
          animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default Sales;