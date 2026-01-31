import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Crown, MessageSquare, ChevronRight, CloudRain, Sun, 
  TrendingUp, Sparkles, Loader2, MapPin, Wallet, Bell, 
  ArrowUpRight, Calendar, Clock, Car, Tag, Phone, Plus, X, ChevronLeft,
  ChevronDown, StickyNote, CheckCircle2, RefreshCw, AlertTriangle
} from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const Dashboard = () => {
  const navigate = useNavigate();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'glunex-app';
  
  // --- [1] 상태 관리 (모든 기능 통합) ---
  const [view, setView] = useState('main'); // 'main' | 'calendar'
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('파트너');
  
  const [weather, setWeather] = useState({ temp: 0, status: 'clear', region: 'Seoul', targetCustomers: 0, loading: true });
  const [salesData, setSalesData] = useState({ today: 0, monthTotal: 0 });
  const [schedules, setSchedules] = useState([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toLocaleDateString('sv-SE')); // YYYY-MM-DD
  const [toastMsg, setToastMsg] = useState("");

  const [newSchedule, setNewSchedule] = useState({ 
    time: '', carModel: '', serviceType: '', price: '', phone: '', memo: '', 
    date: new Date().toLocaleDateString('sv-SE') 
  });
  const [timeParts, setTimeParts] = useState({ ampm: '', hour: '', minute: '' });
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const currentMonth = new Date().getMonth() + 1;

  // 알림 토스트 함수
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // --- [2] 인증 로직 (Rule 3: Auth First) ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        console.warn("세션 없음 -> 로그인 페이지 이동");
        navigate('/login');
      }
      setAuthChecked(true);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  // --- [3] 데이터 로드 (인증된 유저 전용) ---
  useEffect(() => {
    if (!user || !authChecked) return;

    // 사용자 상세 정보 및 날씨/매출 로드
    const loadInitData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserName(userDoc.data().storeName || '글루넥스 파트너');
        }
        fetchWeather('Seoul');
        calculateSales(user.uid);
      } catch (e) { console.error("Data Load Error:", e); }
    };
    loadInitData();

    // 스케줄 실시간 리스너 (Rule 1 & 2)
    const schedulesRef = collection(db, 'artifacts', appId, 'public', 'data', 'schedules');
    const unsubSchedules = onSnapshot(schedulesRef, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // 본인 데이터만 필터링
      setSchedules(list.filter(s => s.userId === user.uid));
    }, (err) => console.warn("Firestore Listener Error:", err.code));

    return () => unsubSchedules();
  }, [user, authChecked, appId]);

  // --- [4] 주요 기능 함수 ---
  const calculateSales = async (uid) => {
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
        targets++;
      });
      setSalesData({ monthTotal, today: todayTotal });
      setWeather(prev => ({ ...prev, targetCustomers: targets }));
    } catch (e) { console.error(e); }
  };

  const fetchWeather = async (region) => {
    const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
    if (!API_KEY) return setWeather(p => ({ ...p, loading: false }));
    try {
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${region}&appid=${API_KEY}&units=metric`);
      const data = await res.json();
      if (data.cod === 200) {
        setWeather(prev => ({ ...prev, temp: Math.round(data.main.temp), status: data.weather[0].main.toLowerCase().includes('rain') ? 'rainy' : 'clear', loading: false }));
      }
    } catch (e) { setWeather(prev => ({ ...prev, loading: false })); }
  };

  // 금액 포맷 (1,000)
  const handlePriceInput = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    setNewSchedule(p => ({ ...p, price: val }));
  };

  // 전화번호 자동 하이픈 (010-0000-0000)
  const handlePhoneInput = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, "");
    if (val.length > 3 && val.length <= 7) val = val.replace(/(\d{3})(\d{1,4})/, "$1-$2");
    else if (val.length > 7) val = val.replace(/(\d{3})(\d{4})(\d{1,4})/, "$1-$2-$3");
    setNewSchedule(p => ({ ...p, phone: val.substring(0, 13) }));
  };

  // 일정 등록 실행
  const handleAddSchedule = async () => {
    const { ampm, hour, minute } = timeParts;
    const { carModel, serviceType, price, phone, memo, date } = newSchedule;
    if (!ampm || !hour || !minute || !carModel.trim() || !serviceType.trim()) return alert("필수 항목을 모두 입력해 주세요.");
    
    let h = parseInt(hour);
    if (ampm === '오후' && h < 12) h += 12;
    if (ampm === '오전' && h === 12) h = 0;
    const formattedTime = `${String(h).padStart(2, '0')}:${minute}`;

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'schedules'), {
        time: formattedTime,
        displayTime: `${ampm} ${hour}:${minute}`,
        carModel, serviceType,
        price: (price || "").replace(/,/g, ''),
        phone, memo,
        date: date || selectedDateStr,
        userId: user.uid,
        createdAt: new Date().toISOString()
      });
      setShowAddModal(false);
      setNewSchedule({ time: '', carModel: '', serviceType: '', price: '', phone: '', memo: '', date: selectedDateStr });
      showToast("일정이 성공적으로 추가되었습니다!");
    } catch (e) { alert("저장 중 오류가 발생했습니다."); }
  };

  // 오늘 일정 필터링
  const todayStr = new Date().toLocaleDateString('sv-SE');
  const todaySchedules = schedules.filter(s => s.date === todayStr).sort((a,b) => a.time.localeCompare(b.time));

  // --- [5] UI 렌더링 ---
  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white p-8">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <p className="text-sm font-black text-slate-900 tracking-tight">시스템 엔진 부팅 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#F8F9FB] text-slate-800 font-sans overflow-hidden max-w-md mx-auto shadow-2xl relative select-none text-left">
      
      {/* 토스트 알림바 */}
      {toastMsg && (
        <div className="fixed top-12 inset-x-0 z-[200] flex justify-center px-4 animate-bounce-in pointer-events-none">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-full text-xs font-black shadow-2xl flex items-center gap-3 border border-slate-700">
            <CheckCircle2 size={16} className="text-blue-400" /> {toastMsg}
          </div>
        </div>
      )}

      {/* 배경 장식 */}
      <div className="absolute inset-0 pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-blue-100/40 rounded-full blur-[80px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-slate-200/50 rounded-full blur-[80px]" />
      </div>

      {/* 헤더 섹션 */}
      <header className="relative px-6 pt-10 pb-4 z-10 flex justify-between items-center shrink-0">
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">GLUNEX PARTNER</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 truncate pr-2 tracking-tight">{userName}</h2>
        </div>
        
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 shadow-sm mx-2">
           <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2">
              {weather.loading ? <Loader2 size={12} className="animate-spin text-slate-300" /> : (
                <span className="text-[11px] font-black text-slate-700">{weather.temp}°</span>
              )}
           </div>
           <div className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-blue-600 fill-blue-600" />
              <span className="text-[11px] font-black text-slate-700">{weather.targetCustomers}명</span>
           </div>
        </div>

        <button onClick={() => navigate('/mypage')} className="p-2.5 bg-white rounded-full border border-slate-200 active:scale-90 transition-all shadow-sm">
          <User size={18} className="text-slate-600" />
        </button>
      </header>

      <div className="flex-1 flex flex-col px-5 pb-6 gap-4 z-10 overflow-y-auto scrollbar-hide min-h-0">
        
        {view === 'main' ? (
          /* ================= [메인 대시보드 뷰] ================= */
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* 상단 2분할 카드 */}
            <div className="flex gap-3 h-[175px] shrink-0">
              {/* 매출 정보 카드 (요청하신 당월 표기) */}
              <button onClick={() => navigate('/sales')} className="flex-[1.4] bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col justify-between text-left active:scale-[0.98] transition-all">
                <div className="w-full">
                  <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                    <Wallet size={12} />
                    <span className="text-[9px] font-black uppercase tracking-tighter">{currentMonth}월 실적 리포트</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 tracking-tighter">
                    {salesData.monthTotal.toLocaleString()}<span className="text-xs font-bold text-slate-400 ml-1">원</span>
                  </p>
                </div>
                <div className="h-px bg-slate-100 my-2 w-full" />
                <div className="w-full">
                  <span className="text-[9px] font-black text-blue-600 uppercase mb-0.5 block">Today Sales</span>
                  <p className="text-lg font-black text-slate-800 tracking-tighter">{salesData.today.toLocaleString()}원</p>
                </div>
              </button>

              {/* 스케줄 요약 카드 */}
              <button onClick={() => setView('calendar')} className="flex-[1.1] bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col justify-between text-left active:scale-[0.98] transition-all relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full blur-2xl -mr-10 -mt-10" />
                 <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-1.5 mb-3">
                           <div className="p-1.5 bg-blue-600 rounded-xl text-white shadow-lg"><Calendar size={14} /></div>
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today</span>
                        </div>
                        <div className="space-y-2">
                        {todaySchedules.length > 0 ? (
                            todaySchedules.slice(0, 2).map((s, i) => (
                                <div key={i} className="border-l-2 border-blue-600 pl-2 overflow-hidden">
                                    <p className="text-[10px] font-black text-slate-800 truncate leading-tight">{s.displayTime?.split(' ')[1] || s.time} | {s.carModel}</p>
                                    <p className="text-[8px] text-slate-400 font-bold truncate uppercase">{s.serviceType}</p>
                                </div>
                            ))
                        ) : (
                            <div className="py-4 opacity-30 flex flex-col items-center">
                                <Clock size={16} className="mb-1" />
                                <p className="text-[9px] font-black uppercase">Empty</p>
                            </div>
                        )}
                        </div>
                    </div>
                    <div className="mt-2">
                        {todaySchedules.length >= 3 && (
                           <div className="bg-blue-50 px-2 py-1 rounded-lg mb-2 text-center">
                              <span className="text-[9px] font-black text-blue-600">오늘 총 {todaySchedules.length}건 시공</span>
                           </div>
                        )}
                        <div className="flex items-center justify-between text-[10px] font-black text-slate-300">
                           <span>Calendar</span>
                           <ChevronRight size={12} />
                        </div>
                    </div>
                 </div>
              </button>
            </div>

            {/* 메인 서비스 링크 버튼들 (컴팩트 프리미엄 디자인) */}
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
                       <span className="text-sm font-black text-slate-800 tracking-tight">보증서 발행</span>
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
            </div>
          </div>
        ) : (
          /* ================= [스케줄러 캘린더 뷰] ================= */
          <div className="flex flex-col gap-6 animate-fade-in pb-10">
             <div className="flex items-center justify-between px-1">
                <button onClick={() => setView('main')} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 active:scale-90 transition-all">
                   <ChevronLeft size={20}/>
                   <span className="text-sm font-bold tracking-tight">뒤로가기</span>
                </button>
                <div className="flex bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                   <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2.5 active:bg-slate-50 border-r border-slate-100"><ChevronLeft size={16}/></button>
                   <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2.5 active:bg-slate-50"><ChevronRight size={16}/></button>
                </div>
             </div>
             
             {/* 캘린더 본체 */}
             <div className="bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-xl">
                <div className="mb-5 text-center flex justify-between items-center px-1">
                   <p className="text-sm font-black text-slate-900">{currentDate.getFullYear()}년 {currentDate.getMonth()+1}월</p>
                   <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"/><span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Scheduler</span></div>
                </div>
                <div className="grid grid-cols-7 mb-4">
                  {['일','월','화','수','목','금','토'].map((d, i) => (
                    <div key={d} className={`text-center text-[10px] font-black uppercase tracking-widest ${i===0?'text-red-400':i===6?'text-blue-400':'text-slate-400'}`}>{d}</div>
                  ))}
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
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all active:scale-90 ${
                           isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 z-10' : 
                           isToday ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-[13px] font-black">{d}</span>
                        {hasData && <div className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-blue-600'}`} />}
                      </button>
                    );
                  })}
                </div>
             </div>

             {/* 하단 상세 일정 리스트 */}
             <div className="space-y-4 px-1">
                <div className="flex justify-between items-end">
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 tracking-tighter">Timeline Analysis</p>
                      <h3 className="text-lg font-black text-slate-900 leading-none">{selectedDateStr} 시공 현황</h3>
                   </div>
                   <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black text-[11px] shadow-lg active:scale-95 transition-all">
                      <Plus size={14} /> 일정 등록
                   </button>
                </div>
                
                <div className="space-y-3">
                   {schedules.filter(s => s.date === selectedDateStr).length > 0 ? (
                      schedules.filter(s => s.date === selectedDateStr).sort((a,b)=> a.time.localeCompare(b.time)).map(s => (
                        <div key={s.id} className="bg-white p-5 rounded-[2rem] flex justify-between items-center border border-slate-100 shadow-sm animate-fade-in-up">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex flex-col items-center justify-center text-blue-600 font-black border border-blue-100 shadow-inner">
                                 <span className="text-[8px] uppercase">{s.time < '12:00' ? 'AM' : 'PM'}</span>
                                 <span className="text-xs font-black">{s.time < '12:00' ? s.time : `${String(parseInt(s.time.split(':')[0]) - 12 || 12).padStart(2, '0')}:${s.time.split(':')[1]}`}</span>
                              </div>
                              <div className="text-left">
                                 <p className="text-sm font-black text-slate-800 leading-tight">{s.carModel}</p>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{s.serviceType}</p>
                                 {s.memo && <p className="text-[9px] text-blue-500 font-bold mt-1.5 italic leading-tight">📝 {s.memo}</p>}
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-sm font-black text-slate-900 tracking-tight">{Number(s.price || 0).toLocaleString()}원</p>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{s.phone}</p>
                           </div>
                        </div>
                      ))
                   ) : (
                      <div className="py-16 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                         <Clock size={24} className="text-slate-200 mx-auto mb-3" />
                         <p className="text-xs text-slate-400 font-bold tracking-tight">지정된 날짜에 등록된 시공 일정이 없습니다.</p>
                      </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* 푸터 문구 */}
        <div className="text-center shrink-0 opacity-40 py-8">
           <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">Optimized by GLUNEX Growth Hub</p>
        </div>
      </div>

      {/* ================= [공통: 예약 등록 모달] ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddModal(false)}>
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl relative p-8 flex flex-col overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 z-0" />
              
              <div className="flex justify-between items-center mb-6 relative z-10 text-left">
                 <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter">예약 일정 등록</h3>
                    <p className="text-[10px] text-blue-600 font-black uppercase mt-1 tracking-widest">{newSchedule.date}</p>
                 </div>
                 <button onClick={() => setShowAddModal(false)} className="p-2.5 bg-slate-50 rounded-full text-slate-400 active:scale-90 transition-all"><X size={20}/></button>
              </div>

              <div className="space-y-4 relative z-10 overflow-y-auto max-h-[65vh] pr-1 scrollbar-hide text-left">
                 {/* 시간 선택 */}
                 <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reservation Time</p>
                    <div className="grid grid-cols-3 gap-2">
                       <div className="relative"><select className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500" value={timeParts.ampm} onChange={(e) => setTimeParts(p => ({ ...p, ampm: e.target.value }))}><option value="">AM/PM</option><option value="오전">오전</option><option value="오후">오후</option></select><ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/></div>
                       <div className="relative"><select className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500" value={timeParts.hour} onChange={(e) => setTimeParts(p => ({ ...p, hour: e.target.value }))}><option value="">시</option>{Array.from({length:12},(_,i)=>i+1).map(h=><option key={h} value={h}>{h}시</option>)}</select><ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/></div>
                       <div className="relative"><select className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500" value={timeParts.minute} onChange={(e) => setTimeParts(p => ({ ...p, minute: e.target.value }))}><option value="">분</option>{Array.from({length:12},(_,i)=>(i*5)).map(m=><option key={m} value={String(m).padStart(2,'0')}>{m}분</option>)}</select><ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/></div>
                    </div>
                 </div>

                 {/* 입력 필드들 */}
                 <div className="space-y-2">
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 focus-within:border-blue-500 transition-colors">
                       <Car size={18} className="text-slate-400" />
                       <input placeholder="차종 (예: BMW 5 / 쏘렌토)" className="bg-transparent text-sm font-bold w-full outline-none" value={newSchedule.carModel} onChange={e=>setNewSchedule(p=>({...p, carModel:e.target.value}))}/>
                    </div>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 focus-within:border-blue-500 transition-colors">
                       <Tag size={18} className="text-slate-400" />
                       <input placeholder="시공품목 (예: 광택 / 코팅)" className="bg-transparent text-sm font-bold w-full outline-none" value={newSchedule.serviceType} onChange={e=>setNewSchedule(p=>({...p, serviceType:e.target.value}))}/>
                    </div>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 focus-within:border-blue-500 transition-colors">
                       <Wallet size={18} className="text-slate-400" />
                       <input placeholder="시공금액" className="bg-transparent text-sm font-bold w-full outline-none" value={newSchedule.price} onChange={handlePriceInput}/>
                    </div>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 focus-within:border-blue-500 transition-colors">
                       <Phone size={18} className="text-slate-400" />
                       <input placeholder="연락처 (하이픈 자동)" className="bg-transparent text-sm font-bold w-full outline-none" value={newSchedule.phone} onChange={handlePhoneInput}/>
                    </div>
                    <div className="flex items-start bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 focus-within:border-blue-500 transition-colors">
                       <StickyNote size={18} className="text-slate-400 mt-1" />
                       <textarea placeholder="추가 사항 (예: 시공 전 세차 요청)" rows="2" className="bg-transparent text-sm font-bold w-full outline-none resize-none" value={newSchedule.memo} onChange={e=>setNewSchedule(p=>({...p, memo:e.target.value}))}/>
                    </div>
                 </div>

                 <button onClick={handleAddSchedule} className="w-full py-4.5 bg-blue-600 text-white rounded-[1.5rem] font-black text-base shadow-xl shadow-blue-100 active:scale-95 transition-all mt-4">
                    일정 저장하기
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* 스타일 정의 */}
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce-in { 0% { transform: translateY(-20px); opacity: 0; } 60% { transform: translateY(10px); opacity: 1; } 100% { transform: translateY(0); } }
        @keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; }
        .animate-bounce-in { animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Dashboard;