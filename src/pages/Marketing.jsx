import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Send, Users, CloudRain, Sun, AlertCircle, Snowflake, CheckCircle2, MessageSquare, Edit3, Crown, Monitor, ShieldCheck, Sparkles, Loader2, Filter } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const Marketing = ({ userStatus }) => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]); 
  
  const [currentWeather, setCurrentWeather] = useState({ status: 'clear', desc: '맑음' });
  const [activeShopMode, setActiveShopMode] = useState('세차'); 
  const [selectedTemplate, setSelectedTemplate] = useState(0);

  const modeToType = {
    '세차': ['wash', 'detailing'],
    '유리막코팅': ['coating'],
    '썬팅': ['tinting'],
    '블랙박스': ['etc'] 
  };

  // [테스트용] 가짜 고객 7명 생성 (세차한지 3주 지난 상태)
  const dummyCustomers = Array(7).fill(null).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // 30일 전 방문 (3주 지남 조건 충족)
    return {
      id: `test_${i}`,
      customerName: `테스트고객${i+1}`,
      carModel: `테스트차량${i+1}`,
      phone: `0100000000${i+1}`, // 가짜 번호
      serviceType: 'wash',
      issuedAt: date.toISOString(),
      maintPeriod: '0'
    };
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        let region = 'Seoul';
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.region) region = userData.region;
          else if (userData.address) region = userData.address.split(' ')[0];
        }
        fetchRealWeather(region);

        // 실제 DB 데이터 가져오기
        const q = query(collection(db, "warranties"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const fetchedCustomers = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // [중요] 실제 데이터 + 테스트용 가짜 데이터 7명 합치기
        setCustomers([...fetchedCustomers, ...dummyCustomers]);

      } catch (error) {
        console.error("데이터 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchRealWeather = async (region) => {
    try {
      const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
      if (!API_KEY) return;
      
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(region)}&appid=${API_KEY}&units=metric`);
      const data = await res.json();
      
      if (data.cod === 200) {
        const main = data.weather[0].main;
        const isRain = main === 'Rain' || main === 'Drizzle' || main === 'Thunderstorm' || main === 'Snow';
        const isSnow = main === 'Snow';
        
        if (isSnow) setCurrentWeather({ status: 'snow', desc: '눈' });
        else if (isRain) setCurrentWeather({ status: 'rain', desc: '비' });
        else setCurrentWeather({ status: 'clear', desc: '맑음' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getTargetCustomers = () => {
    const targetTypes = modeToType[activeShopMode] || [];
    
    return customers.filter(c => {
      if (!targetTypes.includes(c.serviceType)) return false;

      const issuedDate = new Date(c.issuedAt);
      const today = new Date();

      if (activeShopMode === '세차') {
        // 3주(21일) 지난 고객만 타겟팅
        const diffTime = Math.abs(today - issuedDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays >= 21; 
      } else {
        const diffMonths = (today.getFullYear() - issuedDate.getFullYear()) * 12 + (today.getMonth() - issuedDate.getMonth());
        const period = parseInt(c.maintPeriod || '6');
        return diffMonths >= period;
      }
    });
  };

  const targetList = getTargetCustomers();

  const messageTemplates = {
    "세차": {
      rain: [
        { id: 0, tag: "☔️ 안부", title: "빗길 안전 운전", content: "[GLUNEX] 비가 많이 오네요. 빗길 시야 확보는 잘 되시나요? 안전운전 하시고 비 그치면 세차하러 오세요!" },
        { id: 1, tag: "💰 혜택", title: "비 오는 날 할인", content: "[GLUNEX] 오늘 방문 시 유막제거 50% 할인! 비 오는 날 쾌적한 시야를 만들어 드립니다." },
        { id: 2, tag: "🛡 관리", title: "산성비 주의", content: "[GLUNEX] 산성비는 도장면 부식의 원인입니다. 비 그친 직후 프리미엄 세차로 차량을 보호하세요." }
      ],
      clear: [
        { id: 0, tag: "☀️ 날씨", title: "세차하기 좋은 날", content: "[GLUNEX] 미세먼지 없는 화창한 날씨! 묵은 때 벗겨내고 드라이브 떠나기 딱 좋은 날입니다." },
        { id: 1, tag: "✨ 광택", title: "광택 패키지", content: "[GLUNEX] 햇살 아래 빛나는 차를 만들어드립니다. 오늘 세차 시 퀵 디테일러 코팅 무료 업그레이드!" },
        { id: 2, tag: "📅 예약", title: "주말 예약 알림", content: "[GLUNEX] 이번 주말 나들이 계획 있으신가요? 쾌적한 여행을 위해 내부 세차 미리 예약하세요." }
      ]
    },
    "유리막코팅": {
        main: [
            { id: 0, tag: "🔧 점검", title: "정기 점검 시기", content: "[GLUNEX] 유리막 코팅 시공 후 관리 주기가 도래했습니다. 발수력 점검 받으러 오세요!" },
            { id: 1, tag: "💧 관리", title: "메인터넌스", content: "[GLUNEX] 코팅막 수명을 늘리는 전용 관리제 시공! 지금 예약하시면 20% 할인해 드립니다." },
            { id: 2, tag: "🎁 혜택", title: "재시공 할인", content: "[GLUNEX] 혹시 접촉사고나 스크래치가 있으신가요? 기존 고객님께만 부분 재시공 할인 혜택을 드립니다." }
        ]
    },
    "썬팅": { main: [{ id: 0, tag: "🔥 열차단", title: "열차단 점검", content: "[GLUNEX] 다가오는 여름, 썬팅 성능은 괜찮으신가요? 무료 열차단 측정해 드립니다." }] },
    "블랙박스": { main: [{ id: 0, tag: "💾 메모리", title: "메모리 점검", content: "[GLUNEX] 블랙박스 영상 확인해보셨나요? 중요한 순간을 위해 메모리카드 점검이 필수입니다." }] }
  };

  const getTemplates = () => {
    if (activeShopMode === '세차') {
        return messageTemplates['세차'][currentWeather.status] || messageTemplates['세차']['clear'];
    }
    return messageTemplates[activeShopMode]?.main || messageTemplates['유리막코팅']['main'];
  };

  const currentTemplates = getTemplates();
  const selectedContent = currentTemplates[selectedTemplate].content;

  const handleSend = () => {
    if(targetList.length === 0) return alert("발송할 대상이 없습니다.");
    if (userStatus !== 'approved') {
      const go = window.confirm("🔒 프리미엄 파트너 전용 기능입니다.\n멤버십 페이지로 이동하시겠습니까?");
      if(go) navigate('/mypage');
      return;
    }
    
    // [중요] 다중 발송 처리 (번호1,번호2,번호3...)
    const phones = targetList.map(c => c.phone).join(',');
    
    // 아이폰/안드로이드 호환성을 위한 구분자 처리 (보통 콤마나 세미콜론)
    // 최신 스마트폰은 콤마(,)로 구분된 번호를 자동으로 인식하여 그룹 문자로 잡아줍니다.
    window.location.href = `sms:${phones}?body=${encodeURIComponent(selectedContent)}`; 
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in font-noto">
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="px-6 py-4 flex items-center justify-between pt-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="text-slate-400"><ChevronRight size={24} className="rotate-180" /></button>
            <h2 className="text-lg font-bold text-slate-900">마케팅 센터</h2>
          </div>
        </div>
        <div className="px-6 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {["세차", "유리막코팅", "썬팅", "블랙박스"].map(type => (
            <button
              key={type}
              onClick={() => {setActiveShopMode(type); setSelectedTemplate(0);}}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-black transition-all ${
                activeShopMode === type ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-40">
        {loading ? (
           <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="animate-spin" size={32} />
              <span className="text-xs">고객 데이터를 분석 중입니다...</span>
           </div>
        ) : (
          <>
            <div className="mb-6 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                        <Users size={16} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 uppercase">발송타겟 회원수</span>
                    </div>
                    {/* 전체 고객 수 (실제 + 더미) */}
                    <span className="text-slate-900 text-lg font-black">({customers.length}명)</span>
                </div>
                
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-bold text-blue-600 uppercase mb-0.5">
                            {activeShopMode === '세차' ? '3주 이상 미방문 고객' : '관리 주기 도래 고객'}
                        </p>
                        <p className="text-sm font-bold text-slate-900">
                            타겟 회원 <span className="text-blue-600 text-lg font-black ml-1">{targetList.length}명</span>
                        </p>
                    </div>
                    {activeShopMode === '세차' && (
                       <div className="flex flex-col items-center bg-blue-50 p-2 rounded-xl">
                          <span className="text-[10px] text-blue-400 mb-1 font-bold">{currentWeather.desc}</span>
                          {currentWeather.status === 'rain' || currentWeather.status === 'snow' ? <CloudRain className="text-blue-500" size={20} /> : <Sun className="text-amber-500" size={20} />}
                       </div>
                    )}
                </div>
            </div>

            <div className="mb-8">
               <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5 ml-1">
                 <Sparkles size={14} className="text-amber-500" /> 추천 메시지 선택
               </h3>
               <div className="space-y-3">
                  {currentTemplates.map((t, idx) => (
                    <div 
                      key={t.id} 
                      onClick={() => setSelectedTemplate(idx)}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${selectedTemplate === idx ? 'border-blue-600 bg-blue-50/50 shadow-md' : 'border-white bg-white shadow-sm hover:border-slate-200'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${selectedTemplate === idx ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {t.tag}
                        </span>
                        {selectedTemplate === idx && <CheckCircle2 size={20} className="text-blue-600" />}
                      </div>
                      <p className="text-sm font-bold text-slate-900 mb-1">{t.title}</p>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2">{t.content}</p>
                    </div>
                  ))}
               </div>
            </div>

            <div className="pt-2">
               <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 ml-1">발송 명단 ({targetList.length}명)</h3>
               <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                 {targetList.length > 0 ? (
                   targetList.map((customer) => {
                     const issuedDate = new Date(customer.issuedAt);
                     const today = new Date();
                     const diffDays = Math.ceil(Math.abs(today - issuedDate) / (1000 * 60 * 60 * 24));

                     return (
                      <div key={customer.id} className="p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 text-[11px] font-bold">
                              {customer.customerName?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{customer.customerName} <span className="text-[10px] text-slate-400 font-normal">{customer.carModel}</span></p>
                            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">{customer.serviceType}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded-lg">
                          {activeShopMode === '세차' ? `${diffDays}일 전 방문` : `${customer.maintPeriod}개월 주기`}
                        </span>
                      </div>
                    );
                  })
                 ) : (
                   <div className="p-10 text-center">
                     <AlertCircle size={24} className="mx-auto text-slate-300 mb-2" />
                     <p className="text-xs text-slate-400">
                       {activeShopMode === '세차' ? '3주 이상 미방문 고객이 없습니다.' : '관리 주기가 도래한 고객이 없습니다.'}
                     </p>
                   </div>
                 )}
               </div>
            </div>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-100 z-40 max-w-md mx-auto">
        <button 
            onClick={handleSend}
            disabled={targetList.length === 0}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:bg-slate-300"
        >
           <Send size={18} /> {targetList.length}명에게 문자 보내기
        </button>
      </div>
    </div>
  );
};

export default Marketing;
