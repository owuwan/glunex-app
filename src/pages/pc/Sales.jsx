import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Wallet, TrendingUp, Calendar, CheckCircle2, 
  Clock, Sparkles, MessageSquare, Edit3, 
  ChevronRight, Info, X, Loader2, ArrowUpRight, Target, Zap,
  ArrowRight, BarChart3, Database, Download
} from 'lucide-react';
import { auth, db } from '../../firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

/**
 * Sales: PC 전용 매출 현황 분석 (앱 버전 로직 100% 이식)
 * 앱 버전의 복잡한 데이터 분석 로직을 그대로 유지하며 UI만 PC 대화면에 최적화했습니다.
 */
const Sales = () => {
  const navigate = useNavigate();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'glunex-app';

  // --- [앱 버전 상태 관리 그대로 이식] ---
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
  const currentMonth = new Date().getMonth() + 1;

  // --- [인증 로직 이식] ---
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

  // --- [데이터 분석 로직 이식] ---
  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth();
    const todayStr = now.toISOString().split('T')[0];
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
    const dailyStats = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      confirmed: 0,
      pending: 0,
      upcoming: 0,
      dateStr: `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
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
          // 앱 버전 로직: issuedAt 기준
          const d = new Date(data.issuedAt || data.reservationDate); 
          if (d.getFullYear() === currentYear && d.getMonth() === currentMonthIdx) {
            const price = Number(String(data.price || data.warrantyPrice || "0").replace(/[^0-9]/g, '')) || 0;
            confirmedSum += price;
            const dayIdx = d.getDate() - 1;
            if (dailyStats[dayIdx]) dailyStats[dayIdx].confirmed += price;
          }
        });

        sSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.userId !== user.uid) return;
          const d = new Date(data.date);
          if (d.getFullYear() === currentYear && d.getMonth() === currentMonthIdx) {
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

  // --- [SVG 차트 생성 알고리즘 이식 (PC 사이즈에 맞춰 Width/Height 조절)] ---
  const generatePath = (data, key, height = 200, width = 1000) => {
    if (data.length === 0) return "";
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (Math.max(d[key], 0) / 100) * height;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  const generateAreaPath = (data, key, height = 200, width = 1000) => {
    if (data.length === 0) return "";
    const linePath = generatePath(data, key, height, width);
    return `${linePath} L ${width},${height} L 0,${height} Z`;
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-slate-50/50 h-full min-h-[600px]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-slate-400 font-black tracking-widest uppercase text-xs">Synchronizing Revenue Data...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700 w-full pb-10">
      
      {/* 1. 하이엔드 PC 헤더 */}
      <div className="flex items-center justify-between bg-white px-8 py-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg">
            <BarChart3 size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-none uppercase italic">
              Revenue <span className="text-indigo-600 not-italic">Status Analysis</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 leading-none">
              {currentMonth}월 실시간 매출 정산 및 데이터 인사이트
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowMarketingModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Sparkles size={16} className="text-amber-300 animate-pulse" /> 매출 성장 엔진 가동
          </button>
        </div>
      </div>

      {/* 2. 매출 요약 섹션 (앱의 Summary를 PC형 카드로) */}
      <div className="grid grid-cols-4 gap-5">
        <div className="col-span-1 bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10"><Wallet size={80} /></div>
          <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-2">{currentMonth}월 누적 실적 리포트</p>
          <div className="flex items-baseline gap-2 mb-8">
            <span className="text-4xl font-black tracking-tighter">{(stats.confirmed + stats.pending).toLocaleString()}</span>
            <span className="text-sm font-bold opacity-30 italic">KRW</span>
          </div>
          <div className="grid grid-cols-1 gap-4 border-t border-white/10 pt-6">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-bold text-slate-500 uppercase">Confirmed Asset</span>
               <span className="text-sm font-black text-indigo-400">{stats.confirmed.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-bold text-slate-500 uppercase">Pending Review</span>
               <span className="text-sm font-black text-emerald-400">{stats.pending.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="col-span-3 grid grid-cols-3 gap-5">
           {[
             { label: '보증서 발행완료', value: stats.confirmed, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: <CheckCircle2 size={24}/>, sub: '확정된 실제 매출' },
             { label: '보증서 발행대기', value: stats.pending, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <Clock size={24}/>, sub: '시공 완료 데이터' },
             { label: '스케줄 예약건', value: stats.upcoming, color: 'text-amber-500', bg: 'bg-amber-50', icon: <Calendar size={24}/>, sub: '예상 유입 매출' }
           ].map((item, idx) => (
             <div key={idx} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-6">
                   <div className={`p-3 rounded-2xl ${item.bg} ${item.color}`}>{item.icon}</div>
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Data</span>
                </div>
                <div>
                   <p className="text-[11px] font-black text-slate-400 uppercase mb-1 tracking-tighter">{item.label}</p>
                   <h3 className={`text-3xl font-black ${item.color} tracking-tighter italic leading-none`}>{item.value.toLocaleString()}<span className="text-sm not-italic ml-1 opacity-50">원</span></h3>
                   <p className="text-[10px] font-bold text-slate-400 mt-3">{item.sub}</p>
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* 3. Growth Stream 차트 (앱의 SVG 알고리즘 그대로 사용하여 PC 너비로 확장) */}
      <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 italic uppercase">
                <Zap size={18} className="text-indigo-600 fill-indigo-600" /> {currentMonth}월 비즈니스 Growth Stream
            </h3>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest italic">Visualizing Daily Revenue Performance Flow</p>
          </div>
          <div className="flex gap-4 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 shrink-0">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"/><span className="text-[10px] font-black text-slate-500 uppercase">발행</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"/><span className="text-[10px] font-black text-slate-500 uppercase">대기</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"/><span className="text-[10px] font-black text-slate-500 uppercase">예정</span></div>
          </div>
        </div>

        <div className="relative h-[250px] w-full px-2">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f46e5" stopOpacity="0.3" /><stop offset="100%" stopColor="#4f46e5" stopOpacity="0" /></linearGradient>
              <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity="0.2" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></linearGradient>
            </defs>
            {/* 가이드 라인 */}
            <line x1="0" y1="0" x2="1000" y2="0" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="100" x2="1000" y2="100" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="200" x2="1000" y2="200" stroke="#f1f5f9" strokeWidth="2" />
            
            {/* 데이터 패스 (앱 알고리즘 그대로 활용) */}
            <path d={generatePath(chartData, 'upcoming', 200, 1000)} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
            <path d={generateAreaPath(chartData, 'pending', 200, 1000)} fill="url(#gG)" />
            <path d={generatePath(chartData, 'pending', 200, 1000)} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="8 5" strokeLinecap="round" />
            <path d={generateAreaPath(chartData, 'confirmed', 200, 1000)} fill="url(#gB)" />
            <path d={generatePath(chartData, 'confirmed', 200, 1000)} fill="none" stroke="#4f46e5" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <div className="flex justify-between mt-6 px-2 text-[10px] font-black text-slate-400 uppercase italic">
             <span>Start of Month</span>
             <div className="flex items-center gap-2 text-indigo-600 font-black tracking-[0.2em]">
               <div className="w-1 h-1 bg-indigo-600 rounded-full animate-ping" /> REAL-TIME STATUS
             </div>
             <span>End of Month</span>
          </div>
        </div>
      </div>

      {/* 4. 정보 안내 패널 */}
      <div className="bg-slate-100 rounded-3xl p-8 flex items-start gap-5 border border-slate-200">
         <div className="p-3 bg-white rounded-2xl text-slate-500 shadow-sm shrink-0"><Info size={24} /></div>
         <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-900 uppercase">Operational Intelligence Guide</h4>
            <p className="text-xs text-slate-500 font-bold leading-relaxed max-w-2xl">
              성장 추이 지표는 이번 달 주차별 실적을 기반으로 시스템 알고리즘이 실시간 정산합니다. <br/>
              확정되지 않은 예약을 보증서 발행으로 신속히 전환하여 매장의 안정적인 현금 흐름을 확보하십시오.
            </p>
         </div>
      </div>

      {/* 5. 마케팅 브릿지 모달 (PC형 디자인) */}
      {showMarketingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setShowMarketingModal(false)}>
           <div className="bg-white w-full max-w-[480px] rounded-[3rem] shadow-2xl relative flex flex-col p-10 overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-10">
                 <div>
                    <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 inline-block">Marketing Engine v1.2</div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-tight">비즈니스 성장을 위한<br/>최적의 전략을 선택하세요</h3>
                 </div>
                 <button onClick={() => setShowMarketingModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors"><X size={24}/></button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                 <button onClick={() => navigate('/marketing')} className="group p-6 bg-indigo-600 rounded-[2rem] flex items-center justify-between active:scale-[0.98] transition-all shadow-xl shadow-indigo-200">
                    <div className="flex items-center gap-5">
                       <div className="p-3 bg-white/20 rounded-2xl text-white shadow-inner"><MessageSquare size={24} /></div>
                       <div className="text-left">
                          <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-0.5">CRM Strategy</p>
                          <p className="text-lg font-black text-white leading-none">기존 단골 고객 관리하기</p>
                       </div>
                    </div>
                    <ArrowUpRight size={20} className="text-white opacity-40 group-hover:opacity-100 transition-all" />
                 </button>

                 <button onClick={() => navigate('/creator')} className="group p-6 bg-slate-900 rounded-[2rem] flex items-center justify-between active:scale-[0.98] transition-all shadow-xl shadow-slate-300">
                    <div className="flex items-center gap-5">
                       <div className="p-3 bg-white/10 rounded-2xl text-white shadow-inner"><Edit3 size={24} /></div>
                       <div className="text-left">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">AI Acquisition</p>
                          <p className="text-lg font-black text-white leading-none">AI 기반 홍보 콘텐츠 생성</p>
                       </div>
                    </div>
                    <ArrowUpRight size={20} className="text-white opacity-40 group-hover:opacity-100 transition-all" />
                 </button>
              </div>
              <p className="text-center text-[10px] font-bold text-slate-400 mt-8 uppercase tracking-widest">Growth Engine Analysis is Powered by GLUNEX AI</p>
           </div>
        </div>
      )}

      <style>{`
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Sales;