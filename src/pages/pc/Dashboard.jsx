import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, TrendingUp, Calendar, Clock, 
  ChevronRight, Plus, BarChart3, Loader2, 
  ArrowUpRight, Layers, Activity, X,
  User, Phone, Car, MapPin, FileText,
  AlertCircle, LayoutDashboard, Settings
} from 'lucide-react';

// 앱(Mobile)과 동일한 Firebase 인스턴스 및 로직 사용
import { auth, db } from '@/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';

/**
 * PcDashboard: 앱의 로직을 그대로 유지하되 디자인만 PC 전문 툴로 개편
 */
const PcDashboard = () => {
  const navigate = useNavigate();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'glunex-app';

  // --- [앱 버전과 동일한 상태 관리] ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState(null); 
  const [storeName, setStoreName] = useState('글루넥스 파트너');
  
  const [stats, setStats] = useState({
    thisMonthRevenue: 0,
    todayRevenue: 0,
    monthlyCount: 0,
    pendingIssuanceCount: 0, // 발행 대기 (시간 지난 예약)
    growthRate: 0 
  });

  const [recentSchedules, setRecentSchedules] = useState([]);

  // --- [1. 인증 로직: 앱 버전과 동일] ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const userDoc = await getDoc(doc(db, "users", u.uid));
        if (userDoc.exists()) setStoreName(userDoc.data().storeName || '글루넥스 파트너');
      } else {
        try { await signInAnonymously(auth); } catch(e) { navigate('/login'); }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // --- [2. 실시간 데이터 바인딩: 앱 버전 로직 이식] ---
  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const todayStr = now.toLocaleDateString('sv-SE');
    const dayOfMonth = now.getDate();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 보증서 및 스케줄 통합 리스너
    const qWarranties = query(collection(db, "warranties"), where("userId", "==", user.uid));
    const schedulesRef = collection(db, 'artifacts', appId, 'public', 'data', 'schedules');

    const unsubW = onSnapshot(qWarranties, (wSnap) => {
      const unsubS = onSnapshot(schedulesRef, (sSnap) => {
        let mSum = 0; let tSum = 0; let mCount = 0;
        let curPeriodRev = 0; let lastPeriodRev = 0;

        // 매출 데이터 계산
        wSnap.docs.forEach(doc => {
          const d = doc.data();
          if (!d.issuedAt) return;
          const iDate = new Date(d.issuedAt);
          const iDay = iDate.getDate();
          const price = Number(String(d.price || "0").replace(/[^0-9]/g, '')) || 0;

          if (iDate.getFullYear() === currentYear && iDate.getMonth() === currentMonth) {
            mSum += price;
            mCount++;
            if (iDay <= dayOfMonth) curPeriodRev += price;
          }
          if (iDate.getFullYear() === lastMonthYear && iDate.getMonth() === lastMonth) {
            if (iDay <= dayOfMonth) lastPeriodRev += price;
          }
          if (d.issuedAt.split('T')[0] === todayStr) tSum += price;
        });

        const growth = lastPeriodRev > 0 ? ((curPeriodRev - lastPeriodRev) / lastPeriodRev) * 100 : 0;

        // 미발행 건수 및 오늘 스케줄 리스트
        const pending = sSnap.docs.filter(d => {
          const s = d.data();
          if (s.userId !== user.uid) return false;
          // 발행 대기 로직: 오늘 이전 날짜이거나, 오늘이면서 시간이 지난 예약
          return s.date < todayStr || (s.date === todayStr && s.time < currentTime);
        }).length;

        const todayList = sSnap.docs
          .map(d => ({id: d.id, ...d.data()}))
          .filter(s => s.userId === user.uid && s.date === todayStr)
          .sort((a,b) => a.time.localeCompare(b.time));

        setStats({
          thisMonthRevenue: mSum, todayRevenue: tSum,
          monthlyCount: mCount, pendingIssuanceCount: pending,
          growthRate: growth.toFixed(1)
        });
        setRecentSchedules(todayList);
        setLoading(false);
      });
      return () => unsubS();
    });
    return () => unsubW();
  }, [user, appId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 className="animate-spin text-slate-300 mb-4" size={32} />
      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Operations...</p>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-4 animate-in fade-in duration-500 text-left pb-10 px-2">
      
      {/* 1. 상단 지표 영역 (4컬럼) */}
      <div className="grid grid-cols-4 gap-4 pt-2">
        {[
          { label: '당월 누적 매출', value: stats.thisMonthRevenue, unit: '원', icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50', path: '/sales' },
          { label: '금일 실적', value: stats.todayRevenue, unit: '원', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/sales' },
          { label: '당월 시공수 *발행기준', value: stats.monthlyCount, unit: '건', icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50', path: '/sales' },
          { label: '보증서 발행 대기', value: stats.pendingIssuanceCount, unit: '건', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', path: '/sales', alert: stats.pendingIssuanceCount > 0 }
        ].map((item, i) => (
          <button key={i} onClick={() => navigate(item.path)} className={`bg-white p-5 rounded-2xl border ${item.alert ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'} shadow-sm flex items-center gap-4 hover:border-slate-400 transition-all text-left group`}>
            <div className={`p-3 rounded-xl transition-colors ${item.alert ? 'bg-amber-500 text-white' : `${item.bg} ${item.color} group-hover:bg-slate-900 group-hover:text-white`}`}>
              <item.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{item.label}</p>
              <h3 className={`text-xl font-black ${item.alert ? 'text-amber-600' : 'text-slate-900'}`}>
                {item.value.toLocaleString()}<span className="text-xs font-bold text-slate-400 ml-1">{item.unit}</span>
              </h3>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 중앙 컨텐츠 영역 */}
        <div className="col-span-8 space-y-6">
          
          {/* 성장 인사이트 카드 (앱 로직 기반) */}
          <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
             <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-110 transition-transform pointer-events-none">
               <TrendingUp size={240} className="text-white" />
             </div>
             <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-4">
                   <div className="flex items-center gap-2 bg-indigo-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit">
                     <Zap size={10} fill="currentColor"/> Real-time Analytics
                   </div>
                   <h3 className="text-3xl font-black text-white tracking-tight leading-tight">
                      지난달 동기 대비 <br/>
                      매출이 <span className="text-indigo-400">{stats.growthRate}%</span> {Number(stats.growthRate) >= 0 ? '상승' : '하락'}했습니다.
                   </h3>
                   <p className="text-slate-400 text-sm font-medium">사장님, {storeName}의 운영 데이터를 분석한 결과입니다. <br/>지난달 1~{new Date().getDate()}일 매출과 비교한 수치입니다.</p>
                </div>
                <div className="w-48 h-48 bg-white/5 rounded-full border-8 border-white/5 flex flex-col items-center justify-center backdrop-blur-md shrink-0">
                   <span className="text-[10px] font-black text-indigo-400 uppercase mb-1">Growth Index</span>
                   <span className="text-5xl font-black text-white italic">{stats.growthRate}%</span>
                </div>
             </div>
          </div>

          {/* 운영 가이드 (심플 버전) */}
          <div className="grid grid-cols-2 gap-6">
             <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:border-indigo-300 transition-colors cursor-pointer" onClick={() => navigate('/create')}>
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                   <Plus size={24} />
                </div>
                <div className="text-left">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Quick Action</p>
                   <p className="text-sm font-black text-slate-800">신규 시공 보증서 발행</p>
                   <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Create Official Warranty</p>
                </div>
             </div>
             <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shadow-inner">
                   <Settings size={22} />
                </div>
                <div className="text-left">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">System Status</p>
                   <p className="text-sm font-black text-slate-800">{storeName} 활성화</p>
                   <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      <span className="text-[10px] font-bold text-emerald-600 tracking-tight">Cloud Sync Active</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* 우측 실시간 스케줄 리스트 */}
        <div className="col-span-4 h-full">
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full min-h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-900 uppercase italic">오늘의 시공 스케줄</h3>
                </div>
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">Today</span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-hide">
                {recentSchedules.length > 0 ? recentSchedules.map((s, i) => (
                  <div key={i} onClick={() => setSelectedSchedule(s)} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-500 transition-all cursor-pointer shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center min-w-[45px]">
                        <span className="text-[9px] font-black text-slate-400 uppercase leading-none">{s.time < '12:00' ? 'am' : 'pm'}</span>
                        <span className="text-sm font-black text-indigo-600 mt-1">{s.time}</span>
                      </div>
                      <div className="w-px h-8 bg-slate-200" />
                      <div>
                        <p className="text-sm font-black text-slate-800 leading-tight">{s.carModel}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{s.serviceType}</p>
                      </div>
                    </div>
                    <ArrowUpRight size={14} className="text-slate-300 group-hover:text-indigo-600" />
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 text-center">
                    <Clock size={40} className="mb-4 mx-auto" />
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
                <div className="bg-indigo-500 p-1.5 rounded-lg text-white"><Calendar size={16}/></div>
                <span className="text-xs font-black uppercase tracking-widest text-indigo-300">Reservation Info</span>
              </div>
              <h3 className="text-3xl font-black tracking-tight">{selectedSchedule.carModel}</h3>
              <p className="text-slate-400 font-bold mt-1 uppercase italic">{selectedSchedule.serviceType} PREMIUM SERVICE</p>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400"><Clock size={18}/></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Schedule</p><p className="font-bold text-slate-900">{selectedSchedule.date} {selectedSchedule.time}</p></div>
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
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">License Plate</p><p className="font-bold text-slate-900">{selectedSchedule.plateNumber || '정보 없음'}</p></div>
                </div>
              </div>

              {selectedSchedule.memo && (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2 text-slate-400"><FileText size={14}/><span className="text-[10px] font-black uppercase">Memo</span></div>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">{selectedSchedule.memo}</p>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                 <button onClick={() => navigate('/create', { state: { schedule: selectedSchedule } })} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:bg-black transition-all">보증서 발행하기</button>
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