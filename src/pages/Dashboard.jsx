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
  const appId = 'glunex-app';
  
  // --- 상태 관리 ---
  const [view, setView] = useState('main'); // 'main' | 'calendar'
  const [userName, setUserName] = useState('파트너');
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  
  const [weather, setWeather] = useState({ 
    temp: 20, rain: 0, status: 'clear', region: 'Seoul', targetCustomers: 0, loading: true 
  });

  const [salesData, setSalesData] = useState({ today: 0, monthTotal: 0, todayGrowth: 0, totalGrowth: 0 });
  const [schedules, setSchedules] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // 예약 등록 폼 상태
  const [newSchedule, setNewSchedule] = useState({
    time: '', carModel: '', serviceType: '', price: '', phone: '', date: new Date().toISOString().split('T')[0]
  });

  // 캘린더 날짜 상태
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- 초기화 및 인증 ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
      if (!authenticatedUser) {
        // 인증 실패 시 익명 로그인 시도 (Rule 3)
        await signInAnonymously(auth);
      }
      setUser(auth.currentUser);
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 데이터 페칭 (인증 후) ---
  useEffect(() => {
    if (!user) return;

    // 1. 유저 및 매출 데이터 로딩
    const loadUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserName(userDoc.data().storeName || '파트너');
          fetchRealWeather(userDoc.data().address?.split(' ')[0] || 'Seoul');
        }
        await calculateSalesData(user.uid);
      } catch (e) { console.error(e); }
    };
    loadUserData();

    // 2. 스케줄 실시간 리스너 (Rule 1)
    const schedulesRef = collection(db, 'artifacts', appId, 'public', 'data', 'schedules');
    const unsubSchedules = onSnapshot(schedulesRef, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSchedules(list);
    }, (err) => console.error(err));

    return () => unsubSchedules();
  }, [user]);

  // 매출 계산 로직 (기존 유지)
  const calculateSalesData = async (uid) => {
    const q = query(collection(db, "warranties"), where("userId", "==", uid));
    const snap = await getDocs(q);
    const now = new Date();
    let monthTotal = 0, todayTotal = 0, targets = 0;
    
    snap.forEach(doc => {
      const data = doc.data();
      const date = new Date(data.issuedAt);
      const price = Number(String(data.price).replace(/[^0-9]/g, '')) || 0;
      if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) monthTotal += price;
      if (date.toDateString() === now.toDateString()) todayTotal += price;
      
      const diffDays = Math.ceil(Math.abs(now - date) / (1000 * 60 * 60 * 24));
      if ((data.serviceType === 'wash' || data.serviceType === 'detailing') && diffDays >= 21) targets++;
    });
    
    setSalesData(prev => ({ ...prev, monthTotal, today: todayTotal }));
    setWeather(prev => ({ ...prev, targetCustomers: targets }));
  };

  const fetchRealWeather = async (region) => {
    try {
      const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${region}&appid=${API_KEY}&units=metric&lang=kr`);
      const data = await res.json();
      if (data.cod === 200) {
        setWeather(prev => ({ 
          ...prev, temp: Math.round(data.main.temp), status: data.weather[0].main.toLowerCase().includes('rain') ? 'rainy' : 'clear', region, loading: false 
        }));
      }
    } catch (e) { setWeather(prev => ({ ...prev, loading: false })); }
  };

  const handleAddSchedule = async () => {
    if (!newSchedule.time || !newSchedule.carModel || !newSchedule.serviceType) return alert("필수 항목을 입력해주세요.");
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'schedules'), {
        ...newSchedule,
        userId: user.uid,
        createdAt: new Date().toISOString()
      });
      setShowAddModal(false);
      setNewSchedule({ time: '', carModel: '', serviceType: '', price: '', phone: '', date: new Date().toISOString().split('T')[0] });
    } catch (e) { alert("저장 실패"); }
  };

  // --- 렌더링 헬퍼 ---
  const todaySchedules = schedules
    .filter(s => s.date === new Date().toISOString().split('T')[0])
    .sort((a, b) => a.time.localeCompare(b.time));

  // --- UI Components ---
  
  // 캘린더 뷰
  const CalendarView = () => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const padding = Array.from({ length: firstDayOfMonth }, (_, i) => i);

    return (
      <div className="flex flex-col h-full animate-fade-in bg-white">
        <div className="px-6 pt-10 pb-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
             <button onClick={() => setView('main')} className="p-2 bg-slate-50 rounded-full text-slate-400"><ChevronLeft size={20}/></button>
             <h2 className="text-xl font-black text-slate-900">{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월</h2>
          </div>
          <div className="flex gap-2">
             <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2"><ChevronLeft size={18}/></button>
             <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2"><ChevronRight size={18}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-7 mb-2">
            {['일','월','화','수','목','금','토'].map((d, i) => (
              <div key={d} className={`text-center text-[10px] font-bold ${i===0?'text-red-400':i===6?'text-blue-400':'text-slate-400'}`}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {padding.map(p => <div key={`p-${p}`} className="aspect-square"></div>)}
            {days.map(d => {
              const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
              const hasSchedule = schedules.some(s => s.date === dateStr);
              const isToday = new Date().toISOString().split('T')[0] === dateStr;
              return (
                <button 
                  key={d} 
                  onClick={() => {
                    setNewSchedule(prev => ({ ...prev, date: dateStr }));
                    setShowAddModal(true);
                  }}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center relative border ${isToday ? 'border-blue-600 bg-blue-50' : 'border-slate-50 bg-white'}`}
                >
                  <span className={`text-sm font-bold ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>{d}</span>
                  {hasSchedule && <div className="w-1 h-1 rounded-full bg-blue-600 mt-1"></div>}
                </button>
              );
            })}
          </div>

          <div className="mt-8 space-y-3">
             <h3 className="text-sm font-black text-slate-900 px-1">선택일 일정</h3>
             <div className="space-y-2">
               {schedules.filter(s => s.date === newSchedule.date).length > 0 ? (
                 schedules.filter(s => s.date === newSchedule.date).sort((a,b)=>a.time.localeCompare(b.time)).map(s => (
                   <div key={s.id} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="text-blue-600 font-black text-xs bg-white px-2 py-1 rounded-lg border border-blue-100 shadow-sm">{s.time}</div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{s.carModel}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{s.serviceType}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">{Number(s.price).toLocaleString()}원</p>
                        <p className="text-[10px] text-slate-400 font-medium">{s.phone}</p>
                      </div>
                   </div>
                 ))
               ) : (
                 <div className="py-10 text-center text-slate-300 text-xs font-bold border-2 border-dashed border-slate-50 rounded-2xl">등록된 일정이 없습니다.</div>
               )}
             </div>
          </div>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-10 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-30"
        >
          <Plus size={24} />
        </button>
      </div>
    );
  };

  if (view === 'calendar') return <CalendarView />;

  return (
    <div className="flex flex-col h-full w-full bg-[#F8F9FB] text-slate-800 font-sans overflow-hidden max-w-md mx-auto shadow-2xl relative animate-fade-in">
      
      {/* 백그라운드 디자인 */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-blue-100/40 rounded-full blur-[80px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-slate-200/50 rounded-full blur-[80px]" />
      </div>

      {/* [수정] 헤더: 정보 밀도 최적화 */}
      <div className="relative px-6 pt-10 pb-4 z-10 flex justify-between items-center shrink-0">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full" />
            <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">GLUNEX PARTNER</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">{loadingUser ? '...' : userName}</h2>
        </div>

        {/* [신규] 헤더 중앙 날씨/타겟 정보 (콤팩트형) */}
        <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 shadow-sm mx-2">
           <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
              {weather.status === 'rainy' ? <CloudRain size={14} className="text-blue-500" /> : <Sun size={14} className="text-amber-500" />}
              <span className="text-[10px] font-black text-slate-700">{weather.loading ? '..' : `${weather.temp}°`}</span>
           </div>
           <div className="flex items-center gap-1">
              <Sparkles size={12} className="text-blue-600 fill-blue-600" />
              <span className="text-[10px] font-black text-slate-700">{weather.targetCustomers}명</span>
           </div>
        </div>

        <button 
          onClick={() => navigate('/mypage')}
          className="p-2.5 bg-white rounded-full border border-slate-200 shadow-sm active:scale-95 transition-all hover:bg-slate-50"
        >
          <User size={18} className="text-slate-600" />
        </button>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col px-5 pb-6 gap-3 z-10 min-h-0">
        
        {/* 상단 블록: 매출 & 스케줄러 */}
        <div className="flex gap-3 h-[32%] shrink-0">
          
          {/* 매출 카드 */}
          <button 
            onClick={() => navigate('/sales')}
            className="flex-[1.5] bg-white rounded-[2.5rem] p-5 border border-slate-200 shadow-sm relative overflow-hidden group active:scale-[0.98] transition-all flex flex-col justify-between text-left"
          >
            <div className="relative z-10 w-full">
              <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                <Wallet size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">Revenue Status</span>
              </div>
              <div className="flex items-baseline gap-1 mb-0.5">
                <span className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{salesData.monthTotal.toLocaleString()}</span>
                <span className="text-xs font-bold text-slate-400">원</span>
              </div>
            </div>
            <div className="w-full h-px bg-slate-100 my-1" />
            <div className="relative z-10 w-full">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 mb-1">Today Sales</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-slate-800 tracking-tighter">{salesData.today.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-slate-400">원</span>
              </div>
            </div>
          </button>

          {/* [신규] 오늘의 스케줄 카드 (기존 날씨카드 대체) */}
          <button 
            onClick={() => setView('calendar')}
            className="flex-[1.2] bg-slate-900 rounded-[2.5rem] p-5 shadow-2xl relative overflow-hidden flex flex-col group active:scale-[0.98] transition-all"
          >
             <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/20 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-blue-600/30 transition-colors" />
             <div className="relative z-10 h-full flex flex-col">
                <div className="flex items-center gap-1.5 mb-3">
                   <div className="p-1.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/30"><Calendar size={14} /></div>
                   <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Today</span>
                </div>
                
                <div className="flex-1 space-y-2.5 overflow-hidden">
                   {todaySchedules.length > 0 ? (
                     todaySchedules.slice(0, 2).map((s, idx) => (
                       <div key={idx} className="flex flex-col gap-0.5 border-l-2 border-blue-600/50 pl-2">
                          <p className="text-[11px] font-black text-white leading-none">{s.time} | {s.carModel}</p>
                          <p className="text-[9px] text-slate-500 font-bold truncate">{s.serviceType}</p>
                       </div>
                     ))
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center opacity-40">
                        <Clock size={20} className="text-slate-500 mb-1" />
                        <p className="text-[10px] text-slate-500 font-bold">일정 없음</p>
                     </div>
                   )}
                </div>

                <div className="mt-auto pt-2 flex items-center justify-between">
                   <span className="text-[10px] font-black text-slate-500 uppercase">View All</span>
                   <ChevronRight size={14} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
                </div>
             </div>
          </button>
        </div>

        {/* 하단 액션 버튼 영역 */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          <button onClick={() => navigate('/creator')} className="flex-1 bg-gradient-to-r from-indigo-50 to-white rounded-3xl border border-indigo-100 p-5 flex items-center justify-between relative overflow-hidden group active:scale-[0.98] transition-all shadow-sm">
             <div className="absolute left-0 top-0 w-1.5 h-full bg-indigo-500" />
             <div className="flex flex-col items-start z-10 pl-2 text-left">
                <div className="flex items-center gap-2 mb-1">
                   <div className="p-1 rounded-lg bg-indigo-100 text-indigo-600"><Sparkles size={12} className="fill-indigo-600" /></div>
                   <span className="text-base font-black text-indigo-900">AI 마케팅 에이전트</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">네이버 블로그/인스타 포스팅 10초 완성</span>
             </div>
             <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-100 text-slate-300 shadow-sm group-hover:text-indigo-500 transition-colors"><ArrowUpRight size={16} /></div>
          </button>

          <button onClick={() => navigate('/create')} className="flex-1 bg-white rounded-3xl border border-slate-200 p-5 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm">
             <div className="absolute left-0 top-0 w-1.5 h-full bg-amber-400" />
             <div className="flex flex-col items-start z-10 pl-2 text-left">
                <div className="flex items-center gap-2 mb-1">
                   <div className="p-1 rounded-lg bg-amber-50 text-amber-500"><Crown size={12} className="fill-amber-500" /></div>
                   <span className="text-base font-black text-slate-800">보증서 발행</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">보험수리 대응 공식 시공 보증서 발급</span>
             </div>
             <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-300 shadow-sm group-hover:text-amber-500 transition-colors"><ArrowUpRight size={16} /></div>
          </button>

          <button onClick={() => navigate('/marketing')} className="flex-1 bg-white rounded-3xl border border-slate-200 p-5 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm">
             <div className="absolute left-0 top-0 w-1.5 h-full bg-blue-500" />
             <div className="flex flex-col items-start z-10 pl-2 text-left">
                <div className="flex items-center gap-2 mb-1">
                   <div className="p-1 rounded-lg bg-blue-50 text-blue-500"><MessageSquare size={12} className="fill-blue-500" /></div>
                   <span className="text-base font-black text-slate-800">단골 마케팅 센터</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">재방문 유도 알림톡 및 고객 집중 관리</span>
             </div>
             <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-300 shadow-sm group-hover:text-blue-500 transition-colors"><ArrowUpRight size={16} /></div>
          </button>
        </div>

        <div className="text-center pt-2 shrink-0 opacity-40">
           <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em]">Powered by GLUNEX AI Hub</p>
        </div>
      </div>

      {/* 예약 등록 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddModal(false)}>
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl relative flex flex-col p-8 overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
              <div className="flex justify-between items-center mb-8 relative z-10">
                 <h3 className="text-xl font-black text-slate-900 tracking-tight">신규 예약 등록</h3>
                 <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20}/></button>
              </div>

              <div className="space-y-5 relative z-10">
                 <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Time</p>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 focus-within:border-blue-500 transition-colors">
                        <Clock size={16} className="text-blue-600" />
                        <input type="time" className="bg-transparent text-sm font-bold w-full outline-none" value={newSchedule.time} onChange={e=>setNewSchedule({...newSchedule, time: e.target.value})}/>
                      </div>
                   </div>
                   <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Car Model</p>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 focus-within:border-blue-500 transition-colors">
                        <Car size={16} className="text-blue-600" />
                        <input type="text" placeholder="예: 쏘렌토" className="bg-transparent text-sm font-bold w-full outline-none" value={newSchedule.carModel} onChange={e=>setNewSchedule({...newSchedule, carModel: e.target.value})}/>
                      </div>
                   </div>
                 </div>

                 <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service</p>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 focus-within:border-blue-500 transition-colors">
                      <Tag size={16} className="text-blue-600" />
                      <input type="text" placeholder="예: 유리막코팅 + 광택" className="bg-transparent text-sm font-bold w-full outline-none" value={newSchedule.serviceType} onChange={e=>setNewSchedule({...newSchedule, serviceType: e.target.value})}/>
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price</p>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 focus-within:border-blue-500 transition-colors">
                      <Wallet size={16} className="text-blue-600" />
                      <input type="number" placeholder="단위: 원" className="bg-transparent text-sm font-bold w-full outline-none" value={newSchedule.price} onChange={e=>setNewSchedule({...newSchedule, price: e.target.value})}/>
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact</p>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 focus-within:border-blue-500 transition-colors">
                      <Phone size={16} className="text-blue-600" />
                      <input type="tel" placeholder="010-0000-0000" className="bg-transparent text-sm font-bold w-full outline-none" value={newSchedule.phone} onChange={e=>setNewSchedule({...newSchedule, phone: e.target.value})}/>
                    </div>
                 </div>

                 <button 
                  onClick={handleAddSchedule}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-base shadow-xl shadow-slate-900/20 active:scale-95 transition-all mt-4"
                 >
                   예약 저장하기
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;