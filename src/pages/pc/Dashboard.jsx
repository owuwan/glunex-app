import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, TrendingUp, Calendar, Clock, 
  ChevronRight, Plus, BarChart3, Loader2, 
  ArrowUpRight, Layers, Activity, X,
  User, Phone, Car, MapPin, FileText,
  AlertCircle, LayoutDashboard, Settings,
  Zap, Sun, Cloud, CloudRain
} from 'lucide-react';

// Gukosora inzira y'ikoreshwa rya Firebase
import { auth, db } from '../../firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';

/**
 * PcDashboard: Imbonerahamwe y'imikorere kuri mudasobwa
 * Gukosora amakosa y'imibare n'imishushanyirize igezweho
 */
const PcDashboard = () => {
  const navigate = useNavigate();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'glunex-app';

  // --- Imiterere y'amakuru ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState(null); 
  const [storeName, setStoreName] = useState('Ubufatanye bwa Glunex');
  
  const [stats, setStats] = useState({
    thisMonthRevenue: 0,
    todayRevenue: 0,
    monthlyCount: 0,
    pendingIssuanceCount: 0,
    growthRate: 0 
  });

  const [chartData, setChartData] = useState({ current: [], last: [] });
  const [recentSchedules, setRecentSchedules] = useState([]);

  // --- Kwemeza umukoresha ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const userDoc = await getDoc(doc(db, "users", u.uid));
        if (userDoc.exists()) setStoreName(userDoc.data().storeName || 'Ubufatanye bwa Glunex');
      } else {
        try { await signInAnonymously(auth); } catch(e) { navigate('/login'); }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // --- Isesenguraburaka ry'amakuru y'igurisha n'imihigo ---
  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const todayStr = now.toLocaleDateString('sv-SE');
    const dayOfMonth = now.getDate();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const qWarranties = query(collection(db, "warranties"), where("userId", "==", user.uid));
    const schedulesRef = collection(db, 'artifacts', appId, 'public', 'data', 'schedules');

    const unsubW = onSnapshot(qWarranties, (wSnap) => {
      const unsubS = onSnapshot(schedulesRef, (sSnap) => {
        let mSum = 0; let tSum = 0; let mCount = 0;
        let curPeriodRev = 0; let lastPeriodRev = 0;

        wSnap.docs.forEach(doc => {
          const d = doc.data();
          if (!d.issuedAt) return;
          const iDate = new Date(d.issuedAt);
          const iDay = iDate.getDate();
          const price = Number(String(d.price || "0").replace(/[^0-9]/g, '')) || 0;

          if (iDate.getFullYear() === currentYear && iDate.getMonth() === currentMonth) {
            mSum += price;
            mCount++;
            if (iDay <= dayOfMonth) curPeriodRev += price;
          }
          if (iDate.getFullYear() === lastMonthYear && iDate.getMonth() === lastMonth) {
            if (iDay <= dayOfMonth) lastPeriodRev += price;
          }
          if (d.issuedAt.split('T')[0] === todayStr) tSum += price;
        });

        const growth = lastPeriodRev > 0 ? ((curPeriodRev - lastPeriodRev) / lastPeriodRev) * 100 : 0;

        const curWeekData = [0,0,0,0,0,0,0];
        const lastWeekData = [0,0,0,0,0,0,0];

        sSnap.docs.forEach(doc => {
          const s = doc.data();
          if (s.userId !== user.uid) return;
          const sDate = new Date(s.date);
          const sDay = sDate.getDay();

          if (sDate.getFullYear() === currentYear && sDate.getMonth() === currentMonth) {
             curWeekData[sDay]++;
          } else if (sDate.getFullYear() === lastMonthYear && sDate.getMonth() === lastMonth) {
             lastWeekData[sDay]++;
          }
        });

        const pending = sSnap.docs.filter(d => {
          const s = d.data();
          if (s.userId !== user.uid) return false;
          return s.date < todayStr || (s.date === todayStr && s.time < currentTime);
        }).length;

        const todayList = sSnap.docs
          .map(d => ({id: d.id, ...d.data()}))
          .filter(s => s.userId === user.uid && s.date === todayStr)
          .sort((a,b) => a.time.localeCompare(b.time));

        setStats({
          thisMonthRevenue: mSum, todayRevenue: tSum,
          monthlyCount: mCount, pendingIssuanceCount: pending,
          growthRate: growth.toFixed(1)
        });
        setChartData({ current: curWeekData, last: lastWeekData });
        setRecentSchedules(todayList);
        setLoading(false);
      });
      return () => unsubS();
    });
    return () => unsubW();
  }, [user, appId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 className="animate-spin text-slate-300 mb-4" size={32} />
      <p className="text-slate-400 font-bold text-xs">BIRATUNGANYWA...</p>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-4 animate-in fade-in duration-500 text-left pb-10">
      
      {/* Imibare y'ingenzi - Inyungu n'imirimo */}
      <div className="grid grid-cols-4 gap-4 pt-2">
        {[
          { label: "Inyungu y'uku kwezi", value: stats.thisMonthRevenue, unit: 'FRW', icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50', path: '/sales' },
          { label: "Inyungu y'uyu munsi", value: stats.todayRevenue, unit: 'FRW', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/sales' },
          { label: "Imirimo yakozwe *Iyangombwa", value: stats.monthlyCount, unit: 'Imirimo', icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50', path: '/sales' },
          { label: "Ibirindiriye icyangombwa", value: stats.pendingIssuanceCount, unit: 'Ibisigaye', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', path: '/sales', alert: stats.pendingIssuanceCount > 0 }
        ].map((item, i) => (
          <button key={i} onClick={() => navigate(item.path)} className={`bg-white p-5 rounded-2xl border ${item.alert ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'} shadow-sm flex items-center gap-4 hover:border-slate-400 transition-all text-left group`}>
            <div className={`p-3 rounded-xl transition-colors ${item.alert ? 'bg-amber-500 text-white' : `${item.bg} ${item.color} group-hover:bg-slate-900 group-hover:text-white`}`}>
              <item.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{item.label}</p>
              <h3 className={`text-xl font-black ${item.alert ? 'text-amber-600' : 'text-slate-900'}`}>
                {item.value.toLocaleString()}<span className="text-xs font-bold text-slate-400 ml-1">{item.unit}</span>
              </h3>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          
          {/* Igishushanyo cy'imigereranyo y'iminsi y'icyumweru */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase italic">Igereranya rya gahunda (Kwezi gushize vs Uku kwezi)</h3>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-200"/> <span className="text-[10px] font-bold text-slate-400 uppercase">Kwezi gushize</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500"/> <span className="text-[10px] font-bold text-slate-400 uppercase">Uku kwezi</span></div>
              </div>
            </div>
            
            <div className="h-[250px] flex items-end justify-between px-4 pb-2 relative">
               {['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'].map((day, idx) => {
                 const curVal = chartData.current[idx] || 0;
                 const lastVal = chartData.last[idx] || 0;
                 const max = Math.max(...chartData.current, ...chartData.last, 1);
                 return (
                   <div key={idx} className="flex flex-col items-center gap-2 w-full">
                      <div className="flex items-end gap-1.5 h-full w-full justify-center min-h-[180px]">
                        <div className="w-3 bg-slate-100 rounded-t-sm transition-all duration-700" style={{ height: `${(lastVal/max)*100}%` }} />
                        <div className="w-3 bg-indigo-500 rounded-t-sm transition-all duration-700 shadow-lg shadow-indigo-100" style={{ height: `${(curVal/max)*100}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">{day}</span>
                   </div>
                 )
               })}
            </div>
          </div>

          {/* Isesengura rya Inyungu - Igereranya rya vuba */}
          <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
             <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-110 transition-transform pointer-events-none">
               <TrendingUp size={240} className="text-white" />
             </div>
             <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-4">
                   <div className="flex items-center gap-2 bg-indigo-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit">
                     <Zap size={10} fill="currentColor"/> Isesengura ry'imikorere
                   </div>
                   <h3 className="text-3xl font-black text-white tracking-tight leading-tight">
                      Ugereranyije n'igihe nk'iki mu kwezi gushize (1~{new Date().getDate()}), <br/>
                      Inyungu yazamutseho <span className="text-indigo-400">{stats.growthRate}%</span>.
                   </h3>
                   <p className="text-slate-400 text-sm font-medium">Iri sesengura rishingiye ku byangombwa byasohotse muri sisitemu.</p>
                </div>
                <div className="w-48 h-48 bg-white/5 rounded-full border-8 border-white/5 flex flex-col items-center justify-center backdrop-blur-md shrink-0">
                   <span className="text-[10px] font-black text-indigo-400 uppercase mb-1">Ikimenyetso cy'izamuka</span>
                   <span className="text-5xl font-black text-white italic">{stats.growthRate}%</span>
                </div>
             </div>
          </div>
        </div>

        {/* Gahunda y'uyu munsi mu ncamake */}
        <div className="col-span-4 h-full">
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full min-h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-900 uppercase italic">Gahunda y'uyu munsi</h3>
                </div>
                <button onClick={() => navigate('/create')} className="p-1.5 bg-slate-900 text-white rounded-lg hover:bg-black transition-all active:scale-95"><Plus size={16}/></button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-hide">
                {recentSchedules.length > 0 ? recentSchedules.map((s, i) => (
                  <div key={i} onClick={() => setSelectedSchedule(s)} className="p-5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-500 transition-all cursor-pointer shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center min-w-[45px]">
                        <span className="text-[10px] font-black text-slate-400 uppercase leading-none">{s.time < '12:00' ? 'am' : 'pm'}</span>
                        <span className="text-sm font-black text-indigo-600 mt-1">{s.time}</span>
                      </div>
                      <div className="w-px h-8 bg-slate-200" />
                      <div>
                        <p className="text-sm font-black text-slate-800 leading-tight">{s.carModel}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{s.serviceType}</p>
                      </div>
                    </div>
                    <ArrowUpRight size={14} className="text-slate-300 group-hover:text-indigo-600" />
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 text-center">
                    <Clock size={40} className="mb-4 mx-auto" />
                    <p className="text-xs font-black uppercase tracking-widest">Nta gahunda ihari</p>
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>

      {/* --- Idirishya ry'amakuru arambuye ya gahunda --- */}
      {selectedSchedule && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedSchedule(null)}>
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 p-8 text-white relative">
              <button onClick={() => setSelectedSchedule(null)} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"><X size={20}/></button>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-indigo-500 p-1.5 rounded-lg text-white"><Calendar size={16}/></div>
                <span className="text-xs font-black uppercase tracking-widest text-indigo-300">Amakuru ya gahunda</span>
              </div>
              <h3 className="text-3xl font-black tracking-tight">{selectedSchedule.carModel}</h3>
              <p className="text-slate-400 font-bold mt-1 uppercase italic">{selectedSchedule.serviceType} PREMIUM SERVICE</p>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400"><Clock size={18}/></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Igihe</p><p className="font-bold text-slate-900">{selectedSchedule.date} {selectedSchedule.time}</p></div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400"><User size={18}/></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Umukiriya</p><p className="font-bold text-slate-900">{selectedSchedule.customerName || 'Nta makuru'}</p></div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400"><Phone size={18}/></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Telefone</p><p className="font-bold text-slate-900">{selectedSchedule.phone || 'Nta makuru'}</p></div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400"><Car size={18}/></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Ipuraki</p><p className="font-bold text-slate-900">{selectedSchedule.plateNumber || 'Nta makuru'}</p></div>
                </div>
              </div>

              {selectedSchedule.memo && (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2 text-slate-400"><FileText size={14}/><span className="text-[10px] font-black uppercase">Icyitonderwa</span></div>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">{selectedSchedule.memo}</p>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                 <button onClick={() => navigate('/create', { state: { schedule: selectedSchedule } })} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:bg-black transition-all">Sohora icyangombwa</button>
                 <button onClick={() => setSelectedSchedule(null)} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">Funga</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default PcDashboard;