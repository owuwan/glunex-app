import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Wallet, TrendingUp, Calendar, CheckCircle2, 
  Clock, Sparkles, MessageSquare, Edit3, 
  ChevronRight, Info, X, Loader2, ArrowUpRight, Target, Zap,
  ArrowRight
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
    confirmed: 0,  // 보증서 발행완료 (블루)
    pending: 0,    // 보증서 발행대기 (그린)
    upcoming: 0,   // 스케줄 예약건 (노란색/앰버)
    total: 0
  });

  const [chartData, setChartData] = useState([]);

  // --- (Rule 3) 인증 로직 ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!auth.currentUser) await signInAnonymously(auth);
      } catch (err) { console.error("Auth Error:", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 데이터 분석 로직 ---
  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const todayStr = now.toISOString().split('T')[0];
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    // 이번 달 일수 계산 및 초기화
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyStats = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      confirmed: 0,
      pending: 0,
      upcoming: 0,
      dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    }));

    const qWarranties = query(collection(db, "warranties"), where("userId", "==", user.uid));
    const schedulesRef = collection(db, 'artifacts', appId, 'public', 'data', 'schedules');

    const unsubW = onSnapshot(qWarranties, (wSnap) => {
      const unsubS = onSnapshot(schedulesRef, (sSnap) => {
        let confirmedSum = 0;
        let pendingSum = 0;
        let upcomingSum = 0;

        wSnap.docs.forEach(doc => {
          const data = doc.data();
          const d = new Date(data.issuedAt);
          if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
            const price = Number(String(data.price || "0").replace(/[^0-9]/g, '')) || 0;
            confirmedSum += price;
            const dayIdx = d.getDate() - 1;
            if (dailyStats[dayIdx]) dailyStats[dayIdx].confirmed += price;
          }
        });

        sSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.userId !== user.uid) return;
          const d = new Date(data.date);
          if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
            const price = Number(String(data.price || "0").replace(/[^0-9]/g, '')) || 0;
            const [sH, sM] = (data.time || "00:00").split(':').map(Number);
            const isPastDate = data.date < todayStr;
            const isTodayPastTime = data.date === todayStr && (sH < currentH || (sH === currentH && sM < currentM));
            const dayIdx = d.getDate() - 1;

            if (isPastDate || isTodayPastTime) {
              pendingSum += price;
              if (dailyStats[dayIdx]) dailyStats[dayIdx].pending += price;
            } else {
              upcomingSum += price;
              if (dailyStats[dayIdx]) dailyStats[dayIdx].upcoming += price;
            }
          }
        });

        setStats({ confirmed: confirmedSum, pending: pendingSum, upcoming: upcomingSum, total: confirmedSum + pendingSum + upcomingSum });
        
        const maxVal = Math.max(...dailyStats.map(d => d.confirmed + d.pending + d.upcoming), 1000000);
        setChartData(dailyStats.map(d => ({
          name: `${d.day}`,
          confirmed: (d.confirmed / maxVal) * 100,
          pending: (d.pending / maxVal) * 100,
          upcoming: (d.upcoming / maxVal) * 100,
          isToday: d.dateStr === todayStr
        })));
      });
      return () => unsubS();
    });
    return () => unsubW();
  }, [user, appId]);

  const generatePath = (data, key, height = 120, width = 340) => {
    if (data.length === 0) return "";
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (Math.max(d[key], 0) / 100) * height;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  const generateAreaPath = (data, key, height = 120, width = 340) => {
    if (data.length === 0) return "";
    const linePath = generatePath(data, key, height, width);
    return `${linePath} L ${width},${height} L 0,${height} Z`;
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-blue-600" size={28} />
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-[#F8F9FB] text-slate-800 font-sans overflow-hidden max-w-md mx-auto relative select-none">
      
      {/* 헤더: 더 콤팩트하게 변경 */}
      <header className="px-5 pt-10 pb-4 flex items-center justify-between bg-white border-b border-slate-100 z-10 shrink-0">
        <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-slate-50 rounded-full transition-colors active:scale-90 text-slate-400">
                <ArrowLeft size={22} />
            </button>
            <h1 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">
                Revenue <span className="text-blue-600">Report</span>
            </h1>
        </div>
        <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Live Status</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-32 scrollbar-hide">
        
        {/* 현금 흐름 요약: 크기 조절 및 가독성 최적화 */}
        <section className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] -mr-16 -mt-16" />
          <div className="relative z-10 text-left">
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.1em] mb-1">Total Monthly Revenue</p>
            <div className="flex items-baseline gap-1.5 mb-6">
              <span className="text-3xl font-black tracking-tighter">{(stats.confirmed + stats.pending).toLocaleString()}</span>
              <span className="text-sm font-bold opacity-30">원</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-5">
              <div className="text-left">
                <p className="text-slate-500 text-[8px] font-black uppercase mb-1">Confirmed</p>
                <p className="text-[13px] font-black text-blue-400 leading-none">{stats.confirmed.toLocaleString()}</p>
              </div>
              <div className="text-left">
                <p className="text-slate-500 text-[8px] font-black uppercase mb-1">Pending</p>
                <p className="text-[13px] font-black text-green-400 leading-none">{stats.pending.toLocaleString()}</p>
              </div>
              <div className="text-left">
                <p className="text-slate-500 text-[8px] font-black uppercase mb-1">Upcoming</p>
                <p className="text-[13px] font-black text-amber-400 leading-none">{stats.upcoming.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 주식형 영역 차트: 콤팩트 사이즈로 리뉴얼 */}
        <section className="bg-white rounded-[2rem] p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 italic">
                <Zap size={14} className="text-blue-600 fill-blue-600" /> Growth Stream
            </h3>
            <div className="flex gap-2 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100 shrink-0">
              <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"/><span className="text-[8px] font-bold text-slate-400">발행</span></div>
              <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"/><span className="text-[8px] font-bold text-slate-400">대기</span></div>
              <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"/><span className="text-[8px] font-bold text-slate-400">예정</span></div>
            </div>
          </div>

          <div className="relative h-32 w-full px-0.5">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 340 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0" /></linearGradient>
                <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity="0.1" /><stop offset="100%" stopColor="#22c55e" stopOpacity="0" /></linearGradient>
              </defs>
              {/* 가이드 라인 */}
              <line x1="0" y1="0" x2="340" y2="0" stroke="#f1f5f9" strokeWidth="0.5" />
              <line x1="0" y1="60" x2="340" y2="60" stroke="#f1f5f9" strokeWidth="0.5" />
              <line x1="0" y1="120" x2="340" y2="120" stroke="#f1f5f9" strokeWidth="1" />
              
              {/* 예약 (노란색 실선) */}
              <path d={generatePath(chartData, 'upcoming', 120, 340)} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
              
              {/* 대기 (그린 영역) */}
              <path d={generateAreaPath(chartData, 'pending', 120, 340)} fill="url(#gG)" />
              <path d={generatePath(chartData, 'pending', 120, 340)} fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="5 3" strokeLinecap="round" />
              
              {/* 확정 (블루 영역) */}
              <path d={generateAreaPath(chartData, 'confirmed', 120, 340)} fill="url(#gB)" />
              <path d={generatePath(chartData, 'confirmed', 120, 340)} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <div className="flex justify-between mt-3 px-1">
               <span className="text-[8px] font-bold text-slate-300">Start</span>
               <span className="text-[8px] font-black text-blue-600">Today</span>
               <span className="text-[8px] font-bold text-slate-300">End</span>
            </div>
          </div>
        </section>

        {/* 상세 분석 리스트: 콤팩트 리스트 */}
        <section className="space-y-2">
           {[
             { label: '보증서 발행완료', value: stats.confirmed, color: 'blue', icon: <CheckCircle2 size={16}/>, sub: '확정 수익' },
             { label: '보증서 발행대기', value: stats.pending, color: 'green', icon: <Clock size={16}/>, sub: '작업 완료' },
             { label: '스케줄 예약건', value: stats.upcoming, color: 'amber', icon: <Calendar size={16}/>, sub: '예약 현황' }
           ].map((item, idx) => (
             <div key={idx} className="bg-white px-5 py-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 text-left">
                   <div className={`p-2.5 rounded-xl text-white ${item.color === 'blue' ? 'bg-blue-600' : item.color === 'green' ? 'bg-green-600' : 'bg-amber-500'}`}>{item.icon}</div>
                   <div>
                      <p className="text-[11px] font-black text-slate-800 leading-none mb-1">{item.label}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{item.sub}</p>
                   </div>
                </div>
                <p className="text-sm font-black text-slate-900">{item.value.toLocaleString()}원</p>
             </div>
           ))}
        </section>

        <div className="p-4 bg-slate-100 rounded-xl flex items-start gap-2.5 opacity-60 text-left">
           <Info size={14} className="text-slate-500 shrink-0 mt-0.5" />
           <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
              성장 추이는 이번 달 주차별 실적을 기반으로 자동 계산됩니다. <br/>
              예약을 보증서 발행으로 전환하여 현금 흐름을 확보하세요.
           </p>
        </div>
      </main>

      {/* 하단 고정 액션 버튼: 사이즈 줄이고 세련되게 */}
      <footer className="fixed bottom-0 left-0 right-0 px-6 py-8 bg-white/90 backdrop-blur-md border-t border-slate-100 max-w-md mx-auto z-40">
        <button onClick={() => setShowMarketingModal(true)}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-base flex items-center justify-center gap-2.5 shadow-xl active:scale-95 transition-all shadow-slate-900/20 border border-slate-800"
        >
          <Sparkles size={18} className="text-amber-400 animate-pulse" /> 
          <span className="tracking-tight">매출 성장 마케팅 엔진 가동</span>
          <ArrowRight size={16} className="text-slate-500" />
        </button>
      </footer>

      {/* 마케팅 브릿지 모달: 완벽한 중앙 배치 */}
      {showMarketingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm animate-fade-in" onClick={() => setShowMarketingModal(false)}>
           <div className="bg-white w-full max-w-[320px] rounded-[2.5rem] shadow-2xl relative flex flex-col p-7 pb-8 overflow-hidden animate-scale-in text-left" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-8 text-left">
                 <div>
                    <div className="bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest mb-2 inline-block">Engine v1.1</div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter leading-tight">성장을 위한<br/>전략을 선택하세요</h3>
                 </div>
                 <button onClick={() => setShowMarketingModal(false)} className="p-1.5 bg-slate-50 rounded-full text-slate-300 hover:text-slate-900 active:scale-90"><X size={20}/></button>
              </div>

              <div className="space-y-3">
                 <button onClick={() => navigate('/marketing')} className="w-full p-5 bg-blue-600 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all shadow-lg shadow-blue-200">
                    <div className="flex items-center gap-4 text-left">
                       <div className="p-2 bg-white/20 rounded-xl text-white shadow-inner"><MessageSquare size={20} /></div>
                       <div>
                          <p className="text-[8px] font-black text-blue-100 uppercase tracking-widest mb-0.5">CRM Strategy</p>
                          <p className="text-sm font-black text-white leading-none">기존 고객 연락하기</p>
                       </div>
                    </div>
                    <ArrowUpRight size={16} className="text-white opacity-40 group-hover:opacity-100 transition-all" />
                 </button>

                 <button onClick={() => navigate('/creator')} className="w-full p-5 bg-slate-900 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all shadow-lg shadow-slate-300">
                    <div className="flex items-center gap-4 text-left">
                       <div className="p-2 bg-white/10 rounded-xl text-white shadow-inner"><Edit3 size={20} /></div>
                       <div>
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">AI Acquisition</p>
                          <p className="text-sm font-black text-white leading-none">새로운 홍보글 쓰기</p>
                       </div>
                    </div>
                    <ArrowUpRight size={16} className="text-white opacity-40 group-hover:opacity-100 transition-all" />
                 </button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
        .animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Sales;