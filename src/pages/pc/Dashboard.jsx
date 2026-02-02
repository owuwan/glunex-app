import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, TrendingUp, Calendar, Clock, 
  ChevronRight, Plus, BarChart3, Loader2, 
  ArrowUpRight, Layers, Activity, X,
  User, Phone, Car, MapPin, FileText
} from 'lucide-react';

// [오류 수정] 상대 경로를 사용하여 프로젝트 구조에 맞게 firebase를 불러옵니다.
import { auth, db } from '../../firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';

const PcDashboard = () => {
  const navigate = useNavigate();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'glunex-app';

  // --- 상태 관리 ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState(null); // 팝업용
  
  const [stats, setStats] = useState({
    thisMonthRevenue: 0,
    todayRevenue: 0,
    monthlyCount: 0,
    pendingIssuanceCount: 0,
    growthRate: 0 // 전월 동기 대비 성장률
  });

  const [chartData, setChartData] = useState({ current: [], last: [] });
  const [recentSchedules, setRecentSchedules] = useState([]);

  // --- 인증 및 초기 데이터 ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) setUser(u);
      else {
        try { await signInAnonymously(auth); } catch(e) { navigate('/login'); }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // --- 핵심 로직: 매출 비교 및 스케줄 분석 ---
  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const todayStr = now.toLocaleDateString('sv-SE');
    const dayOfMonth = now.getDate(); // 오늘 2일

    // 1. 보증서(매출) 및 스케줄 통합 구독
    const qWarranties = query(collection(db, "warranties"), where("userId", "==", user.uid));
    const schedulesRef = collection(db, 'artifacts', appId, 'public', 'data', 'schedules');

    const unsubW = onSnapshot(qWarranties, (wSnap) => {
      const unsubS = onSnapshot(schedulesRef, (sSnap) => {
        
        let mSum = 0; let tSum = 0; let mCount = 0;
        let curPeriodRev = 0; let lastPeriodRev = 0;

        // 매출(보증서) 분석
        wSnap.docs.forEach(doc => {
          const d = doc.data();
          if (!d.issuedAt) return;
          const iDate = new Date(d.issuedAt);
          const iDay = iDate.getDate();
          const price = Number(String(d.price || "0").replace(/[^0-9]/g, '')) || 0;

          // 이번달 전체
          if (iDate.getFullYear() === currentYear && iDate.getMonth() === currentMonth) {
            mSum += price;
            mCount++;
            if (iDay <= dayOfMonth) curPeriodRev += price; // 1~2일 매출
          }
          // 지난달 1~2일 매출 비교용
          if (iDate.getFullYear() === lastMonthYear && iDate.getMonth() === lastMonth) {
            if (iDay <= dayOfMonth) lastPeriodRev += price;
          }
          // 오늘 매출
          if (d.issuedAt.split('T')[0] === todayStr) tSum += price;
        });

        // 성장률 계산 (2월 1~2일 vs 1월 1~2일)
        const growth = lastPeriodRev > 0 ? ((curPeriodRev - lastPeriodRev) / lastPeriodRev) * 100 : 0;

        // 스케줄 요일별 비교 분석 (0:일, 1:월 ...)
        const curWeekData = [0,0,0,0,0,0,0];
        const lastWeekData = [0,0,0,0,0,0,0];

        sSnap.docs.forEach(doc => {
          const s = doc.data();
          if (s.userId !== user.uid) return;
          const sDate = new Date(s.date);
          const sDay = sDate.getDay();

          if (sDate.getFullYear() === currentYear && sDate.getMonth() === currentMonth) {
             curWeekData[sDay]++;
          } else if (sDate.getFullYear() === lastMonthYear && sDate.getMonth() === lastMonth) {
             lastWeekData[sDay]++;
          }
        });

        // 미발행 건수 (시간 지난 예약)
        const curH = now.getHours(); const curM = now.getMinutes();
        const pending = sSnap.docs.filter(d => {
          const s = d.data();
          if (s.userId !== user.uid) return false;
          const isPast = s.date < todayStr || (s.date === todayStr && s.time < `${curH}:${curM}`);
          return isPast;
        }).length;

        setStats({
          thisMonthRevenue: mSum, todayRevenue: tSum,
          monthlyCount: mCount, pendingIssuanceCount: pending,
          growthRate: growth.toFixed(1)
        });
        setChartData({ current: curWeekData, last: lastWeekData });
        setRecentSchedules(sSnap.docs.map(d => ({id: d.id, ...d.data()})).filter(s => s.userId === user.uid && s.date === todayStr).sort((a,b) => a.time.localeCompare(b.time)));
        setLoading(false);
      });
      return () => unsubS();
    });
    return () => unsubW();
  }, [user, appId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
      <p className="text-slate-400 font-bold text-xs">데이터 동기화 중...</p>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-4 animate-in fade-in duration-500 text-left pb-10">
      
      {/* 상단 바 제거 후 바로 스탯 그리드 배치 */}
      <div className="grid grid-cols-4 gap-4 pt-2">
        {[
          { label: '당월 누적 매출', value: stats.thisMonthRevenue, unit: '원', icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50', path: '/sales' },
          { label: '금일 실적', value: stats.todayRevenue, unit: '원', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/sales' },
          { label: '당월 시공수 *보증서 발행기준', value: stats.monthlyCount, unit: '건', icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50', path: '/sales' },
          { label: '보증서 발행 대기', value: stats.pendingIssuanceCount, unit: '건', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', path: '/sales', alert: stats.pendingIssuanceCount > 0 }
        ].map((item, i) => (
          <button key={i} onClick={() => navigate(item.path)} className={`bg-white p-5 rounded-2xl border ${item.alert ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'} shadow-sm flex items-center gap-4 hover:shadow-md transition-all`}>
            <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}><item.icon size={20} /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{item.label}</p>
              <h3 className="text-xl font-black text-slate-900">{item.value.toLocaleString()}<span className="text-xs font-bold text-slate-400 ml-1">{item.unit}</span></h3>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* Left Content (Span 8) */}
        <div className="col-span-8 space-y-6">
          
          {/* 요일별 예약 비교 그래프 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase">요일별 예약 건수 비교 (전월 vs 당월)</h3>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-200"/> <span className="text-[10px] font-bold text-slate-400 uppercase">지난달</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500"/> <span className="text-[10px] font-bold text-slate-400 uppercase">이번달</span></div>
              </div>
            </div>
            
            <div className="h-[250px] flex items-end justify-between px-4 pb-2 relative">
               {['일','월','화','수','목','금','토'].map((day, idx) => {
                 const curVal = chartData.current[idx] || 0;
                 const lastVal = chartData.last[idx] || 0;
                 const max = Math.max(...chartData.current, ...chartData.last, 1);
                 return (
                   <div key={idx} className="flex flex-col items-center gap-2 w-full">
                      <div className="flex items-end gap-1.5 h-full w-full justify-center min-h-[180px]">
                        <div className="w-3 bg-slate-100 rounded-t-sm transition-all duration-700" style={{ height: `${(lastVal/max)*100}%` }} />
                        <div className="w-3 bg-indigo-500 rounded-t-sm transition-all duration-700 shadow-lg shadow-indigo-100" style={{ height: `${(curVal/max)*100}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">{day}</span>
                   </div>
                 )
               })}
            </div>
          </div>

          {/* 전월 동기 대비 매출 성장 그래프 (확대형) */}
          <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
             <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-110 transition-transform"><TrendingUp size={240} className="text-white" /></div>
             <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-4">
                   <div className="bg-indigo-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit">Performance Insight</div>
                   <h3 className="text-3xl font-black text-white tracking-tight leading-tight">
                      지난달 동기(1~{new Date().getDate()}일) 대비 <br/>
                      현재 매출이 <span className="text-indigo-400">{stats.growthRate}%</span> {Number(stats.growthRate) >= 0 ? '성장' : '하락'}했습니다.
                   </h3>
                   <p className="text-slate-400 text-sm font-medium">실시간 보증서 발행 데이터를 기반으로 분석된 지표입니다.</p>
                </div>
                <div className="w-48 h-48 bg-white/5 rounded-full border-8 border-white/5 flex flex-col items-center justify-center backdrop-blur-md">
                   <span className="text-[10px] font-black text-indigo-400 uppercase mb-1">Growth Index</span>
                   <span className="text-5xl font-black text-white italic">{stats.growthRate}%</span>
                </div>
             </div>
          </div>
        </div>

        {/* Right: Schedule List (Span 4) */}
        <div className="col-span-4">
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full min-h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-900 uppercase italic">오늘의 시공 스케줄</h3>
                </div>
                <button onClick={() => navigate('/create')} className="p-1.5 bg-slate-900 text-white rounded-lg hover:bg-black transition-all active:scale-95"><Plus size={16}/></button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-hide">
                {recentSchedules.length > 0 ? recentSchedules.map((s, i) => (
                  <div key={i} onClick={() => setSelectedSchedule(s)} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-500 transition-all cursor-pointer shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center min-w-[45px]">
                        <span className="text-[10px] font-black text-slate-400 uppercase leading-none">{s.time < '12:00' ? 'am' : 'pm'}</span>
                        <span className="text-sm font-black text-indigo-600 mt-1">{s.time}</span>
                      </div>
                      <div className="w-px h-8 bg-slate-200" />
                      <div>
                        <p className="text-sm font-black text-slate-800 leading-tight">{s.carModel}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{s.serviceType}</p>
                      </div>
                    </div>
                    <ArrowUpRight size={16} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                    <Clock size={40} className="mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">예약 일정 없음</p>
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>

      {/* --- 예약 상세 팝업 (Modal) --- */}
      {selectedSchedule && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedSchedule(null)}>
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 p-8 text-white relative">
              <button onClick={() => setSelectedSchedule(null)} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"><X size={20}/></button>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-indigo-500 p-1.5 rounded-lg"><Calendar size={16}/></div>
                <span className="text-xs font-black uppercase tracking-widest text-indigo-300">Reservation Detail</span>
              </div>
              <h3 className="text-3xl font-black tracking-tight">{selectedSchedule.carModel}</h3>
              <p className="text-slate-400 font-bold mt-1 uppercase">{selectedSchedule.serviceType} 시공 예약</p>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400"><Clock size={18}/></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Time</p><p className="font-bold text-slate-900">{selectedSchedule.date} {selectedSchedule.time}</p></div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400"><User size={18}/></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Customer</p><p className="font-bold text-slate-900">{selectedSchedule.customerName || '정보 없음'}</p></div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400"><Phone size={18}/></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Contact</p><p className="font-bold text-slate-900">{selectedSchedule.phone || '정보 없음'}</p></div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400"><Car size={18}/></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Plate Number</p><p className="font-bold text-slate-900">{selectedSchedule.plateNumber || '정보 없음'}</p></div>
                </div>
              </div>

              {selectedSchedule.memo && (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2 text-slate-400"><FileText size={14}/><span className="text-[10px] font-black uppercase">Memo</span></div>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">{selectedSchedule.memo}</p>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                 <button onClick={() => navigate('/create', { state: { schedule: selectedSchedule } })} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">시공 완료 및 보증서 발행</button>
                 <button onClick={() => setSelectedSchedule(null)} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">닫기</button>
              </div>
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

export default PcDashboard;