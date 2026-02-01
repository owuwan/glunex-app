import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, 
  Car, Tag, Phone, Wallet, StickyNote, Send, Loader2, Thermometer, 
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, Activity, CheckCircle2, Info
} from 'lucide-react';

// 파이어베이스 초기화 및 연동 (앱 버전의 안전한 초기화 로직 반영)
import { auth, db } from '../../firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, addDoc, onSnapshot, query, where } from 'firebase/firestore';

/**
 * Scheduler: 앱 버전의 대시보드 로직을 100% 이식한 PC 전용 스케줄 관리 센터
 */
const Scheduler = () => {
  const navigate = useNavigate();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'glunex-app';
  
  // --- [앱 버전 상태 관리 그대로 이식] ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [userName, setUserName] = useState('파트너');
  const [weather, setWeather] = useState({ temp: 0, status: 'clear', forecast: [], loading: true });
  
  // UI 상태
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [selectedSmsData, setSelectedSmsData] = useState(null);
  const [smsAdditionalNote, setSmsAdditionalNote] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const [newSchedule, setNewSchedule] = useState({ 
    carModel: '', serviceType: '', price: '', phone: '', memo: '', date: selectedDateStr 
  });
  const [timeParts, setTimeParts] = useState({ ampm: '', hour: '', minute: '' });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // --- [인증 및 초기 데이터 로드] ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        fetchWeather('Seoul');
      } else {
        try { await signInAnonymously(auth); } catch(e) { navigate('/login'); }
      }
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    // 앱 버전과 동일한 경로의 스케줄 데이터 실시간 구독
    const schedulesRef = collection(db, 'artifacts', appId, 'public', 'data', 'schedules');
    const unsubSchedules = onSnapshot(schedulesRef, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // 현재 로그인한 사용자의 일정만 필터링
      setSchedules(list.filter(s => s.userId === user.uid));
    });

    return () => unsubSchedules();
  }, [user, appId]);

  // --- [날씨 기능 이식] ---
  const fetchWeather = async (region) => {
    const API_KEY = "651347101e403d6d0669288124237d45"; // 오픈웨더 API 키
    try {
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${region}&appid=${API_KEY}&units=metric&lang=kr`);
      const data = await res.json();
      if (data.cod === 200) {
        setWeather(prev => ({ ...prev, temp: Math.round(data.main.temp), status: data.weather[0].main, loading: false }));
      }
    } catch (e) { setWeather(prev => ({ ...prev, loading: false })); }
  };

  const getWeatherIcon = (status, size = 20) => {
    const s = status?.toLowerCase();
    if (s?.includes('clear')) return <Sun size={size} className="text-amber-500 fill-amber-500" />;
    if (s?.includes('cloud')) return <Cloud size={size} className="text-slate-400 fill-slate-400" />;
    if (s?.includes('rain')) return <CloudRain size={size} className="text-blue-500" />;
    return <Wind size={size} className="text-slate-300" />;
  };

  // --- [일정 등록 로직 이식] ---
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
        time: formattedTime, 
        displayTime: `${ampm} ${hour}:${minute}`,
        carModel, serviceType, price: price.replace(/,/g, ''),
        phone, memo, date: date || selectedDateStr, 
        userId: user.uid, createdAt: new Date().toISOString()
      });
      setShowAddModal(false);
      setNewSchedule({ carModel: '', serviceType: '', price: '', phone: '', memo: '', date: selectedDateStr });
      showToast("새 시공 일정이 등록되었습니다.");
    } catch (e) { alert("저장 실패"); }
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  if (loading) return (
    <div className="flex-1 flex items-center justify-center h-full min-h-[600px]">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
    </div>
  );

  const selectedDaySchedules = schedules
    .filter(s => s.date === selectedDateStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="space-y-6 animate-in fade-in duration-700 w-full pb-10">
      
      {/* 1. 하이엔드 PC 헤더 */}
      <div className="flex items-center justify-between bg-white px-8 py-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg">
            <CalendarIcon size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-none uppercase italic">
              Operation <span className="text-indigo-600 not-italic">Scheduler</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 leading-none">
              앱 연동 실시간 시공 예약 현황 및 워크플로우 관리
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
             {getWeatherIcon(weather.status)}
             <div>
                <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Local Weather</p>
                <p className="text-sm font-black text-slate-700 leading-none">{weather.temp}°C</p>
             </div>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-black transition-all shadow-md"
          >
            <Plus size={16} /> 신규 일정 등록
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* 2. 대형 캘린더 섹션 (왼쪽) */}
        <div className="col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
           <div className="flex items-center justify-between mb-8 px-2">
              <h3 className="text-lg font-black text-slate-900 italic uppercase leading-none">
                {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
              </h3>
              <div className="flex bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                 <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-white transition-colors border-r border-slate-200"><ChevronLeft size={18}/></button>
                 <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-white transition-colors"><ChevronRight size={18}/></button>
              </div>
           </div>

           <div className="grid grid-cols-7 mb-4">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => (
                <div key={d} className={`text-center text-[10px] font-black tracking-widest ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-indigo-500' : 'text-slate-400'}`}>{d}</div>
              ))}
           </div>

           <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`p-${i}`} className="aspect-square bg-slate-50/30 rounded-2xl" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = selectedDateStr === dateStr;
                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                const daySchedules = schedules.filter(s => s.date === dateStr);
                
                return (
                  <button 
                    key={day} 
                    onClick={() => { setSelectedDateStr(dateStr); setNewSchedule(p => ({ ...p, date: dateStr })); }}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all group border ${isSelected ? 'bg-indigo-600 text-white shadow-xl border-indigo-700' : isToday ? 'bg-indigo-50 border-indigo-100 text-indigo-600 font-black' : 'bg-white border-slate-100 hover:border-indigo-300'}`}
                  >
                    <span className="text-base font-black">{day}</span>
                    <div className="flex gap-0.5 mt-1.5">
                       {daySchedules.slice(0, 3).map((_, idx) => (
                         <div key={idx} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-400'}`} />
                       ))}
                       {daySchedules.length > 3 && <span className={`text-[8px] font-bold ${isSelected ? 'text-white' : 'text-indigo-400'}`}>+</span>}
                    </div>
                  </button>
                );
              })}
           </div>
        </div>

        {/* 3. 일일 상세 리스트 (오른쪽) */}
        <div className="col-span-4 space-y-6">
           <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Schedule Details</p>
                    <h4 className="text-sm font-black text-slate-900">{selectedDateStr.replace(/-/g, '. ')}</h4>
                 </div>
                 <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black">
                   총 {selectedDaySchedules.length}건
                 </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                 {selectedDaySchedules.length > 0 ? selectedDaySchedules.map((s) => (
                   <div key={s.id} className="p-5 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm hover:border-indigo-300 transition-all group relative">
                      <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-3">
                            <div className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-black flex flex-col items-center">
                               <span className="text-[8px] uppercase leading-none mb-0.5">{s.time < '12:00' ? 'AM' : 'PM'}</span>
                               <span className="leading-none">{s.displayTime?.split(' ')[1] || s.time}</span>
                            </div>
                            <h5 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase italic">{s.carModel}</h5>
                         </div>
                         <button 
                           onClick={() => { setSelectedSmsData(s); setShowSmsModal(true); }}
                           className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 hover:text-white"
                         >
                            <Send size={14} />
                         </button>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                         <div className="flex items-center gap-1"><Tag size={10} /> {s.serviceType}</div>
                         <div className="text-slate-900 font-black">₩{Number(s.price || 0).toLocaleString()}</div>
                      </div>
                      {s.memo && (
                        <div className="mt-3 pt-3 border-t border-slate-50 text-[10px] text-indigo-500 font-medium italic">
                          📝 {s.memo}
                        </div>
                      )}
                   </div>
                 )) : (
                   <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-20">
                      <Clock size={40} className="mb-4" />
                      <p className="text-xs font-black uppercase tracking-widest">예약 일정 없음</p>
                   </div>
                 )}
              </div>
           </div>

           <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 opacity-10"><CalendarIcon size={120} /></div>
              <h5 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                <Info size={14} className="text-indigo-400" /> 운영 팁
              </h5>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                비어있는 시공 시간대에 예약 유도 알림톡을 발송해 보세요. AI 에이전트가 단골 고객용 홍보글 작성을 도와드립니다.
              </p>
           </div>
        </div>
      </div>

      {/* 4. 일정 등록 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setShowAddModal(false)}>
           <div className="bg-white w-full max-w-[450px] rounded-[2.5rem] shadow-2xl relative p-10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-8 text-left">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase">New Schedule</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase mt-2 tracking-widest">{selectedDateStr}</p>
                 </div>
                 <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-all"><X size={24}/></button>
              </div>
              
              <div className="space-y-4">
                 <div className="grid grid-cols-3 gap-3">
                    <select className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none" value={timeParts.ampm} onChange={(e) => setTimeParts(p => ({ ...p, ampm: e.target.value }))}>
                       <option value="">오전/오후</option><option value="오전">오전</option><option value="오후">오후</option>
                    </select>
                    <select className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none" value={timeParts.hour} onChange={(e) => setTimeParts(p => ({ ...p, hour: e.target.value }))}>
                       <option value="">시</option>{Array.from({length:12},(_,i)=>i+1).map(h=><option key={h} value={h}>{h}시</option>)}
                    </select>
                    <select className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none" value={timeParts.minute} onChange={(e) => setTimeParts(p => ({ ...p, minute: e.target.value }))}>
                       <option value="">분</option>{['00','10','20','30','40','50'].map(m=><option key={m} value={m}>{m}분</option>)}
                    </select>
                 </div>
                 <div className="space-y-3">
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-3.5 gap-3">
                       <Car size={18} className="text-slate-400"/><input placeholder="차종 (예: 쏘렌토 / BMW X5)" className="bg-transparent text-xs font-bold w-full outline-none" value={newSchedule.carModel} onChange={e=>setNewSchedule(p=>({...p, carModel:e.target.value}))}/>
                    </div>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-3.5 gap-3">
                       <Tag size={18} className="text-slate-400"/><input placeholder="시공 품목 (예: 광택 코팅)" className="bg-transparent text-xs font-bold w-full outline-none" value={newSchedule.serviceType} onChange={e=>setNewSchedule(p=>({...p, serviceType:e.target.value}))}/>
                    </div>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-3.5 gap-3">
                       <Wallet size={18} className="text-slate-400"/><input placeholder="시공 금액" className="bg-transparent text-xs font-bold w-full outline-none" value={newSchedule.price} onChange={e=>setNewSchedule(p=>({...p, price: e.target.value.replace(/[^0-9]/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")}))}/>
                    </div>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-3.5 gap-3">
                       <Phone size={18} className="text-slate-400"/><input placeholder="연락처" className="bg-transparent text-xs font-bold w-full outline-none" value={newSchedule.phone} onChange={e=>setNewSchedule(p=>({...p, phone: e.target.value.replace(/[^0-9]/g, "").replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3")}))}/>
                    </div>
                    <div className="flex items-start bg-slate-50 border border-slate-200 rounded-xl p-3.5 gap-3">
                       <StickyNote size={18} className="text-slate-400 mt-1"/><textarea placeholder="추가 메모" rows="2" className="bg-transparent text-xs font-bold w-full outline-none resize-none" value={newSchedule.memo} onChange={e=>setNewSchedule(p=>({...p, memo:e.target.value}))}/>
                    </div>
                 </div>
                 <button onClick={handleAddSchedule} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all mt-6 uppercase tracking-widest">일정 저장하기</button>
              </div>
           </div>
        </div>
      )}

      {/* SMS 문자 발송 브릿지 모달 */}
      {showSmsModal && selectedSmsData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setShowSmsModal(false)}>
           <div className="bg-white w-full max-w-[400px] rounded-[2.5rem] shadow-2xl relative p-8 flex flex-col animate-in zoom-in-95 duration-200 text-left" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-black text-slate-900 mb-4 tracking-tighter uppercase italic">Send Confirmation SMS</h3>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-6 text-xs font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                 {`[${userName}] 시공 예약 안내\n\n- 일시: ${selectedSmsData.date} ${selectedSmsData.displayTime}\n- 차량: ${selectedSmsData.carModel}\n- 품목: ${selectedSmsData.serviceType}\n${smsAdditionalNote ? '\n' + smsAdditionalNote : ''}\n\n상기 내용으로 예약되었습니다.`}
              </div>
              <textarea 
                placeholder="추가하실 말씀 (건너뛰기 가능)" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold outline-none mb-6 resize-none"
                rows="2"
                value={smsAdditionalNote}
                onChange={e => setSmsAdditionalNote(e.target.value)}
              />
              <button 
                onClick={() => {
                  const msg = `[${userName}] 시공 예약 안내\n\n- 일시: ${selectedSmsData.date} ${selectedSmsData.displayTime}\n- 차량: ${selectedSmsData.carModel}\n- 품목: ${selectedSmsData.serviceType}\n${smsAdditionalNote ? '\n' + smsAdditionalNote : ''}\n\n감사합니다.`;
                  window.location.href = `sms:${selectedSmsData.phone.replace(/-/g, '')}?body=${encodeURIComponent(msg)}`;
                  setShowSmsModal(false);
                }}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2"
              >
                <Send size={16} /> 확인 문자 발송 (모바일 연결)
              </button>
           </div>
        </div>
      )}

      {/* 글로벌 토스트 */}
      {toastMsg && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top duration-300">
           <div className="bg-slate-900 text-white px-6 py-3 rounded-full text-xs font-black shadow-2xl flex items-center gap-3 border border-slate-700">
              <CheckCircle2 size={16} className="text-emerald-400" /> {toastMsg}
           </div>
        </div>
      )}
    </div>
  );
};

export default Scheduler;