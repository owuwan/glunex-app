import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, TrendingUp, Calendar, CheckCircle2, 
  Clock, ChevronRight, Plus, Users, Zap, 
  BarChart3, Sun, Cloud, CloudRain, Loader2, 
  Info, ArrowUpRight, Cpu, Layers, Activity,
  Filter, MoreHorizontal, LayoutDashboard
} from 'lucide-react';

import { auth, db } from '@/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';

/**
 * PcDashboard: 전문 PC용 대시보드 (V3)
 * 컴팩트한 디자인, 2월 매출 정확 집계, 중복 메뉴 제거
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
    pendingCount: 0
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

    const qWarranties = query(collection(db, "warranties"), where("userId", "==", user.uid));
    const unsubWarranties = onSnapshot(qWarranties, (snapshot) => {
      let mSum = 0;
      let tSum = 0;
      let mCount = 0;
      let pCount = 0;

      snapshot.docs.forEach(doc => {
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
        
        if (data.status === 'pending') pCount++;
      });

      setStats({
        thisMonthRevenue: mSum,
        todayRevenue: tSum,
        monthlyCount: mCount,
        pendingCount: pCount
      });
      setLoading(false);
    });

    const schedulesRef = collection(db, 'artifacts', appId, 'public', 'data', 'schedules');
    const unsubSchedules = onSnapshot(schedulesRef, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.userId === user.uid && s.date === todayStr)
        .sort((a, b) => a.time.localeCompare(b.time));
      setRecentSchedules(list);
    });

    return () => {
      unsubWarranties();
      unsubSchedules();
    };
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
      <p className="text-slate-400 font-bold text-xs">운영 데이터를 불러오는 중...</p>
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
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase">
              Operational <span className="text-indigo-600">Dashboard</span>
              <span className="bg-slate-100 text-slate-400 text-[9px] font-black px-1.5 py-0.5 rounded tracking-normal ml-2">PRO v2.5</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 text-slate-500 border-r border-slate-100 pr-6">
            {getWeatherIcon(weather.status)}
            <span className="text-xs font-bold">{weather.temp}°C Seoul</span>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => navigate('/create')} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-black transition-all active:scale-95 shadow-sm">
               <Plus size={16} /> 신규 발행
             </button>
          </div>
        </div>
      </div>

      {/* 2. Compact Stats Grid (4 Columns) */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: `${new Date().getMonth()+1}월 매출 현황`, value: stats.thisMonthRevenue, unit: '원', icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: '금일 실적', value: stats.todayRevenue, unit: '원', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: '당월 시공수', value: stats.monthlyCount, unit: '건', icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '승인 대기중', value: stats.pendingCount, unit: '건', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' }
        ].map((item, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:border-slate-300">
            <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}>
              <item.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{item.label}</p>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {item.value.toLocaleString()}<span className="text-xs font-bold text-slate-400 ml-0.5">{item.unit}</span>
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Operational View (Grid Layout) */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Left: Growth Performance & Chart Area (PC Wide Focus) */}
        <div className="col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-900 uppercase">비즈니스 성장 분석 리포트</h3>
                </div>
                <div className="flex gap-2">
                   <button className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400"><Filter size={16}/></button>
                   <button className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400"><MoreHorizontal size={16}/></button>
                </div>
             </div>
             
             {/* 가상 차트 영역 (실제 데이터 연동용 플레이스홀더) */}
             <div className="h-[280px] bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-t from-white/50 to-transparent" />
                <div className="flex flex-col items-center gap-3 opacity-30 group-hover:opacity-50 transition-opacity">
                   <TrendingUp size={48} className="text-indigo-600" />
                   <p className="text-xs font-black uppercase tracking-widest">Real-time Performance Visualizing...</p>
                </div>
                {/* 하단 가이드 */}
                <div className="absolute bottom-4 left-6 right-6 flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                   <span>Start of Period</span>
                   <span>Mid-Analysis</span>
                   <span>Today's Point</span>
                </div>
             </div>
          </div>

          {/* Quick Insights Row */}
          <div className="grid grid-cols-2 gap-6">
             <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-between text-white relative overflow-hidden group">
                <Zap className="absolute right-[-10px] bottom-[-10px] w-24 h-24 opacity-10 group-hover:rotate-12 transition-transform" />
                <div className="relative z-10">
                   <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">AI Smart Insight</p>
                   <h4 className="text-lg font-bold leading-tight">이번 달 시공 완료 건수가<br/>전월 대비 12% 증가했습니다.</h4>
                </div>
                <button onClick={() => navigate('/sales')} className="relative z-10 p-3 bg-white/20 rounded-xl hover:bg-white/30 transition-all active:scale-90">
                  <ChevronRight size={20} />
                </button>
             </div>
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                   <Users size={22} />
                </div>
                <div className="text-left">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Partner Store</p>
                   <p className="text-sm font-black text-slate-800">{storeName}</p>
                   <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      <span className="text-[10px] font-bold text-emerald-600">정식 가맹점 운영중</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Right: Real-time Schedule List (Sleek List) */}
        <div className="col-span-4 h-full">
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-900 uppercase">오늘의 시공 스케줄</h3>
                </div>
                <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{recentSchedules.length} 건</span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-hide">
                {recentSchedules.length > 0 ? recentSchedules.map((s, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-200 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase leading-none">{s.time < '12:00' ? 'am' : 'pm'}</span>
                        <span className="text-xs font-black text-indigo-600 mt-0.5">{s.time}</span>
                      </div>
                      <div className="w-px h-6 bg-slate-200 mx-1" />
                      <div className="text-left">
                        <p className="text-sm font-black text-slate-800 truncate max-w-[120px]">{s.carModel}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{s.serviceType}</p>
                      </div>
                    </div>
                    <ArrowUpRight size={14} className="text-slate-300 group-hover:text-indigo-600" />
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                    <Clock size={32} className="mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest">일정 없음</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-100">
                 <button onClick={() => navigate('/dashboard')} className="w-full py-3 bg-slate-50 rounded-xl text-slate-500 font-bold text-[11px] uppercase tracking-widest hover:bg-slate-100 transition-all">전체 일정 보기</button>
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