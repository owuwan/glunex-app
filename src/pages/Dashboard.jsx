import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Crown, MessageSquare, ChevronRight, CloudRain, Sun, 
  TrendingUp, Sparkles, Loader2, MapPin, Wallet, Bell, 
  ArrowUpRight, Calendar, Clock, Car, Tag, Phone, Plus, X, ChevronLeft,
  ChevronDown, StickyNote, CheckCircle2, RefreshCw, AlertTriangle, Send,
  Users, Search, Cloud, CloudSnow, Wind, CloudLightning, Thermometer, ExternalLink
} from 'lucide-react';

// [수정] 외부 파일 의존성 제거 및 직접 초기화 (빌드 오류 및 중복 실행 방지)
// getApps, getApp을 추가로 import하여 앱 상태를 확인합니다.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, addDoc, onSnapshot } from 'firebase/firestore';

// --- Firebase 초기화 (Canvas 환경 호환성 보장) ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "YOUR_API_KEY",
  authDomain: "glunex-app.firebaseapp.com",
  projectId: "glunex-app",
  storageBucket: "glunex-app.appspot.com",
};

// [핵심 수정] Singleton 패턴 적용: 앱이 이미 초기화되어 있다면 기존 앱을 가져옵니다.
// 이 로직이 'Firebase App named [DEFAULT] already exists' 오류(White Screen)를 방지합니다.
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const Dashboard = () => {
  const navigate = useNavigate();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'glunex-app';
  
  // --- [1] 상태 관리 ---
  const [view, setView] = useState('main'); // 'main' | 'calendar' | 'customerList'
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('파트너');
  
  // 데이터 상태
  const [weather, setWeather] = useState({ temp: 0, status: 'clear', region: 'Seoul', targetCustomers: 0, loading: true, forecast: [] });
  const [salesData, setSalesData] = useState({ today: 0, monthTotal: 0 });
  const [schedules, setSchedules] = useState([]);
  const [warranties, setWarranties] = useState([]); // 고객 리스트용 전체 보증서 데이터
  
  // UI 모달 상태
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [selectedSmsData, setSelectedSmsData] = useState(null);
  const [smsAdditionalNote, setSmsAdditionalNote] = useState("");
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toLocaleDateString('sv-SE'));
  const [toastMsg, setToastMsg] = useState("");

  // 고객 상세 보기 상태
  const [selectedCustomerVehicles, setSelectedCustomerVehicles] = useState(null); // 특정 차량 히스토리
  const [customerSearch, setCustomerSearch] = useState("");

  const [newSchedule, setNewSchedule] = useState({ time: '', carModel: '', serviceType: '', price: '', phone: '', memo: '', date: new Date().toLocaleDateString('sv-SE') });
  const [timeParts, setTimeParts] = useState({ ampm: '', hour: '', minute: '' });
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const currentMonth = new Date().getMonth() + 1;

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // --- [2] 인증 로직 (Rule 3) ---
  useEffect(() => {
    const initAuth = async () => {
        // 이미 로그인된 사용자가 없고, 토큰이 제공된 경우에만 로그인 시도
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token && !auth.currentUser) {
            try {
                await signInWithCustomToken(auth, __initial_auth_token);
            } catch (e) {
                console.warn("Auth Warning:", e);
            }
        }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        // 로컬 환경 등에서는 로그인 페이지로 이동
        navigate('/login');
      }
      setAuthChecked(true);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  // --- [3] 데이터 로드 로직 ---
  useEffect(() => {
    if (!user || !authChecked) return;

    const loadData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserName(userDoc.data().storeName || '글루넥스 파트너');
        }
        fetchWeather('Seoul');
        
        // 보증서(고객 데이터 기반) 로드
        try {
            const wQuery = query(collection(db, "warranties"), where("userId", "==", user.uid));
            const wSnap = await getDocs(wQuery);
            const wList = wSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setWarranties(wList);

            // 매출 계산
            let mTotal = 0, tTotal = 0, targets = 0;
            const now = new Date();
            const todayS = now.toDateString();
            
            wList.forEach(w => {
              const d = new Date(w.issuedAt);
              const price = Number(String(w.price || "0").replace(/[^0-9]/g, '')) || 0;
              if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) mTotal += price;
              if (d.toDateString() === todayS) tTotal += price;
              
              // 마케팅 타겟 계산 (21일 경과 고객 등)
              const diff = Math.ceil(Math.abs(now - d) / (1000 * 60 * 60 * 24));
              if (diff >= 21) targets++;
            });
            setSalesData({ monthTotal: mTotal, today: tTotal });
            setWeather(prev => ({ ...prev, targetCustomers: targets }));
        } catch (dbErr) {
            console.warn("DB Access Error (Check Permissions):", dbErr);
        }

      } catch (e) { console.error(e); }
    };
    loadData();

    // 스케줄 실시간 리스너
    const schedulesRef = collection(db, 'artifacts', appId, 'public', 'data', 'schedules');
    const unsubSchedules = onSnapshot(schedulesRef, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSchedules(list.filter(s => s.userId === user.uid));
    }, (err) => console.log("Schedule Listener:", err));

    return () => unsubSchedules();
  }, [user, authChecked, appId]);

  // --- [4] 기능 함수들 ---
  const fetchWeather = async (region) => {
    // 안전한 API 키 처리 (빌드 에러 방지)
    const API_KEY = "YOUR_OPENWEATHER_API_KEY"; 
    
    if (!API_KEY || API_KEY.includes("YOUR_")) {
        setWeather(prev => ({ ...prev, loading: false }));
        return; 
    }

    try {
      // 현재 날씨
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${region}&appid=${API_KEY}&units=metric&lang=kr`);
      const data = await res.json();
      
      // 일기 예보
      const fRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${region}&appid=${API_KEY}&units=metric&lang=kr`);
      const fData = await fRes.json();
      
      if (data.cod === 200) {
        setWeather(prev => ({ 
          ...prev, 
          temp: Math.round(data.main.temp), 
          status: data.weather[0].main, 
          loading: false,
          forecast: fData.list.filter((_, i) => i % 8 === 0).slice(0, 5)
        }));
      }
    } catch (e) { setWeather(prev => ({ ...prev, loading: false })); }
  };

  const getWeatherIcon = (status, size = 16) => {
    const s = status?.toLowerCase();
    if (s?.includes('clear')) return <Sun size={size} className="text-amber-500 fill-amber-500" />;
    if (s?.includes('cloud')) return <Cloud size={size} className="text-slate-400 fill-slate-400" />;
    if (s?.includes('rain')) return <CloudRain size={size} className="text-blue-500" />;
    if (s?.includes('snow')) return <CloudSnow size={size} className="text-blue-300" />;
    if (s?.includes('bolt')) return <CloudLightning size={size} className="text-purple-500" />;
    return <Wind size={size} className="text-slate-300" />;
  };

  const handlePhoneInput = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, "");
    if (val.length > 3 && val.length <= 7) val = val.replace(/(\d{3})(\d{1,4})/, "$1-$2");
    else if (val.length > 7) val = val.replace(/(\d{3})(\d{4})(\d{1,4})/, "$1-$2-$3");
    setNewSchedule(p => ({ ...p, phone: val.substring(0, 13) }));
  };

  const handleAddSchedule = async () => {
    const { ampm, hour, minute } = timeParts;
    const { carModel, serviceType, price, phone, memo, date } = newSchedule;
    if (!ampm || !hour || !minute || !carModel.trim()) return alert("항목을 모두 입력해 주세요.");
    
    let h = parseInt(hour);
    if (ampm === '오후' && h < 12) h += 12;
    if (ampm === '오전' && h === 12) h = 0;
    const formattedTime = `${String(h).padStart(2, '0')}:${minute}`;

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'schedules'), {
        time: formattedTime, displayTime: `${ampm} ${hour}:${minute}`,
        carModel, serviceType, price: (price || "").replace(/,/g, ''),
        phone, memo, date: date || selectedDateStr, userId: user.uid, createdAt: new Date().toISOString()
      });
      setShowAddModal(false);
      setNewSchedule({ time: '', carModel: '', serviceType: '', price: '', phone: '', memo: '', date: selectedDateStr });
      showToast("일정이 성공적으로 추가되었습니다.");
    } catch (e) { alert("저장 실패"); }
  };

  // [기능 1] 우리매장 고객리스트 가공 로직
  const uniqueCustomers = useMemo(() => {
    const map = new Map();
    warranties.forEach(w => {
      const key = `${w.plateNumber || w.customerName}`;
      if (!map.has(key)) {
        map.set(key, {
          name: w.customerName,
          phone: w.phone,
          carModel: w.carModel,
          plateNumber: w.plateNumber,
          lastVisit: w.issuedAt,
          history: [w]
        });
      } else {
        const existing = map.get(key);
        existing.history.push(w);
        if (new Date(w.issuedAt) > new Date(existing.lastVisit)) {
          existing.lastVisit = w.issuedAt;
        }
      }
    });
    
    return Array.from(map.values())
      .filter(c => c.name.includes(customerSearch) || c.carModel.includes(customerSearch) || c.plateNumber?.includes(customerSearch))
      .sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit));
  }, [warranties, customerSearch]);

  const todayStr = new Date().toLocaleDateString('sv-SE');
  const todaySchedules = schedules.filter(s => s.date === todayStr).sort((a,b) => a.time.localeCompare(b.time));

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center bg-white p-8">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-sm font-black text-slate-900 italic tracking-tighter">GLUNEX CORE INITIALIZING...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-[#F8F9FB] text-slate-800 font-sans overflow-hidden max-w-md mx-auto shadow-2xl relative select-none text-left">
      
      {/* 글로벌 토스트 */}
      {toastMsg && (
        <div className="fixed top-12 inset-x-0 z-[200] flex justify-center px-4 animate-bounce-in pointer-events-none">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-full text-xs font-black shadow-2xl flex items-center gap-3 border border-slate-700">
            <CheckCircle2 size={16} className="text-blue-400" /> {toastMsg}
          </div>
        </div>
      )}

      {/* [수정] 상단 헤더 - 날씨 및 타겟 문자 기능 보강 */}
      <header className="relative px-6 pt-10 pb-4 z-10 flex justify-between items-center shrink-0">
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">GLUNEX PARTNER</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 truncate pr-2 tracking-tight">{userName}</h2>
        </div>
        
        <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 shadow-sm mx-2">
           {/* 날씨 버튼 */}
           <button 
             onClick={() => setShowWeatherModal(true)}
             className="flex items-center gap-1.5 border-r border-slate-200 pr-2 active:scale-95 transition-all"
           >
              {weather.loading ? <Loader2 size={12} className="animate-spin text-slate-300" /> : (
                <>
                  {getWeatherIcon(weather.status)}
                  <span className="text-[11px] font-black text-slate-700">{weather.temp}°</span>
                </>
              )}
           </button>
           {/* 타겟 문자 버튼 */}
           <button 
             onClick={() => navigate('/marketing')}
             className="flex items-center gap-1.5 pl-1 active:scale-95 transition-all group"
           >
              <Sparkles size={12} className="text-blue-600 fill-blue-600 group-hover:animate-bounce" />
              <span className="text-[11px] font-black text-slate-700">대상 {weather.targetCustomers}명</span>
           </button>
        </div>

        <button onClick={() => navigate('/mypage')} className="p-2.5 bg-white rounded-full border border-slate-200 active:scale-90 transition-all shadow-sm">
          <User size={18} className="text-slate-600" />
        </button>
      </header>

      <div className="flex-1 flex flex-col px-5 pb-6 gap-4 z-10 overflow-y-auto scrollbar-hide min-h-0">
        
        {view === 'main' ? (
          /* ================= [1. 대시보드 메인] ================= */
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="flex gap-3 h-[175px] shrink-0">
              <button onClick={() => navigate('/sales')} className="flex-[1.4] bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-sm flex flex-col justify-between text-left active:scale-[0.98] transition-all relative overflow-hidden group">
                <div className="relative z-10 w-full text-left">
                  <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                    <Wallet size={12} />
                    <span className="text-[9px] font-black uppercase tracking-tighter">{currentMonth}월 실적 리포트</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">
                    {salesData.monthTotal.toLocaleString()}<span className="text-xs font-bold text-slate-400 ml-1">원</span>
                  </p>
                </div>
                <div className="h-px bg-slate-100 my-2 w-full" />
                <div className="relative z-10 w-full text-left">
                  <span className="text-[9px] font-black text-blue-600 uppercase mb-0.5 block tracking-wide">Today Cumulative</span>
                  <p className="text-lg font-black text-slate-800 tracking-tighter leading-none">{salesData.today.toLocaleString()}원</p>
                </div>
              </button>

              <button onClick={() => setView('calendar')} className="flex-[1.1] bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-sm flex flex-col justify-between text-left active:scale-[0.98] transition-all relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full blur-2xl -mr-10 -mt-10" />
                 <div className="relative z-10 h-full flex flex-col justify-between">
                    <div className="text-left">
                        <div className="flex items-center gap-1.5 mb-3">
                           <div className="p-1.5 bg-blue-600 rounded-xl text-white shadow-lg"><Calendar size={14} /></div>
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today</span>
                        </div>
                        <div className="space-y-2">
                        {todaySchedules.length > 0 ? (
                            todaySchedules.slice(0, 2).map((s, i) => (
                                <div key={i} className="border-l-2 border-blue-600 pl-2">
                                    <p className="text-[10px] font-black text-slate-800 truncate leading-tight">{s.displayTime?.split(' ')[1] || s.time} | {s.carModel}</p>
                                    <p className="text-[8px] text-slate-400 font-bold truncate uppercase">{s.serviceType}</p>
                                </div>
                            ))
                        ) : (
                            <div className="py-4 opacity-30 flex flex-col items-center">
                                <Clock size={16} className="mb-1"/><p className="text-[9px] font-black tracking-widest uppercase">Empty</p>
                            </div>
                        )}
                        </div>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-[10px] font-black text-slate-300 group-hover:text-blue-600 transition-colors">
                       <span>Calendar</span>
                       <ChevronRight size={12} />
                    </div>
                 </div>
              </button>
            </div>

            {/* 서비스 버튼 그룹 (우리매장 고객리스트 수정됨) */}
            <div className="flex flex-col gap-3">
              <button onClick={() => navigate('/creator')} className="bg-white rounded-[1.5rem] border border-slate-200 p-5 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all group">
                 <div className="flex flex-col items-start text-left">
                    <div className="flex items-center gap-2 mb-1">
                       <div className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-100 group-hover:rotate-12 transition-transform"><Sparkles size={14} className="fill-white" /></div>
                       <span className="text-sm font-black text-indigo-900 tracking-tight">AI 마케팅 에이전트</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">네이버 블로그/인스타 포스팅 10초 완성</span>
                 </div>
                 <ArrowUpRight size={18} className="text-slate-300 group-hover:text-indigo-500" />
              </button>

              <button onClick={() => navigate('/create')} className="bg-white rounded-[1.5rem] border border-slate-200 p-5 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all group">
                 <div className="flex flex-col items-start text-left">
                    <div className="flex items-center gap-2 mb-1">
                       <div className="p-1.5 rounded-xl bg-amber-400 text-white shadow-md shadow-amber-100 group-hover:rotate-12 transition-transform"><Crown size={14} className="fill-white" /></div>
                       <span className="text-sm font-black text-slate-800 tracking-tight">서비스 보증서 발행</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">보험수리 대응 공식 시공 보증서 발급</span>
                 </div>
                 <ArrowUpRight size={18} className="text-slate-300 group-hover:text-amber-500" />
              </button>

              <button onClick={() => navigate('/marketing')} className="bg-white rounded-[1.5rem] border border-slate-200 p-5 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all group">
                 <div className="flex flex-col items-start text-left">
                    <div className="flex items-center gap-2 mb-1">
                       <div className="p-1.5 rounded-xl bg-blue-500 text-white shadow-md shadow-blue-100 group-hover:rotate-12 transition-transform"><MessageSquare size={14} className="fill-white" /></div>
                       <span className="text-sm font-black text-slate-800 tracking-tight">단골 마케팅 센터</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">재방문 유도 알림톡 및 고객 관리</span>
                 </div>
                 <ArrowUpRight size={18} className="text-slate-300 group-hover:text-blue-500" />
              </button>

              {/* [신규] 우리매장 고객리스트 버튼 (디자인 통일 수정 완료) */}
              <button onClick={() => setView('customerList')} className="bg-white rounded-[1.5rem] border border-slate-200 p-5 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all group">
                 <div className="flex flex-col items-start text-left">
                    <div className="flex items-center gap-2 mb-1">
                       <div className="p-1.5 rounded-xl bg-slate-800 text-white shadow-md shadow-slate-200 group-hover:rotate-12 transition-transform"><Users size={14} /></div>
                       <span className="text-sm font-black text-slate-800 tracking-tight">우리매장 고객리스트</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium tracking-tight">전체 차량 시공 내역 및 고객 관리 히스토리</span>
                 </div>
                 <ArrowUpRight size={18} className="text-slate-300 group-hover:text-slate-800 transition-colors" />
              </button>
            </div>
          </div>
        ) : view === 'calendar' ? (
          /* ================= [2. 스케줄러 뷰] ================= */
          <div className="flex flex-col gap-6 animate-fade-in pb-10">
             <div className="flex items-center justify-between px-1">
                <button onClick={() => setView('main')} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 active:scale-90 transition-all font-bold text-sm tracking-tight">
                   <ChevronLeft size={20}/> 뒤로가기
                </button>
                <div className="flex bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                   <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2.5 active:bg-slate-50 border-r border-slate-100"><ChevronLeft size={16}/></button>
                   <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2.5 active:bg-slate-50"><ChevronRight size={16}/></button>
                </div>
             </div>
             
             <div className="bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-xl">
                <div className="mb-5 flex justify-between items-center px-1">
                   <p className="text-sm font-black text-slate-900 leading-none">{currentDate.getFullYear()}년 {currentDate.getMonth()+1}월</p>
                   <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"/><span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Live Schedule</span></div>
                </div>
                <div className="grid grid-cols-7 mb-4">
                  {['일','월','화','수','목','금','토'].map((d, i) => (<div key={d} className={`text-center text-[10px] font-black uppercase tracking-widest ${i===0?'text-red-400':i===6?'text-blue-400':'text-slate-400'}`}>{d}</div>))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()}).map((_, i) => <div key={`p-${i}`} className="aspect-square" />)}
                  {Array.from({length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()}).map((_, i) => {
                    const d = i + 1;
                    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    const hasData = schedules.some(s => s.date === dateStr);
                    const isToday = new Date().toLocaleDateString('sv-SE') === dateStr;
                    const isSelected = selectedDateStr === dateStr;
                    return (
                      <button key={d} onClick={() => { setSelectedDateStr(dateStr); setNewSchedule(p => ({ ...p, date: dateStr })); }}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all active:scale-90 ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 z-10' : isToday ? 'bg-blue-50 text-blue-600 border border-blue-100 font-black' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span className="text-[13px] font-black">{d}</span>
                        {hasData && <div className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-blue-600'}`} />}
                      </button>
                    );
                  })}
                </div>
             </div>

             <div className="space-y-4 px-1">
                <div className="flex justify-between items-end text-left">
                   <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 tracking-tighter">Timeline Analytics</p><h3 className="text-lg font-black text-slate-900 leading-none">{selectedDateStr} 시공 현황</h3></div>
                   <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black text-[11px] shadow-lg active:scale-95 transition-all"><Plus size={14} /> 일정 등록</button>
                </div>
                <div className="space-y-3">
                   {schedules.filter(s => s.date === selectedDateStr).length > 0 ? schedules.filter(s => s.date === selectedDateStr).sort((a,b)=> a.time.localeCompare(b.time)).map(s => (
                        <div key={s.id} className="bg-white p-5 rounded-[2rem] flex justify-between items-center border border-slate-100 shadow-sm animate-fade-in-up">
                           <div className="flex items-center gap-4 text-left">
                              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex flex-col items-center justify-center text-blue-600 font-black border border-blue-100">
                                 <span className="text-[8px] uppercase">{s.time < '12:00' ? 'AM' : 'PM'}</span>
                                 <span className="text-xs font-black">{s.time < '12:00' ? s.time : `${String(parseInt(s.time.split(':')[0]) - 12 || 12).padStart(2, '0')}:${s.time.split(':')[1]}`}</span>
                              </div>
                              <div><p className="text-sm font-black text-slate-800 leading-tight tracking-tight truncate max-w-[120px]">{s.carModel}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{s.serviceType}</p>{s.memo && <p className="text-[9px] text-blue-500 font-bold mt-1.5 italic">📝 {s.memo}</p>}</div>
                           </div>
                           <div className="flex flex-col items-end gap-2 shrink-0">
                              <p className="text-sm font-black text-slate-900 tracking-tight">{Number(s.price || 0).toLocaleString()}원</p>
                              <button onClick={() => { setSelectedSmsData(s); setShowSmsModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl active:scale-90 transition-all border border-blue-500 shadow-sm"><span className="text-[10px] font-black">예약문자</span><Send size={11} strokeWidth={3} /></button>
                           </div>
                        </div>
                      )) : <div className="py-16 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200"><Clock size={24} className="text-slate-200 mx-auto mb-3" /><p className="text-xs text-slate-400 font-bold tracking-tight">등록된 시공 일정이 없습니다.</p></div>}
                </div>
             </div>
          </div>
        ) : (
          /* ================= [3. 우리매장 고객리스트 뷰] ================= */
          <div className="flex flex-col gap-6 animate-fade-in pb-10">
             <div className="flex items-center justify-between px-1">
                <button onClick={() => setView('main')} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 active:scale-90 transition-all font-bold text-sm tracking-tight">
                   <ChevronLeft size={20}/> 뒤로가기
                </button>
                {/* [수정] Customer CRM -> 총 고객 수 표시 */}
                <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1.5">
                   <Users size={12} className="text-blue-600" />
                   <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">총 고객 {uniqueCustomers.length}명</span>
                </div>
             </div>

             {/* 검색 바 */}
             <div className="relative group px-1 text-left">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                   <Search size={16} className="text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input 
                   type="text" 
                   placeholder="차량번호 또는 고객명 검색" 
                   className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-blue-500 shadow-sm transition-all"
                   value={customerSearch}
                   onChange={e => setCustomerSearch(e.target.value)}
                />
             </div>

             {/* 고객 리스트 */}
             <div className="flex-1 overflow-y-auto space-y-3 px-1 text-left pb-20">
                {uniqueCustomers.length > 0 ? uniqueCustomers.map((customer, idx) => (
                   <button 
                     key={idx}
                     onClick={() => setSelectedCustomerVehicles(customer)}
                     className="w-full bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all"
                   >
                      <div className="flex items-center gap-4">
                         <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <Car size={24} />
                         </div>
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                               <p className="text-base font-black text-slate-900">{customer.name} 고객님</p>
                               <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                  {customer.history.length}회 시공
                               </span>
                            </div>
                            <p className="text-xs font-black text-blue-600 tracking-tight">{customer.carModel} <span className="text-slate-300 font-medium">| {customer.plateNumber}</span></p>
                            <p className="text-[10px] text-slate-400 font-medium mt-1.5">최근 방문: {customer.lastVisit.split('T')[0]}</p>
                         </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-200 group-hover:text-blue-600 transition-colors" />
                   </button>
                )) : (
                   <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                      <Users size={24} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-xs text-slate-400 font-bold">검색된 고객이 없습니다.</p>
                   </div>
                )}
             </div>
          </div>
        )}
        
        <div className="text-center shrink-0 opacity-20 py-8 italic font-black uppercase text-[10px] tracking-[0.5em]">Powered by GLUNEX AI Hub</div>
      </div>

      {/* ================= [모달 1: 예약 일정 등록] ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddModal(false)}>
           <div className="bg-white w-full max-w-sm rounded-[3.5rem] shadow-2xl relative p-8 flex flex-col overflow-hidden animate-scale-in text-left" onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-60 z-0" />
              <div className="flex justify-between items-center mb-6 relative z-10 text-left">
                 <div><h3 className="text-xl font-black text-slate-900 tracking-tighter leading-none">예약 일정 등록</h3><p className="text-[10px] text-blue-600 font-black uppercase mt-2 tracking-widest">{newSchedule.date}</p></div>
                 <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 active:scale-90 transition-all"><X size={20}/></button>
              </div>
              <div className="space-y-4 relative z-10 overflow-y-auto max-h-[65vh] pr-1 scrollbar-hide text-left pb-4">
                 <div className="space-y-1.5 text-left"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reservation Time</p>
                    <div className="grid grid-cols-3 gap-2">
                       <div className="relative"><select className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none" value={timeParts.ampm} onChange={(e) => setTimeParts(p => ({ ...p, ampm: e.target.value }))}><option value="">AM/PM</option><option value="오전">오전</option><option value="오후">오후</option></select><ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/></div>
                       <div className="relative"><select className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none" value={timeParts.hour} onChange={(e) => setTimeParts(p => ({ ...p, hour: e.target.value }))}><option value="">시</option>{Array.from({length:12},(_,i)=>i+1).map(h=><option key={h} value={h}>{h}시</option>)}</select><ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/></div>
                       <div className="relative"><select className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none" value={timeParts.minute} onChange={(e) => setTimeParts(p => ({ ...p, minute: e.target.value }))}><option value="">분</option>{Array.from({length:12},(_,i)=>(i*5)).map(m=><option key={m} value={String(m).padStart(2,'0')}>{m}분</option>)}</select><ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/></div>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 focus-within:border-blue-500 transition-colors"><Car size={18} className="text-slate-400"/><input placeholder="차종 (예: BMW 5 / 쏘렌토)" className="bg-transparent text-sm font-bold w-full outline-none" value={newSchedule.carModel} onChange={e=>setNewSchedule(p=>({...p, carModel:e.target.value}))}/></div>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 focus-within:border-blue-500 transition-colors"><Tag size={18} className="text-slate-400"/><input placeholder="시공품목" className="bg-transparent text-sm font-bold w-full outline-none" value={newSchedule.serviceType} onChange={e=>setNewSchedule(p=>({...p, serviceType:e.target.value}))}/></div>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 focus-within:border-blue-500 transition-colors"><Wallet size={18} className="text-slate-400"/><input placeholder="시공금액" className="bg-transparent text-sm font-bold w-full outline-none" value={newSchedule.price} onChange={e=>{const v=e.target.value.replace(/[^0-9]/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,",");setNewSchedule(p=>({...p,price:v}));}}/></div>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 focus-within:border-blue-500 transition-colors"><Phone size={18} className="text-slate-400"/><input placeholder="연락처 (하이픈 자동)" className="bg-transparent text-sm font-bold w-full outline-none" value={newSchedule.phone} onChange={handlePhoneInput}/></div>
                    <div className="flex items-start bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 focus-within:border-blue-500 transition-colors"><StickyNote size={18} className="text-slate-400 mt-1"/><textarea placeholder="비고 (메시지 요청사항에 포함됨)" rows="2" className="bg-transparent text-sm font-bold w-full outline-none resize-none" value={newSchedule.memo} onChange={e=>setNewSchedule(p=>({...p, memo:e.target.value}))}/></div>
                 </div>
                 <button onClick={handleAddSchedule} className="w-full py-4.5 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-xl active:scale-95 transition-all mt-4">일정 저장하기</button>
              </div>
           </div>
        </div>
      )}

      {/* ================= [모달 2: SMS 발송 브릿지] ================= */}
      {showSmsModal && selectedSmsData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in" onClick={() => setShowSmsModal(false)}>
           <div className="bg-white w-full max-w-[340px] rounded-[3rem] shadow-2xl relative p-7 pb-8 overflow-hidden animate-scale-in text-left" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 inline-block">SMS Bridge</div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter leading-tight">예약 확인 문자 발송</h3>
                 </div>
                 <button onClick={() => setShowSmsModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 active:scale-90 transition-all"><X size={20}/></button>
              </div>

              <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 mb-6 shadow-inner relative overflow-hidden">
                 <div className="flex flex-col gap-1 relative z-10">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Message Preview</span>
                    <div className="text-[13px] font-medium text-slate-700 leading-relaxed whitespace-pre-wrap font-noto">
                       {`[${userName}] 시공 예약 확인 안내\n\n- 일시: ${selectedSmsData.date} ${selectedSmsData.displayTime}\n- 차량: ${selectedSmsData.carModel}\n- 품목: ${selectedSmsData.serviceType}\n- 요청사항: ${selectedSmsData.memo || '없음'}`}
                       {smsAdditionalNote.trim() && `\n\n${smsAdditionalNote.trim()}`}
                       {`\n\n상기 내용으로 예약되었습니다.\n일정 변동 시 미리 연락 부탁드립니다.`}
                    </div>
                 </div>
              </div>

              <div className="space-y-2 mb-8">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">추가하실 말씀 (건너띄기 가능)</p>
                 <div className="flex items-start bg-white border border-slate-200 rounded-2xl p-4 focus-within:border-blue-500 shadow-sm transition-colors">
                    <textarea placeholder="예: 세차 없이 그냥 오시면 됩니다." rows="2" className="bg-transparent text-[13px] font-bold w-full outline-none resize-none text-slate-800" value={smsAdditionalNote} onChange={e => setSmsAdditionalNote(e.target.value)} />
                 </div>
              </div>

              <button onClick={() => {
                const s = selectedSmsData;
                const msg = `[${userName}] 시공 예약 확인 안내\n\n- 일시: ${s.date} ${s.displayTime}\n- 차량: ${s.carModel}\n- 품목: ${s.serviceType}\n- 요청사항: ${s.memo || '없음'}${smsAdditionalNote.trim() ? `\n\n${smsAdditionalNote.trim()}` : ''}\n\n상기 내용으로 예약되었습니다.\n일정 변동 시 미리 연락 부탁드립니다.\n\n감사합니다.`;
                const isIphone = navigator.userAgent.match(/iPhone/i);
                window.location.href = `sms:${s.phone.replace(/-/g, '')}${isIphone ? '&' : '?'}body=${encodeURIComponent(msg)}`;
                setShowSmsModal(false);
              }} className="w-full py-4.5 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-slate-900/30">
                 <Send size={16} className="text-blue-400" />
                 <span>확인 문자 발행하기</span>
              </button>
           </div>
        </div>
      )}

      {/* ================= [모달 3: 주간 날씨 예보] ================= */}
      {showWeatherModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in" onClick={() => setShowWeatherModal(false)}>
           <div className="bg-white w-full max-w-[340px] rounded-[3rem] shadow-2xl relative p-8 overflow-hidden animate-scale-in text-left" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-8">
                 <div className="text-left">
                    <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 inline-block">Weekly Forecast</div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">이번 주 일기예보</h3>
                 </div>
                 <button onClick={() => setShowWeatherModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 active:scale-90 transition-all"><X size={20}/></button>
              </div>

              <div className="space-y-4">
                 {weather.forecast.length > 0 ? weather.forecast.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <div className="flex items-center gap-4">
                          <p className="text-sm font-black text-slate-900 w-10">{i === 0 ? '오늘' : `${new Date(f.dt * 1000).getDate()}일`}</p>
                          {getWeatherIcon(f.weather[0].main, 20)}
                          <p className="text-xs font-bold text-slate-400">{f.weather[0].description}</p>
                       </div>
                       <div className="flex items-center gap-1">
                          <Thermometer size={12} className="text-red-400" />
                          <p className="text-sm font-black text-slate-900">{Math.round(f.main.temp)}°</p>
                       </div>
                    </div>
                 )) : <div className="py-10 text-center opacity-30 font-bold">날씨 데이터를 가져오는 중...</div>}
              </div>
              <p className="text-center text-[10px] text-slate-400 font-bold mt-8 italic">시공 스케줄을 잡을 때 날씨를 꼭 참고하세요!</p>
           </div>
        </div>
      )}

      {/* ================= [모달 4: 고객 시공 히스토리 상세] ================= */}
      {selectedCustomerVehicles && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-5 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setSelectedCustomerVehicles(null)}>
           <div className="bg-white w-full max-w-[360px] rounded-[3rem] shadow-2xl relative flex flex-col h-[80vh] overflow-hidden animate-scale-in text-left" onClick={e => e.stopPropagation()}>
              <div className="p-7 border-b border-slate-50 bg-white sticky top-0 z-10 shrink-0">
                 <div className="flex justify-between items-start mb-4">
                    <div className="text-left">
                       <p className="text-blue-600 text-[10px] font-black uppercase tracking-widest mb-1">Vehicle Analysis</p>
                       <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedCustomerVehicles.plateNumber || selectedCustomerVehicles.carModel}</h3>
                       <p className="text-sm font-bold text-slate-400 mt-1">{selectedCustomerVehicles.name} 고객님 히스토리</p>
                    </div>
                    <button onClick={() => setSelectedCustomerVehicles(null)} className="p-2 bg-slate-50 rounded-full text-slate-400 active:scale-90"><X size={20}/></button>
                 </div>
                 <div className="flex gap-2">
                    <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black">총 {selectedCustomerVehicles.history.length}회 시공</div>
                    <div className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5">
                       <TrendingUp size={10} /> 누적 {selectedCustomerVehicles.history.reduce((acc, cur) => acc + (Number(String(cur.price || "0").replace(/[^0-9]/g, '')) || 0), 0).toLocaleString()}원
                    </div>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 scrollbar-hide text-left">
                 {selectedCustomerVehicles.history.sort((a,b) => new Date(b.issuedAt) - new Date(a.issuedAt)).map((h, i) => (
                    // [핵심] 보증서 클릭 시 상세 페이지로 이동
                    <div 
                      key={i} 
                      onClick={() => navigate(`/warranty/view/${h.id}`)}
                      className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform group"
                    >
                       <div className="absolute top-0 right-0 w-1 h-full bg-blue-500" />
                       <div className="flex justify-between items-start mb-3 text-left">
                          <div>
                             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{h.issuedAt.split('T')[0]}</p>
                             <p className="text-base font-black text-slate-900 leading-none group-hover:text-blue-600 transition-colors">{h.productName || h.serviceType || "일반 시공"}</p>
                          </div>
                          <p className="text-sm font-black text-blue-600 italic">₩{Number(String(h.price || "0").replace(/[^0-9]/g, ''))?.toLocaleString()}</p>
                       </div>
                       <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                          <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                 <MapPin size={10} /> {h.storeName || '정식 가맹점'}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                 <CheckCircle2 size={10} className="text-green-500" /> 보증서 발행됨
                              </div>
                          </div>
                          {/* 링크 아이콘 추가로 클릭 유도 */}
                          <ExternalLink size={12} className="text-slate-300 group-hover:text-blue-500" />
                       </div>
                    </div>
                 ))}
                 <div className="py-10 text-center opacity-30 italic font-black text-[10px] uppercase tracking-widest leading-relaxed">
                    시공 히스토리를 기반으로<br/>최적의 다음 시공을 제안하세요.
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* 스타일 애니메이션 정의 */}
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scale-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes bounce-in { 0% { transform: translateY(-15px); opacity: 0; } 60% { transform: translateY(5px); opacity: 1; } 100% { transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-scale-in { animation: scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-bounce-in { animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Dashboard;