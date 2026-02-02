import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, TrendingUp, Calendar, CheckCircle2, 
  Clock, Sparkles, MessageSquare, ChevronRight, 
  Plus, Users, Zap, BarChart3, Sun, Cloud, 
  CloudRain, Wind, Loader2, Info, ArrowUpRight,
  Monitor, Cpu, Layers
} from 'lucide-react';

// [오류 수정] Vite Alias(@)를 사용하여 Firebase 설정 파일 경로를 절대 경로로 참조합니다.
import { auth, db } from '@/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';

/**
 * PcDashboard: PC 전용 고도화 대시보드
 * 당월(2026년 2월) 매출 집계 버그 수정 및 하이엔드 UI 적용 버전
 */
const PcDashboard = () => {
  const navigate = useNavigate();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'glunex-app';

  // --- [상태 관리] ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('글루넥스 파트너');
  const [weather, setWeather] = useState({ temp: 0, status: 'clear' });
  
  // 매출 및 통계 상태 (2월 데이터 집중)
  const [stats, setStats] = useState({
    thisMonthRevenue: 0,  // 2월 확정 매출
    todayRevenue: 0,      // 오늘(2월 2일) 매출
    monthlyCount: 0       // 2월 총 시공 건수
  });

  const [recentSchedules, setRecentSchedules] = useState([]);

  // --- [1. 인증 로직] ---
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

  // --- [2. 날씨 데이터 연동] ---
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const API_KEY = "651347101e403d6d0669288124237d45";
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid=${API_KEY}&units=metric&lang=kr`);
        const data = await res.json();
        if (data.cod === 200) {
          setWeather({ temp: Math.round(data.main.temp), status: data.weather[0].main });
        }
      } catch (e) { console.error("Weather API Error"); }
    };
    fetchWeather();
  }, []);

  // --- [3. 실시간 매출 분석 로직 - 2월 필터링 강화] ---
  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 2월 기준 1
    const todayStr = now.toLocaleDateString('sv-SE'); // 'YYYY-MM-DD'

    // 보증서(매출) 데이터 구독
    const qWarranties = query(collection(db, "warranties"), where("userId", "==", user.uid));
    const unsubWarranties = onSnapshot(qWarranties, (snapshot) => {
      // 리스너 호출 시마다 초기화하여 중복 합산 방지
      let mSum = 0;
      let tSum = 0;
      let mCount = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!data.issuedAt) return;

        const issuedDate = new Date(data.issuedAt);
        const datePart = data.issuedAt.split('T')[0];

        const isSameYear = issuedDate.getFullYear() === currentYear;
        const isSameMonth = issuedDate.getMonth() === currentMonth;
        const isToday = datePart === todayStr;

        const price = Number(String(data.price || "0").replace(/[^0-9]/g, '')) || 0;

        // 이번 달(2월) 데이터만 합산
        if (isSameYear && isSameMonth) {
          mSum += price;
          mCount += 1;
        }

        // 오늘(2월 2일) 데이터 합산
        if (isToday) {
          tSum += price;
        }
      });

      setStats({
        thisMonthRevenue: mSum,
        todayRevenue: tSum,
        monthlyCount: mCount
      });
      setLoading(false);
    }, (err) => {
      console.error("Firestore Sync Error:", err);
      setLoading(false);
    });

    // 오늘 스케줄 데이터 구독
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
    if (s?.includes('clear')) return <Sun className="text-amber-500 fill-amber-500" size={24} />;
    if (s?.includes('cloud')) return <Cloud className="text-slate-400 fill-slate-400" size={24} />;
    return <CloudRain className="text-blue-500" size={24} />;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)]">
      <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
      <p className="text-slate-400 font-black tracking-widest uppercase text-xs">Synchronizing Core Engine...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10 text-left">
      
      {/* 헤더 섹션 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3">
            <Cpu size={28} className="text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational Intelligence Active</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
              GLUNEX <span className="text-indigo-600 not-italic">COMMAND HUB</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Local Env</span>
              <span className="text-sm font-black text-slate-700 leading-none">{weather.temp}°C Seoul</span>
            </div>
            {getWeatherIcon(weather.status)}
          </div>
          <button onClick={() => navigate('/create')} className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95">
            <Plus size={20} strokeWidth={3} /> 신규 보증서 발행
          </button>
        </div>
      </div>

      {/* 매출 KPI 섹션 */}
      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform"><Wallet size={120} /></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><TrendingUp size={18} /></div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{new Date().getMonth() + 1}월 실시간 매출 정산</span>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-5xl font-black text-slate-900 tracking-tighter italic">
                {stats.thisMonthRevenue.toLocaleString()}
              </h3>
              <span className="text-lg font-bold text-slate-300 uppercase">krw</span>
            </div>
            <div className="mt-8 pt-8 border-t border-slate-100 flex gap-8">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Today Success</p>
                <p className="text-lg font-black text-indigo-600">₩{stats.todayRevenue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Monthly Count</p>
                <p className="text-lg font-black text-slate-900">{stats.monthlyCount}건</p>
              </div>
            </div>
          </div>
        </div>

        <button onClick={() => navigate('/creator')} className="bg-indigo-600 p-10 rounded-[3rem] shadow-xl shadow-indigo-100 flex flex-col justify-between text-left group active:scale-[0.98] transition-all">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white"><Sparkles size={24} /></div>
          <div>
            <h4 className="text-white text-2xl font-black tracking-tight leading-tight mb-2">AI 마케팅<br/>콘텐츠 생성</h4>
            <p className="text-indigo-100 text-xs font-bold opacity-70">블로그/인스타 포스팅 10초 완성</p>
          </div>
          <div className="flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-widest mt-4">
            Launch Agent <ArrowUpRight size={14} />
          </div>
        </button>

        <button onClick={() => navigate('/marketing')} className="bg-slate-900 p-10 rounded-[3rem] shadow-xl flex flex-col justify-between text-left group active:scale-[0.98] transition-all">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white"><MessageSquare size={24} /></div>
          <div>
            <h4 className="text-white text-2xl font-black tracking-tight leading-tight mb-2">단골 고객<br/>재방문 유도</h4>
            <p className="text-slate-500 text-xs font-bold">날씨 맞춤형 자동 타겟 마케팅</p>
          </div>
          <div className="flex items-center gap-2 text-indigo-400 font-black text-[10px] uppercase tracking-widest mt-4">
            Open CRM Center <ArrowUpRight size={14} />
          </div>
        </button>
      </div>

      {/* 하단 상세 정보 */}
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-1 bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 italic uppercase">
              <Calendar size={18} className="text-indigo-600" /> Today Schedule
            </h3>
            <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase">{recentSchedules.length} 건</span>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto pr-1 scrollbar-hide">
            {recentSchedules.length > 0 ? recentSchedules.map((s, i) => (
              <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-200 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center text-indigo-600 font-black border border-slate-100">
                    <span className="text-[8px] leading-none uppercase">{s.time < '12:00' ? 'am' : 'pm'}</span>
                    <span className="text-xs leading-none mt-0.5">{s.time}</span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 leading-tight">{s.carModel}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{s.serviceType}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                <Clock size={40} className="mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">일정 없음</p>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-2 space-y-6">
          <div className="bg-indigo-50 rounded-[2.5rem] p-10 border border-indigo-100 flex items-center justify-between overflow-hidden relative group">
            <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:rotate-12 transition-transform"><Zap size={200} /></div>
            <div className="space-y-4 max-w-lg">
              <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit">
                Power Insight
              </div>
              <h3 className="text-2xl font-black text-indigo-900 tracking-tight leading-tight">
                사장님, 현재 {storeName}의 <br/>이번 달 성장이 아주 안정적입니다.
              </h3>
              <p className="text-sm text-indigo-600/70 font-bold leading-relaxed">
                2월 현재까지 {stats.monthlyCount}건의 시공이 기록되었습니다. <br/>
                오늘 예약된 고객들에게 방문 전 확인 문자를 자동으로 발송해 보세요.
              </p>
              <button onClick={() => navigate('/sales')} className="text-xs font-black text-indigo-700 flex items-center gap-1.5 hover:underline">상세 리포트 보기 <ChevronRight size={14}/></button>
            </div>
            <div className="w-36 h-36 bg-white rounded-full shadow-2xl shadow-indigo-200 flex flex-col items-center justify-center border-8 border-indigo-100 relative z-10">
              <span className="text-[10px] font-black text-slate-400 uppercase mb-1">Status</span>
              <span className="text-3xl font-black text-indigo-600 italic">Excellent</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className="bg-white p-8 rounded-[2rem] border border-slate-200 flex items-center gap-5">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shadow-inner"><Layers size={22}/></div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Membership</p>
                   <p className="text-sm font-black text-slate-800">Premium Partner</p>
                </div>
             </div>
             <div className="bg-white p-8 rounded-[2rem] border border-slate-200 flex items-center gap-5">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shadow-inner"><Monitor size={22}/></div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Version</p>
                   <p className="text-sm font-black text-slate-800">Glunex Core v2.2.0</p>
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