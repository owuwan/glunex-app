import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Crown, MessageSquare, ChevronRight, CloudRain, Sun, 
  TrendingUp, Sparkles, Loader2, MapPin, Wallet, Bell, 
  ArrowUpRight, Calendar, Clock, Car, Tag, Phone, Plus, X, ChevronLeft,
  ChevronDown
} from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';

const Dashboard = () => {
  const navigate = useNavigate();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'glunex-app';
  
  // --- 상태 관리 ---
  const [userName, setUserName] = useState('파트너');
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  
  const [weather, setWeather] = useState({ 
    temp: 0, rain: 0, status: 'clear', region: 'Seoul', targetCustomers: 0, loading: true 
  });

  const [salesData, setSalesData] = useState({ today: 0, monthTotal: 0 });
  const [schedules, setSchedules] = useState([]);
  const currentMonth = new Date().getMonth() + 1;

  // --- 초기화 및 인증 ---
  useEffect(() => {
    const initAuth = async () => {
      if (!auth.currentUser) await signInAnonymously(auth);
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 데이터 페칭 ---
  useEffect(() => {
    if (!user) return;
    const loadUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserName(data.storeName || '글루넥스 파트너');
          let regionName = 'Seoul';
          if (data.address) {
             const firstPart = data.address.split(' ')[0];
             if (!/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(firstPart)) regionName = firstPart;
          }
          fetchRealWeather(regionName);
        } else {
          fetchRealWeather('Seoul');
        }
        await calculateSalesData(user.uid);
      } catch (e) { console.error(e); }
    };
    loadUserData();

    const schedulesRef = collection(db, 'artifacts', appId, 'public', 'data', 'schedules');
    const unsubSchedules = onSnapshot(schedulesRef, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSchedules(list);
    }, (err) => console.error(err));

    return () => unsubSchedules();
  }, [user, appId]);

  const calculateSalesData = async (uid) => {
    try {
      const q = query(collection(db, "warranties"), where("userId", "==", uid));
      const snap = await getDocs(q);
      const now = new Date();
      let monthTotal = 0, todayTotal = 0, targets = 0;
      snap.forEach(doc => {
        const data = doc.data();
        const date = new Date(data.issuedAt);
        const price = Number(String(data.price || "0").replace(/[^0-9]/g, '')) || 0;
        if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) monthTotal += price;
        if (date.toDateString() === now.toDateString()) todayTotal += price;
        const diffDays = Math.ceil(Math.abs(now - date) / (1000 * 60 * 60 * 24));
        if ((data.serviceType === 'wash' || data.serviceType === 'detailing') && diffDays >= 21) targets++;
      });
      setSalesData({ monthTotal, today: todayTotal });
      setWeather(prev => ({ ...prev, targetCustomers: targets }));
    } catch (e) { console.error(e); }
  };

  const fetchRealWeather = async (region) => {
    try {
      const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
      if (!API_KEY) return;
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${region}&appid=${API_KEY}&units=metric&lang=kr`);
      const data = await res.json();
      if (data.cod === 200) {
        setWeather(prev => ({ 
          ...prev, temp: Math.round(data.main.temp), status: data.weather[0].main.toLowerCase().includes('rain') ? 'rainy' : 'clear', region, loading: false 
        }));
      }
    } catch (e) { setWeather(prev => ({ ...prev, loading: false })); }
  };

  const formatTimeDisplay = (time24) => {
    if (!time24) return "";
    const [h, m] = time24.split(':');
    const hourNum = parseInt(h);
    const ampm = hourNum >= 12 ? '오후' : '오전';
    const hour12 = hourNum % 12 || 12;
    return `${ampm} ${hour12}:${m}`;
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySchedules = schedules
    .filter(s => s.date === todayStr && s.userId === user?.uid)
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  return (
    <div className="flex flex-col h-full w-full bg-[#F8F9FB] text-slate-800 font-sans overflow-hidden max-w-md mx-auto shadow-2xl relative select-none text-left">
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-blue-100/40 rounded-full blur-[80px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-slate-200/50 rounded-full blur-[80px]" />
      </div>

      {/* 헤더 */}
      <div className="relative px-6 pt-10 pb-4 z-10 flex justify-between items-center shrink-0">
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full" />
            <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">GLUNEX PARTNER</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight truncate pr-2">{loadingUser ? '...' : userName}</h2>
        </div>
        <div className="flex items-center gap-2 bg-white/70 backdrop-blur-md px-3 py-2 rounded-full border border-slate-200 shadow-sm mx-2 shrink-0">
           <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2">
              {weather.loading ? <Loader2 size={12} className="animate-spin text-slate-300" /> : (
                <>
                  {weather.status === 'rainy' ? <CloudRain size={14} className="text-blue-500" /> : <Sun size={14} className="text-amber-500" />}
                  <span className="text-[11px] font-black text-slate-700">{weather.temp}°</span>
                </>
              )}
           </div>
           <div className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-blue-600 fill-blue-600" />
              <span className="text-[11px] font-black text-slate-700">{weather.targetCustomers}명</span>
           </div>
        </div>
        <button onClick={() => navigate('/mypage')} className="p-2.5 bg-white rounded-full border border-slate-200 active:scale-95 transition-all"><User size={18} className="text-slate-600" /></button>
      </div>

      <div className="flex-1 flex flex-col px-5 pb-6 gap-4 z-10 min-h-0 overflow-y-auto scrollbar-hide">
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="flex gap-3 h-[180px] shrink-0">
              <button onClick={() => navigate('/sales')} className="flex-[1.4] bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-sm relative overflow-hidden group active:scale-[0.98] transition-all flex flex-col justify-between text-left">
                <div className="relative z-10 w-full">
                  <div className="flex items-center gap-1.5 mb-1 text-slate-400"><Wallet size={12} /><span className="text-[9px] font-black uppercase tracking-widest">{currentMonth}월 실적 리포트</span></div>
                  <div className="flex items-baseline gap-1"><span className="text-2xl font-black text-slate-900 tracking-tighter">{salesData.monthTotal.toLocaleString()}</span><span className="text-xs font-bold text-slate-400">원</span></div>
                </div>
                <div className="w-full h-px bg-slate-100 my-2" />
                <div className="relative z-10 w-full"><span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1 block">Today Sales</span><div className="flex items-baseline gap-1"><span className="text-lg font-black text-slate-800 tracking-tighter">{salesData.today.toLocaleString()}</span><span className="text-[10px] font-bold text-slate-400">원</span></div></div>
              </button>

              {/* 스케줄 요약 카드 (전용 페이지로 연결) */}
              <button onClick={() => navigate('/scheduler')} className="flex-[1.1] bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col group active:scale-[0.98] transition-all text-left">
                 <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-100" />
                 <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-1.5 mb-3"><div className="p-1.5 bg-blue-600 rounded-xl text-white shadow-lg"><Calendar size={14} /></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today</span></div>
                        <div className="space-y-2.5 overflow-hidden">
                        {todaySchedules.length > 0 ? todaySchedules.slice(0, 2).map((s, idx) => (
                                <div key={idx} className="flex flex-col gap-0.5 border-l-2 border-blue-600 pl-2">
                                    <p className="text-[10px] font-black text-slate-800 leading-none truncate">{formatTimeDisplay(s.time).split(' ')[1]} | {s.carModel}</p>
                                    <p className="text-[8px] text-slate-400 font-bold truncate">{s.serviceType}</p>
                                </div>
                            )) : (
                            <div className="py-4 flex flex-col items-center justify-center opacity-30">
                                <Clock size={16} className="text-slate-400 mb-1" /><p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Empty</p>
                            </div>
                        )}
                        </div>
                    </div>
                    <div className="mt-2">
                        {todaySchedules.length >= 3 && (
                            <div className="flex items-center gap-1.5 bg-blue-50/80 px-2.5 py-1.5 rounded-xl border border-blue-100 animate-pulse mb-3">
                                <Sparkles size={10} className="text-blue-600 fill-blue-600" />
                                <span className="text-[9px] font-black text-blue-600 leading-none">오늘 총 {todaySchedules.length}건 시공</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between text-[10px] font-black text-slate-300 group-hover:text-blue-600 transition-colors">
                            <span>Calendar</span><ChevronRight size={12} />
                        </div>
                    </div>
                 </div>
              </button>
            </div>

            {/* 메인 서비스 링크 */}
            <div className="flex flex-col gap-3">
              <button onClick={() => navigate('/creator')} className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm text-left">
                 <div className="flex flex-col items-start"><div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-xl bg-indigo-600 text-white"><Sparkles size={14} className="fill-white" /></div><span className="text-base font-black text-indigo-900">AI 마케팅 에이전트</span></div><span className="text-xs text-slate-500 font-medium">네이버 블로그/인스타 포스팅 10초 완성</span></div>
                 <ArrowUpRight size={18} className="text-slate-300 group-hover:text-indigo-500" />
              </button>
              <button onClick={() => navigate('/create')} className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm text-left">
                 <div className="flex flex-col items-start"><div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-xl bg-amber-400 text-white"><Crown size={14} className="fill-white" /></div><span className="text-base font-black text-slate-800">보증서 발행</span></div><span className="text-xs text-slate-500 font-medium">보험수리 대응 공식 시공 보증서 발급</span></div>
                 <ArrowUpRight size={18} className="text-slate-300 group-hover:text-amber-500" />
              </button>
              <button onClick={() => navigate('/marketing')} className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm text-left">
                 <div className="flex flex-col items-start"><div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-xl bg-blue-500 text-white"><MessageSquare size={14} className="fill-white" /></div><span className="text-base font-black text-slate-800">단골 마케팅 센터</span></div><span className="text-xs text-slate-500 font-medium">재방문 유도 알림톡 및 고객 관리</span></div>
                 <ArrowUpRight size={18} className="text-slate-300 group-hover:text-blue-500" />
              </button>
            </div>
          </div>
        <div className="text-center shrink-0 opacity-40 py-8"><p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em]">Powered by GLUNEX AI Hub</p></div>
      </div>
    </div>
  );
};

export default Dashboard;