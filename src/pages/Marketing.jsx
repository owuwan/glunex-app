import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Send, Users, CloudRain, Sun, AlertCircle, Snowflake, CheckCircle2, MessageSquare, Edit3, Crown, Monitor, ShieldCheck, Sparkles, Loader2, Filter } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const Marketing = ({ userStatus }) => {
  const navigate = useNavigate();

  // [상태 관리]
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [userName, setUserName] = useState('GLUNEX 파트너'); // 상호명 상태 추가
  
  // 날씨 & 필터
  const [currentWeather, setCurrentWeather] = useState({ status: 'clear', desc: '맑음' });
  const [activeShopMode, setActiveShopMode] = useState('세차'); 
  const [selectedTemplate, setSelectedTemplate] = useState(0);

  const modeToType = {
    '세차': ['wash', 'detailing'],
    '유리막코팅': ['coating'],
    '썬팅': ['tinting'],
    '블랙박스': ['etc'] 
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        let region = 'Seoul';
        let storeName = 'GLUNEX 파트너';

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.region) region = userData.region;
          else if (userData.address) region = userData.address.split(' ')[0];
          
          if (userData.storeName) {
            storeName = userData.storeName;
            setUserName(storeName); // 상호명 저장
          }
        }
        fetchRealWeather(region);

        // 1. 실제 DB 데이터 가져오기
        const q = query(collection(db, "warranties"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const fetchedCustomers = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // 2. [테스트 계정 전용] 더미 데이터 로직
        // 이메일에 'test'나 'admin'이 포함된 경우에만 더미 데이터를 섞어줍니다.
        let finalCustomers = fetchedCustomers;
        if (user.email && (user.email.includes('test') || user.email.includes('admin') || user.email.includes('owner'))) {
             const dummyCustomers = Array(7).fill(null).map((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - 30); 
                return {
                id: `test_${i}`,
                customerName: `테스트고객${i+1}`,
                carModel: `테스트차량${i+1}`,
                phone: `0100000000${i+1}`,
                serviceType: 'wash',
                issuedAt: date.toISOString(),
                maintPeriod: '0'
                };
            });
            finalCustomers = [...fetchedCustomers, ...dummyCustomers];
        }

        setCustomers(finalCustomers);

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

  // [수정] 상호명 적용 & 감성 터지는 세차 문자 템플릿
  const messageTemplates = {
    "세차": {
      rain: [
        { id: 0, tag: "☔️ 빗길안전", title: "비오는 날 감성 문자", 
          content: `[${userName}] 안녕하세요 고객님! 비가 많이 내리네요.\n\n빗길 운전은 시야 확보가 가장 중요합니다. 와이퍼 상태는 괜찮으신가요?\n안전운전 하시고, 비 그친 뒤 방문해주시면 물왁스 코팅을 서비스로 해드릴게요! 🚙✨` 
        },
        { id: 1, tag: "🛠 산성비", title: "도장면 보호 제안", 
          content: `[${userName}] 고객님, 요즘 내리는 비는 산성 성분이 강해 도장면을 파고들 수 있습니다.\n\n비 그친 직후가 골든타임! ⏰\n이번 주말 예약 시 '프리미엄 폼건 세차 + 하부 세차' 패키지를 20% 할인해 드립니다.` 
        },
        { id: 2, tag: "👀 시야확보", title: "유막제거 할인", 
          content: `[${userName}] 비 오는 날, 앞유리가 뿌옇게 보이지 않나요?\n\n기름때(유막)가 원인입니다. 빗길 사고 예방을 위해 유막제거가 필수입니다.\n오늘 예약하시면 발수코팅까지 반값에 시공해 드립니다!` 
        }
      ],
      clear: [
        { id: 0, tag: "☀️ 나들이", title: "봄철/나들이 시즌", 
          content: `[${userName}] 날씨가 정말 좋네요! ☀️\n\n요즘 송진가루나 나무 수액 때문에 차가 끈적이지 않나요?\n그대로 두면 도장면이 변색될 수 있습니다.\n\n전문가의 손길로 말끔하게 제거하고 기분 좋게 드라이브 떠나보세요! (예약 필수)` 
        },
        { id: 1, tag: "🚧 주의사항", title: "공사현장/철분", 
          content: `[${userName}] 안녕하세요! 고객님.\n\n혹시 최근 공사현장 근처를 지나셨나요? 눈에 안 보이는 철분가루가 박혀있을 수 있습니다.\n\n차 표면이 거칠다면 바로 방문해주세요. 철분제거 전문 패키지로 매끄러운 광택을 되찾아 드립니다.` 
        },
        { id: 2, tag: "✨ 광택", title: "광택 증진 제안", 
          content: `[${userName}] 햇살이 눈부신 날입니다! ✨\n\n이런 날씨엔 세차만 해도 차가 달라 보이죠.\n오늘 방문하시면 일반 왁스 대신 '고급 퀵 디테일러'로 마무리해 드려 광택감을 2배로 올려드립니다!` 
        }
      ]
    },
    "유리막코팅": {
        main: [
            { id: 0, tag: "🔧 점검", title: "정기 점검 시기", content: `[${userName}] 유리막 코팅 시공 6개월이 지났습니다. 발수력 유지 확인을 위해 매장에 방문해 주세요 (무료 점검).` },
            { id: 1, tag: "💧 관리", title: "메인터넌스", content: `[${userName}] 코팅막 수명을 늘리는 전용 관리제 시공! 지금 예약하시면 20% 할인해 드립니다.` },
            { id: 2, tag: "🎁 혜택", title: "재시공 할인", content: `[${userName}] 혹시 접촉사고나 스크래치가 있으신가요? 기존 고객님께만 부분 재시공 할인 혜택을 드립니다.` }
        ]
    },
    "썬팅": { main: [{ id: 0, tag: "🔥 열차단", title: "열차단 점검", content: `[${userName}] 다가오는 여름, 썬팅 성능은 괜찮으신가요? 무료 열차단 측정해 드립니다.` }] },
    "블랙박스": { main: [{ id: 0, tag: "💾 메모리", title: "메모리 점검", content: `[${userName}] 블랙박스 영상 확인해보셨나요? 중요한 순간을 위해 메모리카드 점검이 필수입니다.` }] }
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
    const phones = targetList.map(c => c.phone).join(',');
    window.location.href = `sms:${phones}?body=${encodeURIComponent(selectedContent)}`; 
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in font-noto">
      {/* 1. 상단 헤더 & 업종 선택 */}
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
            {/* 2. 타겟팅 요약 */}
            <div className="mb-6 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Users size={16} className="text-blue-600" />
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

            {/* 3. 추천 문구 선택 */}
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
                      <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-3 whitespace-pre-wrap">{t.content}</p>
                    </div>
                  ))}
               </div>
            </div>

            {/* 4. 발송 명단 리스트 */}
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
                     <p className="text-[10px] text-slate-300 mt-1">오늘 보증서를 발행하면 나중에 표시됩니다.</p>
                   </div>
                 )}
               </div>
            </div>
          </>
        )}
      </div>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-100 z-40 max-w-md mx-auto">
        {/* 사장님 안내 문구 추가 */}
        <div className="mb-3 px-2">
            <p className="text-[11px] text-slate-500 leading-snug text-center bg-slate-50 p-2 rounded-lg border border-slate-100">
               💡 <span className="font-bold text-blue-600">Tip:</span> 반드시 매장 스케줄을 고려하여 <br/>
               <span className="underline decoration-blue-200 decoration-2">할인율 및 서비스 내용을 수정한 후</span> 발송해 주세요!
            </p>
        </div>
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
