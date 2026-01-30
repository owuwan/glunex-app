import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Crown, MessageSquare, ChevronRight, CloudRain, Sun, 
  TrendingUp, Sparkles, Loader2, MapPin, Wallet, Bell, 
  ArrowUpRight, Calendar, Clock, Car, Tag, Phone, Plus, X, ChevronLeft
} from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';

const Dashboard = () => {
  const navigate = useNavigate();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'glunex-app';
  
  // --- 상태 관리 ---
  const [view, setView] = useState('main'); 
  const [userName, setUserName] = useState('파트너');
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  
  const [weather, setWeather] = useState({ 
    temp: 0, rain: 0, status: 'clear', region: 'Seoul', targetCustomers: 0, loading: true 
  });

  const [salesData, setSalesData] = useState({ today: 0, monthTotal: 0 });
  const [schedules, setSchedules] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);
  
  // 예약 등록 폼 상태
  const [newSchedule, setNewSchedule] = useState({
    time: '', carModel: '', serviceType: '', price: '', phone: '', date: new Date().toISOString().split('T')[0]
  });

  // 캘린더 월 관리
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- 초기화 및 인증 ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        // 커스텀 토큰 처리 (환경변수 기반)
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (authenticatedUser) => {
      setUser(authenticatedUser);
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
          fetchRealWeather(data.address?.split(' ')[0] || 'Seoul');
        } else {
          fetchRealWeather('Seoul');
        }
        await calculateSalesData(user.uid);
      } catch (e) { console.error("User data load error:", e); }
    };
    loadUserData();

    const schedulesRef = collection(db, 'artifacts', appId, 'public', 'data', 'schedules');
    const unsubSchedules = onSnapshot(schedulesRef, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSchedules(list);
    }, (err) => console.error("Firestore Error:", err));

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
    } catch (e) { console.error("Sales calc error:", e); }
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
    } catch (e) { 
      setWeather(prev => ({ ...prev, loading: false })); 
    }
  };

  // 금액 콤마 포맷터
  const handlePriceInput = (e) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    const formattedValue = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    setNewSchedule({ ...newSchedule, price: formattedValue });
  };

  const handleAddSchedule = async () => {
    // 유효성 검사 수정 (빈 문자열 및 공백 체크 강화)
    if (!newSchedule.time || newSchedule.time === "") return alert("예약 시간을 선택해주세요.");
    if (!newSchedule.carModel || newSchedule.carModel.trim() === "") return alert("차종을 입력해주세요.");
    if (!newSchedule.serviceType || newSchedule.serviceType.trim() === "") return alert("시공 품목을 입력해주세요.");
    if (!user) return;

    try {
      const scheduleToSave = {
        ...newSchedule,
        price: (newSchedule.price || "").replace(/,/g, ''), // 콤마 제거 후 숫자 문자열로 저장
        userId: user.uid,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'schedules'), scheduleToSave);
      
      setShowAddModal(false);
      // 등록 후 폼 완전 초기화
      setNewSchedule({ 
        time: '', carModel: '', serviceType: '', price: '', phone: '', 
        date: selectedDateStr 
      });
    } catch (e) { 
      console.error(e);
      alert("일정 저장에 실패했습니다."); 
    }
  };

  // 오늘의 일정 필터링
  const todaySchedules = schedules
    .filter(s => s.date === new Date().toISOString().split('T')[0])
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  // --- 달력 렌더링 로직 ---
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  return (
    <div className="flex flex-col h-full w-full bg-[#F8F9FB] text-slate-800 font-sans overflow-hidden max-w-md mx-auto shadow-2xl relative select-none">
      
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-blue-100/40 rounded-full blur-[80px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-slate-200/50 rounded-full blur-[80px]" />
      </div>

      {/* 헤더 */}
      <div className="relative px-6 pt-10 pb-4 z-10 flex justify-between items-center shrink-0">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full" />
            <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">GLUNEX PARTNER</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">{loadingUser ? '...' : userName}</h2>
        </div>

        <div className="flex items-center gap-2 bg-white/70 backdrop-blur-md px-3 py-2 rounded-full border border-slate-200 shadow-sm mx-2">
           <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2">
              {weather.loading ? (
                <Loader2 size={12} className="animate-spin text-slate-300" />
              ) : (
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

        <button 
          onClick={() => navigate('/mypage')}
          className="p-2.5 bg-white rounded-full border border-slate-200 shadow-sm active:scale-95 transition-all"
        >
          <User size={18} className="text-slate-600" />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-5 pb-6 gap-4 z-10 min-h-0 overflow-y-auto scrollbar-hide">
        
        {view === 'main' ? (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="flex gap-3 h-[180px] shrink-0">
              <button 
                onClick={() => navigate('/sales')}
                className="flex-[1.4] bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-sm relative overflow-hidden group active:scale-[0.98] transition-all flex flex-col justify-between text-left"
              >
                <div className="relative z-10 w-full">
                  <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                    <Wallet size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Revenue</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 tracking-tighter">{salesData.monthTotal.toLocaleString()}</span>
                    <span className="text-xs font-bold text-slate-400">원</span>
                  </div>
                </div>
                <div className="w-full h-px bg-slate-100 my-2" />
                <div className="relative z-10 w-full">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1 block">Today Sales</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-slate-800 tracking-tighter">{salesData.today.toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-slate-400">원</span>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => setView('calendar')}
                className="flex-[1.1] bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col group active:scale-[0.98] transition-all text-left"
              >
                 <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-100 transition-colors" />
                 <div className="relative z-10 h-full flex flex-col">
                    <div className="flex items-center gap-1.5 mb-4">
                       <div className="p-1.5 bg-blue-600 rounded-xl text-white shadow-lg"><Calendar size={14} /></div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today</span>
                    </div>
                    
                    <div className="flex-1 space-y-3 overflow-hidden">
                       {todaySchedules.length > 0 ? (
                         todaySchedules.slice(0, 2).map((s, idx) => (
                           <div key={idx} className="flex flex-col gap-0.5 border-l-2 border-blue-600 pl-2">
                              <p className="text-[11px] font-black text-slate-800 leading-none">{s.time} | {s.carModel}</p>
                              <p className="text-[9px] text-slate-400 font-bold truncate">{s.serviceType}</p>
                           </div>
                         ))
                       ) : (
                         <div className="h-full flex flex-col items-center justify-center opacity-30">
                            <Clock size={16} className="text-slate-400 mb-1" />
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Empty</p>
                         </div>
                       )}
                    </div>

                    <div className="mt-auto flex items-center justify-between text-[10px] font-black text-slate-300 group-hover:text-blue-600 transition-colors">
                       <span>Calendar</span>
                       <ChevronRight size={12} />
                    </div>
                 </div>
              </button>
            </div>

            {/* 메인 서비스 */}
            <div className="flex flex-col gap-3">
              <button onClick={() => navigate('/creator')} className="bg-gradient-to-r from-indigo-50 to-white rounded-3xl border border-indigo-100 p-6 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm">
                 <div className="flex flex-col items-start text-left">
                    <div className="flex items-center gap-2 mb-1">
                       <div className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200"><Sparkles size={14} className="fill-white" /></div>
                       <span className="text-base font-black text-indigo-900">AI 마케팅 에이전트</span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">네이버 블로그/인스타 포스팅 10초 완성</span>
                 </div>
                 <ArrowUpRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </button>

              <button onClick={() => navigate('/create')} className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm">
                 <div className="flex flex-col items-start text-left">
                    <div className="flex items-center gap-2 mb-1">
                       <div className="p-1.5 rounded-xl bg-amber-400 text-white shadow-md shadow-amber-100"><Crown size={14} className="fill-white" /></div>
                       <span className="text-base font-black text-slate-800">보증서 발행</span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">보험수리 대응 공식 시공 보증서 발급</span>
                 </div>
                 <ArrowUpRight size={18} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
              </button>

              <button onClick={() => navigate('/marketing')} className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm">
                 <div className="flex flex-col items-start text-left">
                    <div className="flex items-center gap-2 mb-1">
                       <div className="p-1.5 rounded-xl bg-blue-500 text-white shadow-md shadow-blue-100"><MessageSquare size={14} className="fill-white" /></div>
                       <span className="text-base font-black text-slate-800">단골 마케팅 센터</span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">재방문 유도 알림톡 및 고객 관리</span>
                 </div>
                 <ArrowUpRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
              </button>
            </div>
          </div>
        ) : (
          /* 캘린더 뷰 */
          <div className="flex flex-col gap-6 animate-fade-in pb-20">
             <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                   <button onClick={() => setView('main')} className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm"><ChevronLeft size={20} /></button>
                   <h2 className="text-xl font-black text-slate-900 tracking-tight">{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월</h2>
                </div>
                <div className="flex bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                   <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2.5 hover:bg-slate-50 transition-colors"><ChevronLeft size={16}/></button>
                   <div className="w-px bg-slate-100 h-4 self-center" />
                   <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2.5 hover:bg-slate-50 transition-colors"><ChevronRight size={16}/></button>
                </div>
             </div>

             <div className="bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-xl">
                <div className="grid grid-cols-7 mb-4">
                  {['일','월','화','수','목','금','토'].map((d, i) => (
                    <div key={d} className={`text-center text-[10px] font-black uppercase tracking-widest ${i===0?'text-red-400':i===6?'text-blue-400':'text-slate-400'}`}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {padding.map(p => <div key={`p-${p}`} className="aspect-square"></div>)}
                  {days.map(d => {
                    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    const daySchedules = schedules.filter(s => s.date === dateStr);
                    const isToday = new Date().toISOString().split('T')[0] === dateStr;
                    const isSelected = selectedDateStr === dateStr;

                    return (
                      <button 
                        key={d} 
                        onClick={() => {
                           setSelectedDateStr(dateStr);
                           setNewSchedule(prev => ({ ...prev, date: dateStr }));
                        }}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all active:scale-90 ${
                           isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 z-10' : 
                           isToday ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-sm font-black">{d}</span>
                        {daySchedules.length > 0 && (
                           <div className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-blue-600'}`}></div>
                        )}
                      </button>
                    );
                  })}
                </div>
             </div>

             <div className="space-y-4 px-1">
                <div className="flex justify-between items-end">
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Timeline</p>
                      <h3 className="text-lg font-black text-slate-900">{selectedDateStr === new Date().toISOString().split('T')[0] ? '오늘의 일정' : `${selectedDateStr} 일정`}</h3>
                   </div>
                   <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-xs shadow-lg active:scale-95 transition-all">
                      <Plus size={14} /> 일정 추가
                   </button>
                </div>
                
                <div className="space-y-3">
                   {schedules.filter(s => s.date === selectedDateStr).length > 0 ? (
                      schedules.filter(s => s.date === selectedDateStr).sort((a,b)=> (a.time || "").localeCompare(b.time || "")).map(s => (
                        <div key={s.id} className="bg-white p-5 rounded-[2rem] flex justify-between items-center border border-slate-100 shadow-sm animate-fade-in-up">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-xs border border-blue-100">{s.time}</div>
                              <div>
                                 <p className="text-sm font-black text-slate-800">{s.carModel}</p>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{s.serviceType}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-sm font-black text-slate-900">{Number(s.price || 0).toLocaleString()}원</p>
                              <p className="text-[10px] text-slate-400 font-medium">{s.phone}</p>
                           </div>
                        </div>
                      ))
                   ) : (
                      <div className="py-16 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                         <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                            <Clock size={20} className="text-slate-300" />
                         </div>
                         <p className="text-xs text-slate-400 font-bold">등록된 시공 일정이 없습니다.</p>
                      </div>
                   )}
                </div>
             </div>
          </div>
        )}

        <div className="text-center shrink-0 opacity-40 py-4">
           <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em]">Powered by GLUNEX AI Hub</p>
        </div>
      </div>

      {/* 예약 등록 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddModal(false)}>
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl relative flex flex-col p-8 overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
              
              <div className="flex justify-between items-center mb-8 relative z-10">
                 <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">예약 등록</h3>
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-1">{newSchedule.date}</p>
                 </div>
                 <button onClick={() => setShowAddModal(false)} className="p-2.5 bg-slate-50 rounded-full text-slate-400 active:scale-90"><X size={20}/></button>
              </div>

              <div className="space-y-4 relative z-10">
                 <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Time</p>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 focus-within:border-blue-500 transition-colors">
                        <input type="time" className="bg-transparent text-sm font-black w-full outline-none" value={newSchedule.time} onChange={e=>setNewSchedule({...newSchedule, time: e.target.value})}/>
                      </div>
                   </div>
                   <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Car Model</p>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 focus-within:border-blue-500 transition-colors">
                        <input type="text" placeholder="예: BMW 5" className="bg-transparent text-sm font-black w-full outline-none" value={newSchedule.carModel} onChange={e=>setNewSchedule({...newSchedule, carModel: e.target.value})}/>
                      </div>
                   </div>
                 </div>

                 <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Item</p>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 focus-within:border-blue-500 transition-colors">
                      <input type="text" placeholder="예: 광택 + 유리막" className="bg-transparent text-sm font-black w-full outline-none" value={newSchedule.serviceType} onChange={e=>setNewSchedule({...newSchedule, serviceType: e.target.value})}/>
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (KRW)</p>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 focus-within:border-blue-500 transition-colors">
                      <input 
                        type="text" 
                        placeholder="금액 입력" 
                        className="bg-transparent text-sm font-black w-full outline-none" 
                        value={newSchedule.price} 
                        onChange={handlePriceInput} 
                      />
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Phone</p>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 focus-within:border-blue-500 transition-colors">
                      <input type="tel" placeholder="010-0000-0000" className="bg-transparent text-sm font-black w-full outline-none" value={newSchedule.phone} onChange={e=>setNewSchedule({...newSchedule, phone: e.target.value})}/>
                    </div>
                 </div>

                 <button 
                  onClick={handleAddSchedule}
                  className="w-full py-4.5 bg-blue-600 text-white rounded-[1.5rem] font-black text-base shadow-xl shadow-blue-200 active:scale-95 transition-all mt-4"
                 >
                   일정 저장하기
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;