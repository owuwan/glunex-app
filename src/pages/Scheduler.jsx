import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Plus, X, 
  Clock, Car, Tag, Phone, Wallet, StickyNote, 
  CheckCircle2, ChevronDown, Loader2
} from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';

const Scheduler = () => {
  const navigate = useNavigate();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'glunex-app';

  // --- 상태 관리 ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [toastMsg, setToastMsg] = useState("");
  
  // 예약 등록 폼
  const [newSchedule, setNewSchedule] = useState({
    time: '', carModel: '', serviceType: '', price: '', phone: '', memo: '', date: new Date().toISOString().split('T')[0]
  });
  const [timeParts, setTimeParts] = useState({ ampm: '', hour: '', minute: '' });
  const [currentDate, setCurrentDate] = useState(new Date());

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  useEffect(() => {
    const initAuth = async () => {
      if (!auth.currentUser) await signInAnonymously(auth);
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(u === null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const schedulesRef = collection(db, 'artifacts', appId, 'public', 'data', 'schedules');
    const unsub = onSnapshot(schedulesRef, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSchedules(list);
      setLoading(false);
    }, (err) => console.error(err));
    return () => unsub();
  }, [user, appId]);

  // 금액/전화번호 포매팅 (홍철님 요청 사항 유지)
  const handlePriceInput = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    setNewSchedule(p => ({ ...p, price: val }));
  };

  const handlePhoneInput = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, "");
    if (val.length > 3 && val.length <= 7) val = val.replace(/(\d{3})(\d{1,4})/, "$1-$2");
    else if (val.length > 7) val = val.replace(/(\d{3})(\d{4})(\d{1,4})/, "$1-$2-$3");
    if (val.length > 13) val = val.substring(0, 13);
    setNewSchedule(p => ({ ...p, phone: val }));
  };

  const handleAddSchedule = async () => {
    const { ampm, hour, minute } = timeParts;
    const { carModel, serviceType, price, phone, memo, date } = newSchedule;
    if (!ampm || !hour || !minute) return alert("예약 시간을 선택해주세요.");
    if (!carModel.trim() || !serviceType.trim()) return alert("필수 항목을 입력해주세요.");
    
    let h = parseInt(hour);
    if (ampm === '오후' && h < 12) h += 12;
    if (ampm === '오전' && h === 12) h = 0;
    const formattedTime = `${String(h).padStart(2, '0')}:${minute}`;

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'schedules'), {
        time: formattedTime, displayTime: `${ampm} ${hour}:${minute}`,
        carModel, serviceType, price: (price || "").replace(/,/g, ''),
        phone, memo, date: date || selectedDateStr,
        userId: user.uid, createdAt: new Date().toISOString()
      });
      setShowAddModal(false);
      setNewSchedule({ time: '', carModel: '', serviceType: '', price: '', phone: '', memo: '', date: selectedDateStr });
      setTimeParts({ ampm: '', hour: '', minute: '' });
      showToast("일정이 성공적으로 추가되었습니다!");
    } catch (e) { alert("저장 실패"); }
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  if (loading) return <div className="h-full flex items-center justify-center bg-white"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="flex flex-col h-full w-full bg-[#F8F9FB] overflow-hidden max-w-md mx-auto relative select-none text-left">
      {/* 토스트 알림 */}
      {toastMsg && (
        <div className="fixed top-12 inset-x-0 z-[200] flex justify-center px-4 animate-bounce-in">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-[2rem] text-[13px] font-black shadow-2xl flex items-center gap-3 border border-slate-700 backdrop-blur-md">
            <CheckCircle2 size={18} className="text-blue-400" /> {toastMsg}
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="px-5 pt-12 pb-4 flex items-center justify-between bg-white border-b border-slate-100 z-10 shrink-0">
        <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-1.5 hover:bg-slate-50 rounded-full text-slate-400"><ArrowLeft size={22} /></button>
            <h1 className="text-xl font-black text-slate-900 tracking-tight italic">시공 <span className="text-blue-600">스케줄러</span></h1>
        </div>
        <div className="flex bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
           <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2"><ChevronLeft size={16}/></button>
           <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2"><ChevronRight size={16}/></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-32 scrollbar-hide">
        {/* 달력 영역 */}
        <div className="bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-xl">
           <div className="mb-4 flex justify-between items-center px-1">
              <p className="text-sm font-black text-slate-900">{currentDate.getFullYear()}년 {currentDate.getMonth()+1}월</p>
           </div>
           <div className="grid grid-cols-7 mb-4">
              {['일','월','화','수','목','금','토'].map((d, i) => (
                <div key={d} className={`text-center text-[10px] font-black uppercase tracking-widest ${i===0?'text-red-400':i===6?'text-blue-400':'text-slate-400'}`}>{d}</div>
              ))}
           </div>
           <div className="grid grid-cols-7 gap-1">
              {padding.map(p => <div key={`p-${p}`} className="aspect-square"></div>)}
              {days.map(d => {
                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const hasSchedule = schedules.some(s => s.date === dateStr && s.userId === user?.uid);
                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                const isSelected = selectedDateStr === dateStr;
                return (
                  <button key={d} onClick={() => { setSelectedDateStr(dateStr); setNewSchedule(p => ({ ...p, date: dateStr })); }}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all active:scale-90 ${
                       isSelected ? 'bg-blue-600 text-white shadow-lg' : isToday ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-white text-slate-700'
                    }`}
                  >
                    <span className="text-sm font-black">{d}</span>
                    {hasSchedule && <div className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-blue-600'}`} />}
                  </button>
                );
              })}
           </div>
        </div>

        {/* 선택일 상세 리스트 */}
        <div className="space-y-4 px-1">
           <div className="flex justify-between items-end">
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Schedule Timeline</p><h3 className="text-lg font-black text-slate-900">{selectedDateStr} 일정</h3></div>
              <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-xs shadow-lg"><Plus size={14} /> 일정 추가</button>
           </div>
           <div className="space-y-3">
              {schedules.filter(s => s.date === selectedDateStr && s.userId === user?.uid).length > 0 ? (
                schedules.filter(s => s.date === selectedDateStr && s.userId === user?.uid).sort((a,b)=> (a.time || "").localeCompare(b.time || "")).map(s => (
                  <div key={s.id} className="bg-white p-5 rounded-[2rem] flex justify-between items-center border border-slate-100 shadow-sm">
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex flex-col items-center justify-center text-blue-600 font-black border border-blue-100">
                           <span className="text-[9px] uppercase">{s.time < '12:00' ? 'AM' : 'PM'}</span>
                           <span className="text-xs">{s.time < '12:00' ? s.time : `${String(parseInt(s.time)-12).padStart(2,'0')}:${s.time.split(':')[1]}`}</span>
                        </div>
                        <div>
                           <p className="text-sm font-black text-slate-800">{s.carModel}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{s.serviceType}</p>
                           {s.memo && <p className="text-[9px] text-blue-500 font-bold mt-0.5 line-clamp-1 italic">📝 {s.memo}</p>}
                        </div>
                     </div>
                     <div className="text-right"><p className="text-sm font-black text-slate-900">{Number(s.price || 0).toLocaleString()}원</p><p className="text-[10px] text-slate-400 font-medium">{s.phone}</p></div>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                   <Clock size={20} className="text-slate-300 mx-auto mb-3" /><p className="text-xs text-slate-400 font-bold">등록된 시공 일정이 없습니다.</p>
                </div>
              )}
           </div>
        </div>
      </main>

      {/* 등록 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl relative p-8 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6 relative z-10 text-left">
                 <div><h3 className="text-xl font-black text-slate-900">예약 등록</h3><p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-1">{newSchedule.date}</p></div>
                 <button onClick={() => setShowAddModal(false)} className="p-2.5 bg-slate-50 rounded-full text-slate-400"><X size={20}/></button>
              </div>
              <div className="space-y-4 relative z-10 overflow-y-auto max-h-[70vh] pr-1 scrollbar-hide">
                 <div className="space-y-1.5"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reservation Time</p>
                    <div className="grid grid-cols-3 gap-2">
                       <select className="appearance-none bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold" value={timeParts.ampm} onChange={(e) => setTimeParts(p => ({ ...p, ampm: e.target.value }))}>
                          <option value="">오전/오후</option><option value="오전">오전</option><option value="오후">오후</option></select>
                       <select className="appearance-none bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold" value={timeParts.hour} onChange={(e) => setTimeParts(p => ({ ...p, hour: e.target.value }))}>
                          <option value="">시</option>{Array.from({length:12},(_,i)=>i+1).map(h=><option key={h} value={h}>{h}시</option>)}</select>
                       <select className="appearance-none bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold" value={timeParts.minute} onChange={(e) => setTimeParts(p => ({ ...p, minute: e.target.value }))}>
                          <option value="">분</option>{Array.from({length:12},(_,i)=>(i*5)).map(m=><option key={m} value={String(m).padStart(2,'0')}>{m}분</option>)}</select>
                    </div>
                 </div>
                 <div className="space-y-1.5"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</p>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 mb-2"><Car size={18}/><input placeholder="차종 (예: BMW 5)" className="bg-transparent text-sm font-bold w-full outline-none" value={newSchedule.carModel} onChange={e=>setNewSchedule(p=>({...p, carModel:e.target.value}))}/></div>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 mb-2"><Tag size={18}/><input placeholder="시공품목" className="bg-transparent text-sm font-bold w-full outline-none" value={newSchedule.serviceType} onChange={e=>setNewSchedule(p=>({...p, serviceType:e.target.value}))}/></div>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 mb-2"><Wallet size={18}/><input placeholder="시공금액" className="bg-transparent text-sm font-bold w-full outline-none" value={newSchedule.price} onChange={handlePriceInput}/></div>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3 mb-2"><Phone size={18}/><input placeholder="연락처" className="bg-transparent text-sm font-bold w-full outline-none" value={newSchedule.phone} onChange={handlePhoneInput}/></div>
                    <div className="flex items-start bg-slate-50 border border-slate-200 rounded-2xl p-4 gap-3"><StickyNote size={18}/><textarea placeholder="추가메모" rows="2" className="bg-transparent text-sm font-bold w-full outline-none resize-none" value={newSchedule.memo} onChange={e=>setNewSchedule(p=>({...p, memo:e.target.value}))}/></div>
                 </div>
                 <button onClick={handleAddSchedule} className="w-full py-4.5 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-xl active:scale-95 transition-all mt-4">일정 저장하기</button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes bounceIn { 0% { transform: translateY(-20px); opacity: 0; } 60% { transform: translateY(10px); opacity: 1; } 100% { transform: translateY(0); } }
        .animate-bounce-in { animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Scheduler;