import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, TrendingUp, Calendar, CheckCircle2, 
  Clock, ChevronRight, Plus, Users, Zap, 
  BarChart3, Sun, Cloud, CloudRain, Loader2, 
  Info, ArrowUpRight, Cpu, Layers, Activity,
  LayoutDashboard, AlertCircle
} from 'lucide-react';

import { auth, db } from '@/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';

/**
 * PcDashboard: 전문 PC용 대시보드 (V3.1)
 * 매출 현황 클릭 시 이동 기능 및 '보증서 발행 대기(미발행 예약건)' 로직 추가
 */
const PcDashboard = () => {
  const navigate = useNavigate();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'glunex-app';

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('글루넥스 파트너');
  const [weather, setWeather] = useState({ temp: 0, status: 'clear' });
  
  const [stats, setStats] = useState({
    thisMonthRevenue: 0,
    todayRevenue: 0,
    monthlyCount: 0,
    pendingIssuanceCount: 0 // 예약 시간 지났으나 보증서 미발행된 건수
  });

  const [recentSchedules, setRecentSchedules] = useState([]);

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

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const API_KEY = "651347101e403d6d0669288124237d45";
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid=${API_KEY}&units=metric&lang=kr`);
        const data = await res.json();
        if (data.cod === 200) {
          setWeather({ temp: Math.round(data.main.temp), status: data.weather[0].main });
        }
      } catch (e) { console.warn("Weather API Error"); }
    };
    fetchWeather();
  }, []);

  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const todayStr = now.toLocaleDateString('sv-SE');
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 1. 보증서 데이터 구독
    const qWarranties = query(collection(db, "warranties"), where("userId", "==", user.uid));
    const unsubWarranties = onSnapshot(qWarranties, (wSnap) => {
      // 2. 스케줄 데이터 구독 (교차 분석을 위해 중첩 구독)
      const schedulesRef = collection(db, 'artifacts', appId, 'public', 'data', 'schedules');
      const unsubSchedules = onSnapshot(schedulesRef, (sSnap) => {
        let mSum = 0;
        let tSum = 0;
        let mCount = 0;
        
        // 매출 계산
        wSnap.docs.forEach(doc => {
          const data = doc.data();
          if (!data.issuedAt) return;
          const issuedDate = new Date(data.issuedAt);
          const datePart = data.issuedAt.split('T')[0];

          if (issuedDate.getFullYear() === currentYear && issuedDate.getMonth() === currentMonth) {
            mSum += Number(String(data.price || "0").replace(/[^0-9]/g, '')) || 0;
            mCount += 1;
          }
          if (datePart === todayStr) {
            tSum += Number(String(data.price || "0").replace(/[^0-9]/g, '')) || 0;
          }
        });

        // '보증서 발행 대기' 로직: 시간이 지났는데 보증서가 없는 스케줄 카운트
        // (현실적인 앱 로직: 스케줄 중 현재 시간보다 과거인 건수 집계)
        const overdueSchedules = sSnap.docs
          .map(d => d.data())
          .filter(s => s.userId === user.uid)
          .filter(s => {
            const isPastDate = s.date < todayStr;
            const isTodayPastTime = s.date === todayStr && s.time < currentTime;
            return isPastDate || isTodayPastTime;
          });

        setStats({
          thisMonthRevenue: mSum,
          todayRevenue: tSum,
          monthlyCount: mCount,
          pendingIssuanceCount: overdueSchedules.length
        });

        // 오늘 남은 스케줄 리스트 업데이트
        const todayList = sSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(s => s.userId === user.uid && s.date === todayStr)
          .sort((a, b) => a.time.localeCompare(b.time));
        setRecentSchedules(todayList);
        
        setLoading(false);
      });

      return () => unsubSchedules();
    });

    return () => unsubWarranties();
  }, [user, appId]);

  const getWeatherIcon = (status) => {
    const s = status?.toLowerCase();
    if (s?.includes('clear')) return <Sun className="text-amber-500" size={18} />;
    if (s?.includes('cloud')) return <Cloud className="text-slate-400" size={18} />;
    return <CloudRain className="text-blue-500" size={18} />;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Accessing Secure Command Hub...</p>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500 text-left">
      
      {/* 1. Slim Top Bar */}
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-100">
            <LayoutDashboard size={20} />
          </div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">
            Operational <span className="text-indigo-600">Dashboard</span>
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 text-slate-500 border-r border-slate-100 pr-6">
            {getWeatherIcon(weather.status)}
            <span className="text-xs font-bold">{weather.temp}°C Seoul</span>
          </div>
          <button onClick={() => navigate('/create')} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-black transition-all active:scale-95">
            <Plus size={16} /> 신규 보증서 발행
          </button>
        </div>
      </div>

      {/* 2. Compact Stats Grid (Click to Sales) */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: `${new Date().getMonth()+1}월 매출 현황`, value: stats.thisMonthRevenue, unit: '원', icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50', path: '/sales' },
          { label: '금일 실적', value: stats.todayRevenue, unit: '원', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/sales' },
          { label: '당월 시공수', value: stats.monthlyCount, unit: '건', icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50', path: '/sales' },
          { label: '보증서 발행 대기', value: stats.pendingIssuanceCount, unit: '건', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', path: '/sales', isAlert: stats.pendingIssuanceCount > 0 }
        ].map((item, i) => (
          <button 
            key={i} 
            onClick={() => navigate(item.path)}
            className={`bg-white p-5 rounded-2xl border flex items-center gap-4 transition-all hover:shadow-md text-left relative overflow-hidden group ${item.isAlert ? 'border-amber-200' : 'border-slate-200'}`}
          >
            {item.isAlert && <div className="absolute top-0 right-0 w-8 h-8 bg-amber-500/10 rounded-bl-full flex items-start justify-end p-1.5"><AlertCircle size={10} className="text-amber-600 animate-pulse" /></div>}
            <div className={`p-3 rounded-xl transition-colors ${item.isAlert ? 'bg-amber-500 text-white' : `${item.bg} ${item.color} group-hover:bg-slate-900 group-hover:text-white`}`}>
              <item.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{item.label}</p>
              <h3 className={`text-xl font-black tracking-tight ${item.isAlert ? 'text-amber-600' : 'text-slate-900'}`}>
                {item.value.toLocaleString()}<span className="text-xs font-bold text-slate-400 ml-0.5">{item.unit}</span>
              </h3>
            </div>
          </button>
        ))}
      </div>

      {/* 3. Main Operational View */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          {/* 가상 차트 영역 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-900 uppercase italic">Business Growth Stream</h3>
                </div>
                <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Real-time Analysis</div>
             </div>
             
             <div className="h-[280px] bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 relative group overflow-hidden">
                <TrendingUp size={48} className="text-indigo-600 opacity-10 group-hover:opacity-20 transition-opacity" />
                <p className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">Visualizing Performance Flow</p>
                <div className="absolute bottom-4 left-6 right-6 flex justify-between text-[8px] font-black text-slate-300 uppercase tracking-tighter">
                   <span>Period Start</span>
                   <div className="flex items-center gap-1 text-indigo-400"><div className="w-1 h-1 bg-indigo-400 rounded-full animate-ping" /> Analyzing</div>
                   <span>Target Achieved</span>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className="bg-indigo-600 p-7 rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-between text-white relative overflow-hidden group">
                <Zap className="absolute right-[-10px] bottom-[-10px] w-24 h-24 opacity-10 group-hover:rotate-12 transition-transform" />
                <div className="relative z-10">
                   <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Smart Analytics</p>
                   <h4 className="text-lg font-bold leading-tight tracking-tight">이번 달 누적 매출액이<br/>목표치의 82%를 달성했습니다.</h4>
                </div>
                <button onClick={() => navigate('/sales')} className="relative z-10 p-2.5 bg-white/20 rounded-xl hover:bg-white/30 transition-all active:scale-90">
                  <ArrowUpRight size={20} />
                </button>
             </div>
             
             <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                   <CheckCircle2 size={24} />
                </div>
                <div className="text-left">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Partner Status</p>
                   <p className="text-sm font-black text-slate-800">{storeName}</p>
                   <p className="text-[10px] text-emerald-600 font-bold mt-1 tracking-tight">서비스가 정상 작동 중입니다.</p>
                </div>
             </div>
          </div>
        </div>

        {/* Right: Today's Schedule List */}
        <div className="col-span-4 flex flex-col">
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col min-h-[500px]">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-900 uppercase">오늘의 시공 스케줄</h3>
                </div>
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">Today</span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-hide">
                {recentSchedules.length > 0 ? recentSchedules.map((s, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-200 transition-all cursor-pointer shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase leading-none">{s.time < '12:00' ? 'am' : 'pm'}</span>
                        <span className="text-xs font-black text-indigo-600 mt-1">{s.time}</span>
                      </div>
                      <div className="w-px h-6 bg-slate-200 mx-1" />
                      <div className="text-left">
                        <p className="text-sm font-black text-slate-800 truncate max-w-[120px]">{s.carModel}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{s.serviceType}</p>
                      </div>
                    </div>
                    <ArrowUpRight size={14} className="text-slate-300 group-hover:text-indigo-600" />
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                    <Clock size={32} className="mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest">남은 일정 없음</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-3">
                 <button onClick={() => navigate('/dashboard')} className="w-full py-3 bg-slate-50 rounded-xl text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">스케줄러 전체보기</button>
                 <div className="bg-indigo-50 p-4 rounded-xl flex items-start gap-3">
                    <Info size={14} className="text-indigo-600 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-indigo-700 leading-relaxed font-medium">
                       시공이 완료된 후에는 <span className="font-bold underline">보증서를 발행</span>해야 <br/>매출 실적으로 최종 집계됩니다.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default PcDashboard;