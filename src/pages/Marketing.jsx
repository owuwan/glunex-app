import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Send, Users, CloudRain, Sun, AlertCircle, Snowflake, Filter, CheckCircle2, MessageSquare, Edit3, Crown, Monitor, ShieldCheck, Sparkles } from 'lucide-react';

const Marketing = () => {
  const navigate = useNavigate();

  // [설정] 사장님의 매장 유형 & 현재 날씨
  const myShopTypes = ["세차", "유리막코팅", "썬팅", "블랙박스"]; 
  const [activeShopMode, setActiveShopMode] = useState(myShopTypes[0]);
  const [currentWeather, setCurrentWeather] = useState('rain'); 
  const [selectedTemplate, setSelectedTemplate] = useState(0); // 선택한 문구 번호 (0, 1, 2)

  // 전체 고객 데이터 (업종 및 시공일 포함)
  const allCustomers = [
    { id: 1, name: '강민수', car: 'GV80', type: '유리막코팅', lastVisit: '2025-08-10', lastSmsDate: '2026-01-20' }, 
    { id: 2, name: '고영희', car: '아반떼', type: '세차', lastVisit: '2025-12-25', lastSmsDate: '2025-12-25' }, 
    { id: 3, name: '김철수', car: '그랜저', type: '유리막코팅', lastVisit: '2025-07-01', lastSmsDate: '2026-01-01' }, 
    { id: 4, name: '이미래', car: 'K8', type: '썬팅', lastVisit: '2024-05-25', lastSmsDate: '2026-01-25' }, 
    { id: 5, name: '최홍철', car: 'G80', type: '세차', lastVisit: '2025-11-10', lastSmsDate: '2025-11-10' }, 
    { id: 6, name: '박태준', car: '싼타페', type: '블랙박스', lastVisit: '2024-01-10', lastSmsDate: '2025-12-10' },
  ];

  // 14일 이내 발송자 체크 로직 (피로도 관리)
  const checkIsExcluded = (lastDate) => {
    const last = new Date(lastDate);
    const today = new Date();
    const diffDays = Math.ceil(Math.abs(today - last) / (1000 * 60 * 60 * 24));
    return diffDays <= 14;
  };

  // [타겟팅] 업종 및 주기에 따른 필터링
  const targetCustomers = allCustomers.filter(c => {
    const isNotFatigued = !checkIsExcluded(c.lastSmsDate); 
    const isMyJob = c.type === activeShopMode;

    if (activeShopMode === '세차') return isNotFatigued && isMyJob; // 세차는 날씨따라 수시로
    if (activeShopMode === '유리막코팅') { // 6개월 주기
        const diffMonths = (new Date().getFullYear() - new Date(c.lastVisit).getFullYear()) * 12 + (new Date().getMonth() - new Date(c.lastVisit).getMonth());
        return isNotFatigued && isMyJob && diffMonths >= 6;
    }
    // 썬팅/블박 등은 1년 주기
    const diffMonths = (new Date().getFullYear() - new Date(c.lastVisit).getFullYear()) * 12 + (new Date().getMonth() - new Date(c.lastVisit).getMonth());
    return isNotFatigued && isMyJob && diffMonths >= 12;
  });

  // [추천 문구] 상황별 3가지 옵션 (감성형 / 혜택형 / 정보형)
  const messageTemplates = {
    // 1. 세차 (날씨 민감)
    "세차": {
      rain: [
        { id: 0, tag: "☔️ 감성/안부", title: "빗길 안전 운전", content: "[GLUNEX] 비가 많이 오네요. 빗길 시야 확보는 잘 되시나요? 고객님의 안전운전을 기원합니다. 비 그치면 세차하러 오세요!" },
        { id: 1, tag: "💰 혜택/할인", title: "비 오는 날 할인", content: "[GLUNEX] 비 오는 날은 손님이 적어서 사장님이 웁니다😂 오늘 오시면 유막제거 50% 파격 할인해 드립니다!" },
        { id: 2, tag: "🛠 정보/관리", title: "산성비 관리", content: "[GLUNEX] 산성비는 도장면 부식의 주범입니다. 비 그친 직후 프리미엄 세차로 차량을 보호하세요." }
      ],
      clear: [
        { id: 0, tag: "☀️ 날씨", title: "세차하기 좋은 날", content: "[GLUNEX] 미세먼지 없는 화창한 날씨! 묵은 때 벗겨내고 드라이브 떠나기 딱 좋은 날입니다. 지금 바로 예약하세요." },
        { id: 1, tag: "✨ 광택", title: "광택 패키지", content: "[GLUNEX] 햇살 아래 빛나는 차를 만들어드립니다. 오늘 세차 시 퀵 디테일러 코팅 무료 업그레이드!" },
        { id: 2, tag: "📅 주말", title: "주말 예약 알림", content: "[GLUNEX] 이번 주말 나들이 계획 있으신가요? 쾌적한 여행을 위해 내부 세차 미리 예약하세요." }
      ]
    },
    // 2. 유리막코팅 (주기 관리)
    "유리막코팅": {
        main: [
            { id: 0, tag: "🔧 점검", title: "정기 점검 시기", content: "[GLUNEX] 유리막 코팅 시공 6개월이 지났습니다. 발수력 유지 확인을 위해 매장에 방문해 주세요 (무료 점검)." },
            { id: 1, tag: "💧 관리", title: "메인터넌스", content: "[GLUNEX] 코팅막 수명을 2배 늘리는 방법! 전용 관리제 시공을 받으시면 광택이 다시 살아납니다." },
            { id: 2, tag: "🎁 혜택", title: "재시공 할인", content: "[GLUNEX] 기존 고객님만을 위한 특별 혜택! 사고나 긁힘으로 손상된 부위 부분 시공 30% 할인해 드립니다." }
        ]
    },
    // 3. 썬팅 (교체 주기)
    "썬팅": {
        main: [
            { id: 0, tag: "🔥 열차단", title: "열차단 성능 점검", content: "[GLUNEX] 썬팅하신 지 꽤 되셨네요. 필름 색이 바래거나 열차단이 안 된다면 무료 측정 받아보세요." },
            { id: 1, tag: "🕶 프라이버시", title: "재시공 제안", content: "[GLUNEX] 프라이버시 보호가 예전 같지 않다면? 최신 반사 필름으로 분위기를 바꿔보세요." },
            { id: 2, tag: "🎫 이벤트", title: "지인 소개 이벤트", content: "[GLUNEX] 주변에 신차 뽑으신 분 있나요? 소개해주시면 고객님께 백화점 상품권을 드립니다!" }
        ]
    },
    // 4. 블랙박스
    "블랙박스": {
        main: [
            { id: 0, tag: "💾 메모리", title: "메모리카드 점검", content: "[GLUNEX] 블랙박스 영상 확인해보셨나요? 중요한 순간을 위해 메모리카드 포맷 및 점검이 필수입니다." },
            { id: 1, tag: "📹 화질", title: "QHD 보상판매", content: "[GLUNEX] 밤눈 어두운 구형 블랙박스는 이제 그만! 최신 QHD 제품 보상판매 진행 중입니다." },
            { id: 2, tag: "🔋 배터리", title: "방전 주의", content: "[GLUNEX] 겨울철 배터리 방전 주범 블랙박스! 저전압 설정 무료로 세팅해 드립니다." }
        ]
    }
  };

  // 현재 선택된 업종/날씨에 맞는 템플릿 목록 가져오기
  const getTemplates = () => {
    if (activeShopMode === '세차') {
        return messageTemplates['세차'][currentWeather] || messageTemplates['세차']['clear'];
    }
    return messageTemplates[activeShopMode]?.main || messageTemplates['유리막코팅']['main'];
  };

  const currentTemplates = getTemplates();
  const selectedContent = currentTemplates[selectedTemplate].content;

  // 문자 발송 (가상 실행)
  const handleSend = () => {
    if(targetCustomers.length === 0) return alert("발송할 대상이 없습니다.");
    // 실제로는 API 연동 혹은 SMS 스키마 사용
    const phones = targetCustomers.map(c => c.phone).join(','); // 실제 폰번호 데이터 필요
    alert(`[메시지 앱 실행]\n\n수신인: ${targetCustomers.length}명\n내용: ${selectedContent}\n\n*실제 발송 전 수정 가능합니다.`);
    // window.location.href = `sms:${phones}?body=${encodeURIComponent(selectedContent)}`; 
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
        
        {/* 업종 탭 */}
        <div className="px-6 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {myShopTypes.map(type => (
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
        
        {/* 2. 타겟팅 요약 (매출 정보 제거됨) */}
        <div className="mb-6 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Users size={16} className="text-blue-600" />
                    <span className="text-xs font-bold text-slate-500 uppercase">발송 타겟</span>
                </div>
                <p className="text-sm font-bold text-slate-900">
                    조건에 맞는 고객 <span className="text-blue-600 text-lg font-black">{targetCustomers.length}명</span>
                </p>
            </div>
            {/* 세차 모드일 때만 날씨 선택 버튼 노출 */}
            {activeShopMode === '세차' && (
                <div className="flex gap-1">
                    {['rain', 'clear'].map(w => (
                        <button key={w} onClick={() => setCurrentWeather(w)} className={`p-2 rounded-xl transition-all ${currentWeather === w ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-300'}`}>
                            {w === 'rain' ? <CloudRain size={20} /> : <Sun size={20} />}
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* 3. [핵심] 추천 문구 3종 선택 (카드형 UI) */}
        <div className="mb-8">
           <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5 ml-1">
             <Sparkles size={14} className="text-amber-500" /> 어떤 메시지를 보낼까요?
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

        {/* 4. 발송 대상 명단 미리보기 */}
        <div className="pt-2">
           <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 ml-1">발송 명단 ({targetCustomers.length}명)</h3>
           <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
             {targetCustomers.length > 0 ? (
               targetCustomers.map((customer) => (
                <div key={customer.id} className="p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 text-[11px] font-bold">
                        {customer.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{customer.name} <span className="text-[10px] text-slate-400 font-normal">{customer.car}</span></p>
                      <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">{customer.type}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">2주전 발송</span>
                </div>
              ))
             ) : (
               <div className="p-10 text-center">
                 <AlertCircle size={24} className="mx-auto text-slate-300 mb-2" />
                 <p className="text-xs text-slate-400">발송 가능한 고객이 없습니다.</p>
               </div>
             )}
           </div>
        </div>
      </div>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-100 z-40 max-w-md mx-auto">
        <div className="flex items-start gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
          <Edit3 size={14} className="text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-500 leading-relaxed">
            선택하신 <strong>{currentTemplates[selectedTemplate].tag}</strong> 템플릿으로 문자 앱이 실행됩니다. <br/>
            내용을 최종 수정한 뒤 발송하세요. (안심 발송)
          </p>
        </div>
        <button 
            onClick={handleSend}
            disabled={targetCustomers.length === 0}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:bg-slate-300"
        >
           <Send size={18} /> {targetCustomers.length}명에게 문자 보내기
        </button>
      </div>
    </div>
  );
};

export default Marketing;