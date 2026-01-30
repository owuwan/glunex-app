import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Wallet, TrendingUp, Calendar, CheckCircle2, 
  Clock, Sparkles, MessageSquare, Edit3, 
  ChevronRight, Info, X, Loader2, ArrowUpRight
} from 'lucide-react';
import { auth, db } from '../firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const Sales = () => {
  const navigate = useNavigate();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'glunex-app';

  // --- 상태 관리 ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  
  const [stats, setStats] = useState({
    confirmed: 0,
    completed: 0,
    expected: 0,
    total: 0
  });

  const [chartData, setChartData] = useState([]);

  // --- 인증 로직 ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 데이터 페칭 및 통합 계산 ---
  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    const qWarranties = query(collection(db, "warranties"), where("userId", "==", user.uid));
    const schedulesRef = collection(db, 'artifacts', appId, 'public', 'data', 'schedules');

    const unsubW = onSnapshot(qWarranties, (wSnap) => {
      const unsubS = onSnapshot(schedulesRef, (sSnap) => {
        let confirmedSum = 0;
        let completedSum = 0;
        let expectedSum = 0;

        wSnap.docs.forEach(doc => {
          const data = doc.data();
          const price = Number(String(data.price || "0").replace(/[^0-9]/g, '')) || 0;
          confirmedSum += price;
        });

        sSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.userId !== user.uid) return;

          const price = Number(String(data.price || "0").replace(/[^0-9]/g, '')) || 0;
          const [sH, sM] = (data.time || "00:00").split(':').map(Number);
          
          const isPastDate = data.date < todayStr;
          const isTodayPastTime = data.date === todayStr && (sH < currentH || (sH === currentH && sM < currentM));

          if (isPastDate || isTodayPastTime) {
            completedSum += price;
          } else {
            expectedSum += price;
          }
        });

        setStats({
          confirmed: confirmedSum,
          completed: completedSum,
          expected: expectedSum,
          total: confirmedSum + completedSum + expectedSum
        });

        // 주식 차트 스타일을 위한 최근 7일 모의 트렌드 데이터
        const days = ['월', '화', '수', '목', '금', '토', '일'];
        setChartData(days.map((name, i) => ({
          name,
          confirmed: 30 + Math.sin(i) * 10 + Math.random() * 20,
          completed: 20 + Math.cos(i) * 5 + Math.random() * 15,
          expected: 15 + Math.random() * 25,
        })));

      }, (err) => console.error("Schedule Listener Error:", err));
      
      return () => unsubS();
    }, (err) => console.error("Warranty Listener Error:", err));

    return () => unsubW();
  }, [user, appId]);

  // 주식 그래프용 Path 생성 함수
  const generatePath = (data, key, height = 150, width = 350) => {
    if (data.length === 0) return "";
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (d[key] / 100) * height;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  const generateAreaPath = (data, key, height = 150, width = 350) => {
    if (data.length === 0) return "";
    const linePath = generatePath(data, key, height, width);
    return `${linePath} L ${width},${height} L 0,${height} Z`;
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-[#F8F9FB] text-slate-800 font-sans overflow-hidden max-w-md mx-auto relative select-none">
      
      {/* 헤더 */}
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 bg-white border-b border-slate-100 z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-full transition-colors active:scale-90">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-slate-900 tracking-tight italic uppercase">Revenue <span className="text-blue-600">Analytics</span></h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6 pb-36 scrollbar-hide">
        
        {/* 요약 카드 */}
        <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full blur-[60px] -mr-20 -mt-20"></div>
          <div className="relative z-10 text-left">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">Live Performance Index</p>
            </div>
            <div className="flex items-baseline gap-2 mb-8 text-left">
              <span className="text-4xl font-black tracking-tighter">{(stats.confirmed + stats.completed).toLocaleString()}</span>
              <span className="text-lg font-bold opacity-40">원</span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <div className="text-left">
                <p className="text-slate-500 text-[9px] font-bold mb-1 uppercase">Confirmed</p>
                <p className="text-sm font-black text-blue-400">{stats.confirmed.toLocaleString()}</p>
              </div>
              <div className="text-left">
                <p className="text-slate-500 text-[9px] font-bold mb-1 uppercase">Pending</p>
                <p className="text-sm font-black text-green-400">{stats.completed.toLocaleString()}</p>
              </div>
              <div className="text-left">
                <p className="text-slate-500 text-[9px] font-bold mb-1 uppercase">Expected</p>
                <p className="text-sm font-black text-amber-400">{stats.expected.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 주식 차트 스타일 그래프 */}
        <section className="bg-white rounded-[2.5rem] p-7 border border-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.03)] space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 italic">
              <TrendingUp size={18} className="text-blue-600" /> Market Trend
            </h3>
            <div className="flex gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"/><span className="text-[8px] font-bold text-slate-400">확정</span></div>
              <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"/><span className="text-[8px] font-bold text-slate-400">완료</span></div>
              <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"/><span className="text-[8px] font-bold text-slate-400">예상</span></div>
            </div>
          </div>

          <div className="relative h-44 w-full">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 350 150" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* 가이드 라인 */}
              <line x1="0" y1="0" x2="350" y2="0" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="50" x2="350" y2="50" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="100" x2="350" y2="100" stroke="#f1f5f9" strokeWidth="1" />

              {/* 확정 매출 Area */}
              <path d={generateAreaPath(chartData, 'confirmed')} fill="url(#gradBlue)" />
              <path d={generatePath(chartData, 'confirmed')} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
              
              {/* 완료 매출 Area */}
              <path d={generateAreaPath(chartData, 'completed')} fill="url(#gradGreen)" />
              <path d={generatePath(chartData, 'completed')} fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 4" />
              
              {/* 예상 매출 Line */}
              <path d={generatePath(chartData, 'expected')} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            </svg>
            
            <div className="flex justify-between mt-4 px-1">
               {chartData.map((d, i) => (
                 <span key={i} className="text-[10px] font-black text-slate-300">{d.name}</span>
               ))}
            </div>
          </div>
        </section>

        {/* 상세 분석 섹션 */}
        <section className="grid grid-cols-1 gap-3">
           {[
             { title: 'Confirmed Revenue', label: '보증서 발행 실매출', value: stats.confirmed, color: 'blue', icon: <CheckCircle2 size={20}/> },
             { title: 'Work Completed', label: '미정산 시공 완료액', value: stats.completed, color: 'green', icon: <Clock size={20}/> },
             { title: 'Future Pipeline', label: '예약 대기 잠재 매출', value: stats.expected, color: 'amber', icon: <Calendar size={20}/> }
           ].map((item, idx) => (
             <div key={idx} className={`bg-white p-6 rounded-3xl border border-slate-200 flex items-center justify-between shadow-sm`}>
                <div className="flex items-center gap-4 text-left">
                   <div className={`p-3 rounded-2xl text-white shadow-lg ${item.color === 'blue' ? 'bg-blue-600' : item.color === 'green' ? 'bg-green-600' : 'bg-amber-500'}`}>
                      {item.icon}
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{item.title}</p>
                      <p className="text-xs font-bold text-slate-800">{item.label}</p>
                   </div>
                </div>
                <p className="text-lg font-black text-slate-900">{item.value.toLocaleString()}원</p>
             </div>
           ))}
        </section>

      </main>

      {/* 하단 플로팅 액션 */}
      <footer className="fixed bottom-0 left-0 right-0 p-8 bg-white/80 backdrop-blur-2xl border-t border-slate-100 max-w-md mx-auto z-40">
        <button 
          onClick={() => setShowMarketingModal(true)}
          className="w-full py-5 bg-slate-900 text-white rounded-[2.5rem] font-black text-lg flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all shadow-slate-900/40"
        >
          <Sparkles size={20} className="text-amber-400" /> 수익 극대화 마케팅 시작하기
        </button>
      </footer>

      {/* 마케팅 브릿지 모달 (중앙 배치) */}
      {showMarketingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-fade-in" onClick={() => setShowMarketingModal(false)}>
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl relative flex flex-col p-8 pb-10 overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
              
              <div className="flex justify-between items-start mb-10 text-left">
                 <div>
                    <h3 className="text-[26px] font-black text-slate-900 tracking-tighter leading-[1.2]">수익 성장을 위한<br/>맞춤 전략 실행</h3>
                    <div className="w-10 h-1 bg-blue-600 rounded-full mt-4"></div>
                 </div>
                 <button onClick={() => setShowMarketingModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-300 hover:text-slate-900 transition-colors"><X size={24}/></button>
              </div>

              <div className="space-y-4">
                 {/* 단골 케어 */}
                 <button 
                    onClick={() => navigate('/marketing')}
                    className="w-full p-7 bg-blue-600 rounded-[2.5rem] flex items-center justify-between group active:scale-[0.98] transition-all shadow-xl shadow-blue-100"
                 >
                    <div className="flex items-center gap-5">
                       <div className="p-3 bg-white/20 rounded-2xl text-white"><MessageSquare size={26} /></div>
                       <div className="text-left">
                          <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-1">Loyalty CRM</p>
                          <p className="text-lg font-black text-white leading-none">기존 고객 연락하기</p>
                       </div>
                    </div>
                    <ArrowUpRight className="text-white opacity-40 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                 </button>

                 {/* 신규 유입 */}
                 <button 
                    onClick={() => navigate('/creator')}
                    className="w-full p-7 bg-slate-900 rounded-[2.5rem] flex items-center justify-between group active:scale-[0.98] transition-all shadow-xl shadow-slate-300"
                 >
                    <div className="flex items-center gap-5">
                       <div className="p-3 bg-white/10 rounded-2xl text-white"><Edit3 size={26} /></div>
                       <div className="text-left">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Viral Marketing</p>
                          <p className="text-lg font-black text-white leading-none">새로운 홍보글 쓰기</p>
                       </div>
                    </div>
                    <ArrowUpRight className="text-white opacity-40 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                 </button>
              </div>

              <p className="mt-8 text-[10px] text-center text-slate-400 font-bold uppercase tracking-[0.4em]">Optimized Growth Loop</p>
           </div>
        </div>
      )}

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in {
          animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default Sales;