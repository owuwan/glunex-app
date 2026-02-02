import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, MessageSquare, Sun, CloudRain, 
  Wind, Sparkles, ChevronRight, Search, Filter, 
  Send, Calendar, Clock, CheckCircle2, AlertCircle,
  Loader2, Smartphone, Target, Zap, MousePointer2
} from 'lucide-react';

// [오류 방지] 상대 경로를 사용하여 Firebase 설정 로드
import { auth, db } from '../../firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

/**
 * PcMarketing: 앱의 날씨 기반 마케팅 로직을 계승한 PC 전용 마케팅 관리 페이지
 */
const PcMarketing = ({ userStatus }) => {
  const navigate = useNavigate();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'glunex-app';

  // --- [상태 관리] ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState({ temp: 0, status: 'Clear', desc: '맑음' });
  const [customers, setCustomers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // --- [1. 인증 로직] ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
      } else {
        try { await signInAnonymously(auth); } catch (e) { navigate('/login'); }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // --- [2. 날씨 및 데이터 로드 로직: 앱 버전 로직 이식] ---
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // 날씨 데이터 가져오기 (OpenWeather)
        const API_KEY = "651347101e403d6d0669288124237d45";
        const wRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid=${API_KEY}&units=metric&lang=kr`);
        const wData = await wRes.json();
        if (wData.cod === 200) {
          setWeather({ 
            temp: Math.round(wData.main.temp), 
            status: wData.weather[0].main, 
            desc: wData.weather[0].description 
          });
        }

        // 고객 데이터 가져오기 (Warranties 기반)
        const q = query(collection(db, "warranties"), where("userId", "==", user.uid));
        const snapshot = await getDocs(q);
        const customerList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // 중복 제거 및 최신순 정렬
        const uniqueCustomers = Array.from(new Map(customerList.map(item => [item.phone, item])).values());
        setCustomers(uniqueCustomers);
      } catch (err) {
        console.error("Data Load Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // 날씨별 추천 템플릿 생성 로직
  const getTemplates = () => {
    const isRainy = weather.status.toLowerCase().includes('rain');
    const isCold = weather.temp < 5;

    if (isRainy) {
      return [
        { id: 1, title: '비 오는 날 유막제거', content: `[비 소식 알림] 안녕하세요 고객님! 오늘 비가 많이 오네요. 시야 확보를 위한 유막제거 및 발수코팅 케어는 어떠신가요?`, icon: <CloudRain size={20}/> },
        { id: 2, title: '시공 후 관리 안내', content: `안녕하세요! 최근 시공 받으신 차량, 비 오는 날 야외 주차보다는 실내 주차를 권장드립니다.`, icon: <AlertCircle size={20}/> }
      ];
    }
    return [
      { id: 1, title: '정기 점검 알림', content: `안녕하세요 고객님! 시공 받으신 지 어느덧 3개월이 지났습니다. 메인터넌스 관리를 위해 방문해주세요.`, icon: <Calendar size={20}/> },
      { id: 2, title: '신차 패키지 혜택', content: `[특별 이벤트] 주변에 신차 구매하신 분이 있다면 소개해주세요! 소개 시 두 분 모두에게 프리미엄 세차권을 드립니다.`, icon: <Sparkles size={20}/> }
    ];
  };

  const templates = getTemplates();

  const handleSendSMS = (customer) => {
    if (!selectedTemplate) return alert("먼저 메시지 템플릿을 선택해주세요.");
    const msg = selectedTemplate.content.replace('고객님', `${customer.customerName}님`);
    window.location.href = `sms:${customer.phone}?body=${encodeURIComponent(msg)}`;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 className="animate-spin text-slate-300 mb-4" size={32} />
      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Weather Syncing...</p>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500 text-left pb-10">
      
      {/* 1. 상단 날씨 기반 마케팅 추천 보드 */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-indigo-500/20 to-transparent flex items-center justify-center">
           {weather.status.toLowerCase().includes('rain') ? <CloudRain size={120} className="opacity-20 rotate-12" /> : <Sun size={120} className="opacity-20 rotate-12" />}
        </div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">Weather Insight</div>
              <span className="text-indigo-400 font-bold text-sm">{weather.temp}°C {weather.desc}</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight leading-tight">
              {weather.status.toLowerCase().includes('rain') 
                ? "오늘은 비 소식이 있습니다. \n유막제거와 발수코팅 마케팅이 효과적입니다." 
                : "오늘 날씨가 매우 맑습니다. \n프리미엄 세차 및 코팅 점검 문구를 발송해보세요."}
            </h2>
            <p className="text-slate-400 font-medium">실시간 기상 데이터를 분석하여 현재 가장 고객 전환율이 높은 전략을 제안합니다.</p>
          </div>
          <div className="hidden lg:flex flex-col items-end gap-2">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Connected Device</p>
            <div className="flex items-center gap-2 text-indigo-400 font-bold">
              <Smartphone size={20} />
              <span>Mobile SMS Link Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        
        {/* 2. 좌측: 고객 타겟 리스트 (Span 7) */}
        <div className="col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[650px]">
           <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <Users size={20} className="text-indigo-600" />
                 <h3 className="font-black text-slate-900 uppercase">타겟 고객 리스트</h3>
              </div>
              <div className="relative">
                 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input type="text" placeholder="고객명, 차량번호 검색" className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition-all w-64 font-medium" />
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
              {customers.length > 0 ? customers.map((c, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-300 transition-all">
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm group-hover:text-indigo-600">
                      <User size={20} />
                    </div>
                    <div>
                       <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                         {c.customerName} 
                         <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter bg-white px-1.5 py-0.5 rounded border border-slate-100">{c.plateNumber}</span>
                       </p>
                       <p className="text-[11px] text-slate-400 font-bold mt-0.5">{c.carModel} • 마지막 시공 {c.issuedAt?.split('T')[0]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => handleSendSMS(c)} className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-black active:scale-95 transition-all">
                       <Send size={14} /> 메시지 전송
                     </button>
                  </div>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                   <Target size={40} className="mb-4" />
                   <p className="text-xs font-black uppercase tracking-widest">발송 가능한 고객이 없습니다.</p>
                </div>
              )}
           </div>
        </div>

        {/* 3. 우측: 메시지 템플릿 & 프리뷰 (Span 5) */}
        <div className="col-span-5 space-y-6 h-full">
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full min-h-[650px]">
              <div className="mb-8">
                 <div className="flex items-center gap-2 mb-6">
                    <Zap size={18} className="text-amber-500 fill-amber-500" />
                    <h3 className="font-black text-slate-900 uppercase">상황별 추천 템플릿</h3>
                 </div>
                 <div className="space-y-3">
                    {templates.map(t => (
                      <button 
                        key={t.id} 
                        onClick={() => setSelectedTemplate(t)}
                        className={`w-full p-5 rounded-2xl border text-left transition-all ${selectedTemplate?.id === t.id ? 'border-indigo-600 bg-indigo-50 shadow-md shadow-indigo-100' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}
                      >
                         <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${selectedTemplate?.id === t.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>{t.icon}</div>
                            <span className="text-sm font-black text-slate-800">{t.title}</span>
                         </div>
                         <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2">{t.content}</p>
                      </button>
                    ))}
                 </div>
              </div>

              <div className="mt-auto border-t border-slate-100 pt-8">
                 <div className="flex items-center gap-2 mb-4">
                    <MessageSquare size={16} className="text-slate-400" />
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Message Preview</h4>
                 </div>
                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 relative min-h-[150px]">
                    <p className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                      {selectedTemplate ? selectedTemplate.content : "템플릿을 선택하면 미리보기가 표시됩니다."}
                    </p>
                    <div className="absolute bottom-4 right-4 text-[9px] font-black text-slate-300 uppercase">Glunex Smart CRM</div>
                 </div>
                 
                 <div className="mt-6 p-4 bg-indigo-50 rounded-xl flex items-start gap-3 border border-indigo-100/50">
                    <MousePointer2 size={16} className="text-indigo-600 mt-1 shrink-0" />
                    <p className="text-[10px] text-indigo-700 leading-relaxed font-medium">
                       고객 리스트에서 <span className="font-bold underline">메시지 전송</span> 버튼을 누르면 <br/>연결된 모바일 기기를 통해 문자가 발송됩니다.
                    </p>
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

export default PcMarketing;