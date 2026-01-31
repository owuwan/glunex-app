import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Wallet, TrendingUp, Calendar, CheckCircle2, 
  Clock, Sparkles, MessageSquare, Edit3, 
  ChevronRight, Info, X, Loader2, ArrowUpRight, Target, Zap,
  ArrowRight
} from 'lucide-react';
import { auth, db } from '../firebase';
import { signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';

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
    upcoming: 0,   // 스케줄 예약건 (노란색)
    total: 0
  });

  const [chartData, setChartData] = useState([]);

  // --- (Rule 3) 인증 로직 ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!auth.currentUser) await signInAnonymously(auth);
      } catch (err) { console.error(err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 데이터 분석 및 월간 그래프 가공 ---
  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const todayStr = now.toISOString().split('T')[0];
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    // 이번 달의 총 일수 계산
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

        // 1. 보증서 데이터 (확정 매출 - 블루)
        wSnap.docs.forEach(doc => {
          const data = doc.data();
          const d = new Date(data.issuedAt);
          // 이번 달 데이터만 필터링
          if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
            const price = Number(String(data.price || "0").replace(/[^0-9]/g, '')) || 0;
            confirmedSum += price;
            const dayIdx = d.getDate() - 1;
            if (dailyStats[dayIdx]) dailyStats[dayIdx].confirmed += price;
          }
        });

        // 2. 스케줄 데이터 (발행대기/예약건)
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
              pendingSum += price; // 발행대기 (그린)
              if (dailyStats[dayIdx]) dailyStats[dayIdx].pending += price;
            } else {
              upcomingSum += price; // 예약건 (노란색)
              if (dailyStats[dayIdx]) dailyStats[dayIdx].upcoming += price;
            }
          }
        });

        setStats({ confirmed: confirmedSum, pending: pendingSum, upcoming: upcomingSum, total: confirmedSum + pendingSum + upcomingSum });
        
        // 차트 스케일 조정 (최대값 기준 백분율)
        const maxVal = Math.max(...dailyStats.map(d => d.confirmed + d.pending + d.upcoming), 1000000);
        const processedChart = dailyStats.map(d => ({
          name: `${d.day}일`,
          confirmed: (d.confirmed / maxVal) * 100,
          pending: (d.pending / maxVal) * 100,
          upcoming: (d.upcoming / maxVal) * 100,
          isToday: d.dateStr === todayStr
        }));
        setChartData(processedChart);

      }, (err) => console.error(err));
      return () => unsubS();
    }, (err) => console.error(err));

    return () => unsubW();
  }, [user, appId]);

  const generatePath = (data, key, height = 150, width = 350) => {
    if (data.length === 0) return "";
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const val = d[key] > 0 ? d[key] : 0; // 0 이하 방지
      const y = height - (val / 100) * height;
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
      
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 bg-white border-b border-slate-100 z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-full transition-colors active:scale-90 text-slate-400"><ArrowLeft size={24} /></button>
        <h1 className="text-xl font-black text-slate-900 tracking-tight italic">MONTHLY <span className="text-blue-600">GROWTH</span></h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6 pb-36 scrollbar-hide">
        
        {/* 현금 흐름 요약 */}
        <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full blur-[60px] -mr-20 -mt-20" />
          <div className="relative z-10 text-left">
            <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-blue-400" />
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">Monthly Performance Index</p>
            </div>
            <div className="flex items-baseline gap-2 mb-8 text-left">
              <span className="text-4xl font-black tracking-tighter">{(stats.confirmed + stats.pending).toLocaleString()}</span>
              <span className="text-lg font-bold opacity-30">원</span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <div className="text-left">
                <p className="text-slate-500 text-[9px] font-bold mb-1 uppercase tracking-tighter">보증서 발행완료</p>
                <p className="text-sm font-black text-blue-400">{stats.confirmed.toLocaleString()}</p>
              </div>
              <div className="text-left">
                <p className="text-slate-500 text-[9px] font-bold mb-1 uppercase tracking-tighter">보증서 발행대기</p>
                <p className="text-sm font-black text-green-400">{stats.pending.toLocaleString()}</p>
              </div>
              <div className="text-left">
                <p className="text-slate-500 text-[9px] font-bold mb-1 uppercase tracking-tighter">스케줄 예약건</p>
                <p className="text-sm font-black text-amber-400">{stats.upcoming.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 월간 성장 차트 */}
        <section className="bg-white rounded-[2.5rem] p-7 border border-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.03)] space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 italic"><Zap size={18} className="text-blue-600 fill-blue-600" /> Revenue Stream</h3>
            <div className="flex gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"/><span className="text-[8px] font-bold text-slate-400">발행</span></div>
              <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"/><span className="text-[8px] font-bold text-slate-400">대기</span></div>
              <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"/><span className="text-[8px] font-bold text-slate-400">예약</span></div>
            </div>
          </div>

          <div className="relative h-44 w-full px-1">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 350 150" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0" /></linearGradient>
                <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" /><stop offset="100%" stopColor="#22c55e" stopOpacity="0" /></linearGradient>
                <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.1" /><stop offset="100%" stopColor="#f59e0b" stopOpacity="0" /></linearGradient>
              </defs>
              <line x1="0" y1="0" x2="350" y2="0" stroke="#f8fafc" strokeWidth="1" /><line x1="0" y1="75" x2="350" y2="75" stroke="#f8fafc" strokeWidth="1" /><line x1="0" y1="150" x2="350" y2="150" stroke="#f1f5f9" strokeWidth="1" />
              
              {/* 예약건 (앰버) */}
              <path d={generateAreaPath(chartData, 'upcoming')} fill="url(#gradAmber)" className="transition-all duration-1000" />
              <path d={generatePath(chartData, 'upcoming')} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
              
              {/* 발행대기 (그린) */}
              <path d={generateAreaPath(chartData, 'pending')} fill="url(#gradGreen)" className="transition-all duration-1000" />
              <path d={generatePath(chartData, 'pending')} fill="none" stroke="#22c55e" strokeWidth="3" strokeDasharray="6 4" strokeLinecap="round" />
              
              {/* 발행완료 (블루) */}
              <path d={generateAreaPath(chartData, 'confirmed')} fill="url(#gradBlue)" className="transition-all duration-1000" />
              <path d={generatePath(chartData, 'confirmed')} fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <div className="flex justify-between mt-6 px-1"><span className="text-[10px] font-black text-slate-300">1일</span><span className="text-[10px] font-black text-blue-600">오늘</span><span className="text-[10px] font-black text-slate-300">말일</span></div>
          </div>
        </section>

        {/* 상세 목록 */}
        <section className="grid grid-cols-1 gap-3">
           {[
             { label: '보증서 발행완료', value: stats.confirmed, color: 'blue', icon: <CheckCircle2 size={20}/> },
             { label: '보증서 발행대기', value: stats.pending, color: 'green', icon: <Clock size={20}/> },
             { label: '스케줄 예약건', value: stats.upcoming, color: 'amber', icon: <Calendar size={20}/> }
           ].map((item, idx) => (
             <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-200 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4 text-left">
                   <div className={`p-3 rounded-2xl text-white shadow-lg ${item.color === 'blue' ? 'bg-blue-600' : item.color === 'green' ? 'bg-green-600' : 'bg-amber-500'}`}>{item.icon}</div>
                   <div><p className="text-xs font-bold text-slate-800">{item.label}</p><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Item</p></div>
                </div>
                <p className="text-lg font-black text-slate-900">{item.value.toLocaleString()}원</p>
             </div>
           ))}
        </section>
      </main>

      {/* 액션 버튼 */}
      <footer className="fixed bottom-0 left-0 right-0 p-8 bg-white/80 backdrop-blur-2xl border-t border-slate-100 max-w-md mx-auto z-40">
        <button onClick={() => setShowMarketingModal(true)}
          className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all shadow-slate-900/40 border border-slate-700"
        >
          <Sparkles size={22} className="text-amber-400 animate-pulse" /> 
          <span>매출 성장 솔루션 실행</span>
          <ArrowRight size={18} className="text-slate-500" />
        </button>
      </footer>

      {showMarketingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in" onClick={() => setShowMarketingModal(false)}>
           <div className="bg-white w-full max-w-sm rounded-[3.5rem] shadow-2xl relative flex flex-col p-8 pb-12 overflow-hidden animate-scale-in text-left" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-10 text-left">
                 <div>
                    <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 inline-block">Growth Engine</div>
                    <h3 className="text-[28px] font-black text-slate-900 tracking-tighter leading-[1.1]">수익 성장을 위한<br/>최적 전략 실행</h3>
                 </div>
                 <button onClick={() => setShowMarketingModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-300 active:scale-90"><X size={24}/></button>
              </div>
              <div className="space-y-4">
                 <button onClick={() => navigate('/marketing')} className="w-full p-7 bg-blue-600 rounded-[2.5rem] flex items-center justify-between group active:scale-[0.98] transition-all shadow-xl shadow-blue-200">
                    <div className="flex items-center gap-5 text-left"><div className="p-3 bg-white/20 rounded-2xl text-white shadow-inner"><MessageSquare size={26} /></div>
                       <div><p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-1">CRM Marketing</p><p className="text-lg font-black text-white leading-none">기존 고객에게 연락하기</p></div>
                    </div><ArrowUpRight className="text-white opacity-40 group-hover:opacity-100 transition-all" />
                 </button>
                 <button onClick={() => navigate('/creator')} className="w-full p-7 bg-slate-900 rounded-[2.5rem] flex items-center justify-between group active:scale-[0.98] transition-all shadow-xl shadow-slate-400">
                    <div className="flex items-center gap-5 text-left"><div className="p-3 bg-white/10 rounded-2xl text-white shadow-inner"><Edit3 size={26} /></div>
                       <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Acquisition AI</p><p className="text-lg font-black text-white leading-none">새로운 홍보글 쓰기</p></div>
                    </div><ArrowUpRight className="text-white opacity-40 group-hover:opacity-100 transition-all" />
                 </button>
              </div>
              <div className="mt-10 text-center"><p className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.5em]">Powered by GLUNEX Growth AI</p></div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        .animate-scale-in { animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Sales;