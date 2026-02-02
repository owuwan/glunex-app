import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Wallet, TrendingUp, Calendar, CheckCircle2, 
  Clock, Sparkles, MessageSquare, Edit3, 
  ChevronRight, Info, X, Loader2, ArrowUpRight, 
  Target, Zap, ArrowRight, BarChart3, Filter,
  Download, PieChart, Activity
} from 'lucide-react';

// [오류 방지] 상대 경로를 사용하여 Firebase 설정 로드
import { auth, db } from '../../firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

/**
 * PcSales: 앱의 매출 분석 로직을 100% 계승한 PC 전용 분석 페이지
 */
const PcSales = () => {
  const navigate = useNavigate();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'glunex-app';

  // --- [상태 관리] ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  
  const [stats, setStats] = useState({
    confirmed: 0,  // 보증서 발행완료
    pending: 0,    // 작업 완료 (미발행)
    upcoming: 0,   // 향후 예약건
    total: 0
  });

  const [chartData, setChartData] = useState([]);
  const currentMonth = new Date().getMonth() + 1;

  // --- [1. 인증 로직] ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
      } else {
        try { await signInAnonymously(auth); } catch (e) { navigate('/login'); }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // --- [2. 매출 분석 로직: 앱 버전 로직 100% 이식] ---
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
          const d = new Date(data.issuedAt);
          if (d.getFullYear() === currentYear && d.getMonth() === currentMonthIdx) {
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

        setStats({ 
          confirmed: confirmedSum, 
          pending: pendingSum, 
          upcoming: upcomingSum, 
          total: confirmedSum + pendingSum + upcomingSum 
        });
        
        const maxVal = Math.max(...dailyStats.map(d => d.confirmed + d.pending + d.upcoming), 1000000);
        setChartData(dailyStats.map(d => ({
          name: `${d.day}`,
          confirmed: (d.confirmed / maxVal) * 100,
          pending: (d.pending / maxVal) * 100,
          upcoming: (d.upcoming / maxVal) * 100,
          isToday: d.dateStr === todayStr
        })));
        setLoading(false);
      });
      return () => unsubS();
    });
    return () => unsubW();
  }, [user, appId]);

  // SVG 차트 경로 생성 함수
  const generatePath = (data, key, height = 240, width = 1000) => {
    if (data.length === 0) return "";
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (Math.max(d[key], 0) / 100) * height;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  const generateAreaPath = (data, key, height = 240, width = 1000) => {
    if (data.length === 0) return "";
    const linePath = generatePath(data, key, height, width);
    return `${linePath} L ${width},${height} L 0,${height} Z`;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 className="animate-spin text-slate-300 mb-4" size={32} />
      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Generating Revenue Report...</p>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500 text-left pb-10">
      
      {/* 1. Header Area */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              REVENUE <span className="text-indigo-600">ANALYTICS</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{currentMonth}월 실시간 매출 및 성장 스트림</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
             <Filter size={14} /> 상세 필터
           </button>
           <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-sm">
             <Download size={14} /> 리포트 다운로드
           </button>
        </div>
      </div>

      {/* 2. Top Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1 bg-slate-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">실제 가용 수익 (확정+대기)</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-2xl font-black italic">{(stats.confirmed + stats.pending).toLocaleString()}</h3>
              <span className="text-xs font-bold text-slate-500 uppercase">krw</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400">전일 대비 +4.2%</span>
            </div>
          </div>
        </div>
        {[
          { label: 'Confirmed (발행완료)', value: stats.confirmed, color: 'text-indigo-600', icon: CheckCircle2, bg: 'bg-indigo-50' },
          { label: 'Pending (발행대기)', value: stats.pending, color: 'text-emerald-600', icon: Clock, bg: 'bg-emerald-50' },
          { label: 'Upcoming (예약건)', value: stats.upcoming, color: 'text-amber-500', icon: Calendar, bg: 'bg-amber-50' }
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
            <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}><item.icon size={20} /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
              <h3 className="text-xl font-black text-slate-900">{item.value.toLocaleString()}<span className="text-xs font-bold text-slate-300 ml-1">원</span></h3>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Chart & Growth Engine */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Left: Wide Area Chart */}
        <div className="col-span-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase italic">Growth Stream Analysis</h3>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"/><span className="text-[10px] font-black text-slate-400 uppercase">Confirmed</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"/><span className="text-[10px] font-black text-slate-400 uppercase">Pending</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400"/><span className="text-[10px] font-black text-slate-400 uppercase">Upcoming</span></div>
            </div>
          </div>

          <div className="relative h-60 w-full mb-6">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 240" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f46e5" stopOpacity="0.15" /><stop offset="100%" stopColor="#4f46e5" stopOpacity="0" /></linearGradient>
                <linearGradient id="gradG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity="0.05" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></linearGradient>
              </defs>
              {/* 가이드 라인 */}
              {[0, 60, 120, 180, 240].map(v => <line key={v} x1="0" y1={v} x2="1000" y2={v} stroke="#f1f5f9" strokeWidth="1" />)}
              
              {/* 예약 (노란 실선) */}
              <path d={generatePath(chartData, 'upcoming', 240, 1000)} fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
              
              {/* 대기 (그린 영역) */}
              <path d={generateAreaPath(chartData, 'pending', 240, 1000)} fill="url(#gradG)" />
              <path d={generatePath(chartData, 'pending', 240, 1000)} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="6 4" />
              
              {/* 확정 (블루 영역) */}
              <path d={generateAreaPath(chartData, 'confirmed', 240, 1000)} fill="url(#gradB)" />
              <path d={generatePath(chartData, 'confirmed', 240, 1000)} fill="none" stroke="#4f46e5" strokeWidth="3" />

              {/* 오늘 표시 점 */}
              {chartData.map((d, i) => d.isToday && (
                <g key={i}>
                  <line x1={(i/(chartData.length-1))*1000} y1="0" x2={(i/(chartData.length-1))*1000} y2="240" stroke="#4f46e5" strokeWidth="1" strokeDasharray="2 2" />
                  <circle cx={(i/(chartData.length-1))*1000} cy={240 - (d.confirmed/100)*240} r="5" fill="#4f46e5" />
                </g>
              ))}
            </svg>
          </div>
          <div className="flex justify-between px-2">
            <span className="text-[10px] font-black text-slate-300 uppercase">Day 01</span>
            <span className="text-[10px] font-black text-indigo-600 uppercase">Today Point</span>
            <span className="text-[10px] font-black text-slate-300 uppercase">End of Month</span>
          </div>
        </div>

        {/* Right: Insights & Engine */}
        <div className="col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-full">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-amber-500 fill-amber-500" />
                <h3 className="text-sm font-black text-slate-900 uppercase">운영 인사이트</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl flex items-start gap-3">
                   <Info size={16} className="text-slate-400 mt-0.5 shrink-0" />
                   <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                     현재 대기 중인 매출이 <span className="text-slate-900 font-bold">₩{stats.pending.toLocaleString()}</span> 있습니다. 작업 완료된 스케줄을 보증서 발행으로 전환하여 확정 수익을 확보하세요.
                   </p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-2xl flex items-start gap-3 border border-indigo-100/50">
                   <Sparkles size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                   <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">
                     이번 달 성장 추이는 <span className="font-bold underline">안정적</span>입니다. 고단가 시공(유리막/썬팅) 비중을 15% 더 높이면 목표 매출 달성이 가능합니다.
                   </p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowMarketingModal(true)}
              className="w-full mt-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all active:scale-[0.98] group"
            >
              <Sparkles size={18} className="text-amber-400 group-hover:animate-pulse" />
              <span>성장 마케팅 엔진 가동</span>
              <ArrowRight size={16} className="text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Marketing Modal (PC Style Overlay) */}
      {showMarketingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowMarketingModal(false)}>
           <div className="bg-white w-full max-w-[420px] rounded-[2.5rem] shadow-2xl p-10 relative animate-scale-in" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowMarketingModal(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-colors"><X size={24}/></button>
              
              <div className="mb-10 text-left">
                 <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 inline-block">Growth Engine v1.2</div>
                 <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-tight">매출 성장을 위한<br/>전략을 선택하세요</h3>
              </div>

              <div className="space-y-4">
                 <button onClick={() => navigate('/marketing')} className="w-full p-6 bg-indigo-600 rounded-2xl flex items-center justify-between group hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                    <div className="flex items-center gap-5 text-left text-white">
                       <div className="p-3 bg-white/10 rounded-xl"><MessageSquare size={22} /></div>
                       <div>
                          <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-0.5">CRM Retargeting</p>
                          <p className="text-base font-black">기존 단골 고객 관리하기</p>
                       </div>
                    </div>
                    <ArrowUpRight size={18} className="text-white opacity-40 group-hover:opacity-100" />
                 </button>

                 <button onClick={() => navigate('/creator')} className="w-full p-6 bg-slate-900 rounded-2xl flex items-center justify-between group hover:bg-black transition-all shadow-lg">
                    <div className="flex items-center gap-5 text-left text-white">
                       <div className="p-3 bg-white/10 rounded-xl"><Edit3 size={22} /></div>
                       <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">AI Acquisition</p>
                          <p className="text-base font-black">새로운 마케팅 포스팅 쓰기</p>
                       </div>
                    </div>
                    <ArrowUpRight size={18} className="text-white opacity-40 group-hover:opacity-100" />
                 </button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default PcSales;