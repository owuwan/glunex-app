import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, CloudRain, Sun, Snowflake, Cloud, 
  CheckCircle2, Zap, Layout, Instagram, Video, 
  Copy, Check, ArrowLeft, ArrowRight, RefreshCw,
  Target, ListOrdered, FileText, MousePointer2,
  Camera, Wand2, Info, Eye, Smartphone, ChevronRight,
  Star, ShieldCheck, Palette, ZapOff, X, FileSearch, CheckCircle,
  Download, AlertTriangle, SmartphoneIcon, Film, Type, Hash, Clock3, Play,
  ChevronDown, MoreHorizontal, Maximize2, Monitor
} from 'lucide-react';

/**
 * [AI 마스터 프롬프트 설정 - 모바일 앱 버전 100% 복사]
 */
const SYSTEM_PROMPT_TITLES = `
당신은 대한민국 최고의 '자동차 외장관리(Automotive Detailing)' 전문 마케터입니다.
[필수] 피부 관리, 화장품, 뷰티, 에스테틱 등 자동차와 무관한 내용은 절대로 생성하지 마세요. 
오직 자동차 광택, 세차, 유리막 코팅, 썬팅, PPF 등 자동차 전문 시공 서비스의 가치에만 집중하세요.
사용자가 선택한 자동차 시공 항목과 날씨를 분석하여 네이버 블로그 유입을 극대화하는 '자동차 시공 전문' 제목 5개를 제안하세요.
반드시 JSON 구조로만 응답하세요: { "titles": ["제목1", "제목2", "제목3", "제목4", "제목5"] }
`;

const SYSTEM_PROMPT_INDEX = `
사용자가 선택한 '자동차 시공' 제목에 맞춰 네이버 블로그 전문 5단계 목차를 구성하세요. 
모든 내용은 차량 정비 및 외장관리 공정에만 기반해야 하며, 뷰티/피부 관련 용어는 일절 금지합니다.
차량 전문 용어(도장면, 클리어층, 타르 제거, 약재 도포 등)를 반드시 사용하세요.
반드시 JSON 구조로만 응답하세요: { "index": ["1. 목차내용", "2. 목차내용", "3. 목차내용", "4. 목차내용", "5. 목차내용"] }
`;

const SYSTEM_PROMPT_CONTENT = `
당신은 대한민국 자동차 외장관리(디테일링) 전문가입니다. 선정된 5개 목차를 바탕으로 블로그 본문과 실사 이미지 프롬프트를 생성하세요.

[1단계: 본문 작성 지침]
- 자동차와 관련 없는 내용(피부, 에스테틱 등)은 절대 금지합니다. 오직 차량 시공 공정만 다루세요.
- 각 목차별 본문 내용은 공백 제외 450~550자 사이로 아주 상세하게 작성하세요. (전체 최소 2,250자 이상 필수)
- 전문적인 용어와 실제 자동차 시공 공정을 기술하세요. 상호명(GLUNEX 등) 언급 금지.
- 각 섹션 끝에 [[image_1]] ~ [[image_5]] 태그를 배치하세요.
- HTML 태그(h2, p, br, strong)를 사용하세요.

[2단계: 이미지 프롬프트 생성 지침 (장비 고증 로직 대폭 강화)]
- 모든 프롬프트(p1~p5)는 반드시 다음 형식을 준수하세요:
  "Authentic real-life photo, Authentic real-work photo, Work-in-progress (WIP) of [상황 키워드] referencing professional work images from www.naver.com. [구체적인 물리적/장비 묘사]. Raw handheld shot, iPhone 15 Pro, no UI elements, no text, realistic, harsh overhead fluorescent lighting, blurred license plate."
- [장비 및 도구 필수 고증]: 
  1. 철분제거: "Thin, watery, translucent dark-purple streaks bleeding. NO thick paint."
  2. 유리막/코팅: "Hand holding a black rectangular coating block wrapped in a blue suede cloth, applying thin liquid."
  3. 광택/폴리싱: "Technician using a Dual-action polisher machine with a yellow foam pad, visible compound splashes on paint swirl marks."
  4. 썬팅/PPF: "Professional plastic squeegee pushing out soapy water from under the film, handheld heat gun nearby."
  5. 실내크리닝: "Handheld steam cleaner nozzle emitting white steam, vacuum extractor nozzle on carpet, soft detailing brushes for air vents."
  6. 배경: "Modern Korean detailing shop with high-intensity grid LED ceiling lights."

[출력 형식]
JSON 응답: { "blog_html": "...", "insta_text": "...", "short_form": "...", "image_prompts": { "p1": "...", "p2": "...", "p3": "...", "p4": "...", "p5": "..." } }
`;

// 환경 변수 접근 헬퍼
const getEnvVar = (key) => {
  try {
    // @ts-ignore
    return import.meta.env[key];
  } catch (e) {
    return undefined;
  }
};

const apiKey = ""; // Gemini API 키 (시스템 제공)

const Creator = () => {
  const navigate = useNavigate();
  
  // 상태 관리 (기존 로직 유지)
  const [step, setStep] = useState('keyword'); 
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState('title'); 
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0); 
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isWeatherEnabled, setIsWeatherEnabled] = useState(true);
  const [weather, setWeather] = useState({ status: 'clear', desc: '맑음', temp: 0, loading: true });
  
  const [titles, setTitles] = useState([]);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [indexList, setIndexList] = useState([]);
  const [generatedData, setGeneratedData] = useState(null);
  
  const [activeTab, setActiveTab] = useState('blog');
  const [isCopied, setIsCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const copyBufferRef = useRef(null);

  const loadingMessages = {
    title: [
      "고객의 시선을 사로잡는 최적의 자동차 시공 제목을 설계 중입니다",
      "검색량 분석을 통해 유입이 가장 잘 되는 차량 키워드를 추출하고 있습니다",
      "예약 전환율을 높이는 전략적인 첫 문장을 고민하고 있습니다"
    ],
    index: [
      "차량 전문가의 깊이가 느껴지는 체계적인 목차를 구성하고 있습니다",
      "글의 논리적인 흐름과 SEO 최적화 구조를 설계 중입니다",
      "사장님의 전문성을 돋보이게 할 스토리보드를 완성하고 있습니다"
    ],
    content: [
      "실제 시공 현장의 생생함을 담은 이미지를 비용 최적화 실사 질감으로 현상하고 있습니다",
      "디테일링 전문가의 관점에서 정성스럽게 전문 원고를 집필 중입니다",
      "이미지와 글의 완벽한 복사 호환을 위해 데이터 구조를 정밀하게 가공하고 있습니다",
      "네이버 블로그 알고리즘에 맞춘 맞춤형 포스팅을 곧 완성합니다"
    ]
  };

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % (loadingMessages[loadingType]?.length || 1));
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [loading, loadingType]);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const WEATHER_KEY = getEnvVar('VITE_WEATHER_API_KEY');
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid=${WEATHER_KEY}&units=metric&lang=kr`);
        const data = await response.json();
        if (data.cod === 200) {
          const main = data.weather[0].main.toLowerCase();
          setWeather({
            status: main.includes('rain') ? 'rain' : main.includes('snow') ? 'snow' : main.includes('cloud') ? 'cloud' : 'clear',
            desc: data.weather[0].description,
            temp: Math.round(data.main.temp),
            loading: false
          });
        }
      } catch (e) {
        setWeather({ status: 'clear', desc: '맑음', temp: 20, loading: false });
      }
    };
    fetchWeather();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const categories = [
    { id: 'wash', name: '세차' }, { id: 'detailing', name: '디테일링' },
    { id: 'coating', name: '유리막코팅' }, { id: 'undercoating', name: '언더코팅' },
    { id: 'special_wash', name: '특수세차' }, { id: 'interior_clean', name: '실내크리닝' },
    { id: 'iron_remove', name: '철분제거' }, { id: 'glass_repel', name: '발수코팅' },
    { id: 'tinting', name: '썬팅' }, { id: 'blackbox', name: '블랙박스' },
    { id: 'new_car', name: '신차패키지' }, { id: 'leather_coating', name: '가죽코팅' }
  ];

  const callGemini = async (prompt, systemPrompt) => {
    const GEMINI_KEY = getEnvVar('VITE_FIREBASE_API_KEY') || apiKey;
    let delay = 1000;
    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { responseMimeType: "application/json" }
          })
        });
        const resData = await response.json();
        return JSON.parse(resData.candidates[0].content.parts[0].text);
      } catch (error) {
        if (i === 4) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  const callFalAI = async (prompt) => {
    const FAL_KEY = getEnvVar('VITE_FAL_API_KEY');
    if (!FAL_KEY || FAL_KEY === "undefined") return null;
    try {
      const response = await fetch("https://fal.run/fal-ai/flux-2", {
        method: "POST",
        headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
          image_size: { width: 768, height: 576 } 
        })
      });
      const data = await response.json();
      return data.images[0].url;
    } catch (e) { return null; }
  };

  const handleGenerateTitles = async () => {
    if (selectedTopics.length === 0) return alert("시공 항목을 선택해주세요.");
    setLoadingType('title');
    setLoadingMsgIndex(0);
    setLoading(true);
    try {
      const selectedNames = categories.filter(c => selectedTopics.includes(c.id)).map(c => c.name).join(', ');
      const data = await callGemini(`시공: ${selectedNames}, 날씨: ${weather.desc}`, SYSTEM_PROMPT_TITLES);
      setTitles(data.titles);
      setStep('title');
    } catch (e) { alert("AI 연결 오류"); }
    finally { setLoading(false); }
  };

  const handleGenerateIndex = async (title) => {
    setSelectedTitle(title);
    setLoadingType('index');
    setLoadingMsgIndex(0);
    setLoading(true);
    try {
      const data = await callGemini(`제목: ${title}`, SYSTEM_PROMPT_INDEX);
      setIndexList(data.index);
      setStep('index');
    } catch (e) { alert("목차 구성 실패"); }
    finally { setLoading(false); }
  };

  const handleGenerateFullContent = async () => {
    setLoadingType('content');
    setLoadingMsgIndex(0);
    setLoading(true);
    try {
      const data = await callGemini(`제목: ${selectedTitle}, 목차: ${indexList.join(', ')}`, SYSTEM_PROMPT_CONTENT);
      const images = await Promise.all([
        callFalAI(data.image_prompts.p1), callFalAI(data.image_prompts.p2),
        callFalAI(data.image_prompts.p3), callFalAI(data.image_prompts.p4),
        callFalAI(data.image_prompts.p5)
      ]);

      let finalHtml = data.blog_html;
      images.forEach((url, i) => {
        const replacement = url ? `
          <div style="margin: 40px 0; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.1);">
            <img src="${url}" width="100%" style="display: block;" alt="시공 사진" />
          </div>
        ` : `<p>[이미지 처리 중]</p>`;
        finalHtml = finalHtml.replace(`[[image_${i + 1}]]`, replacement);
      });

      setGeneratedData({ ...data, blog_html: finalHtml });
      setStep('result');
    } catch (e) { alert("최종 생성 오류"); }
    finally { setLoading(false); }
  };

  const handleCopy = async () => {
    if (!generatedData) return;
    try {
      if (activeTab === 'blog' && copyBufferRef.current) {
        const buffer = copyBufferRef.current;
        buffer.style.display = 'block';
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(buffer);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('copy');
        selection.removeAllRanges();
        buffer.style.display = 'none';
        setIsCopied(true);
        showToast("이미지와 원고가 복사되었습니다!");
        setTimeout(() => setIsCopied(false), 2000);
      } else {
        const text = activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form;
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        showToast("텍스트가 복사되었습니다!");
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (err) { alert("복사 실패"); }
  };

  return (
    <div className="h-full flex flex-col bg-[#F6F8FA] font-sans overflow-hidden">
      {/* 1. 상단 글로벌 헤더 (더 크고 웅장하게) */}
      <header className="h-24 px-12 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded-2xl text-slate-400 hover:bg-slate-900 hover:text-white transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 text-white p-1.5 rounded-xl"><Sparkles size={20} fill="currentColor" /></div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
                AI <span className="text-indigo-600 not-italic">CONTENT STUDIO</span>
              </h1>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-1 ml-1">Automotive Marketing Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className={`p-2 rounded-lg ${weather.status === 'rain' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
              {weather.status === 'rain' ? <CloudRain size={20} /> : <Sun size={20} />}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Weather Sync</p>
              <p className="text-sm font-black text-slate-700">{weather.desc}, {weather.temp}°C</p>
            </div>
          </div>
          <div className="w-px h-10 bg-slate-200 mx-2" />
          <button onClick={() => setStep('keyword')} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <RefreshCw size={18} /> 초기화
          </button>
        </div>
      </header>

      {/* 2. 메인 컨텐츠 영역 (시원시원한 카드 시스템) */}
      <main className="flex-1 overflow-hidden flex relative">
        
        {/* 토스트 알림 */}
        {toastMsg && (
          <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4">
            <div className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3 border border-slate-700 font-bold">
              <CheckCircle2 size={24} className="text-emerald-400" /> {toastMsg}
            </div>
          </div>
        )}

        {loading ? (
          /* 로딩 화면 (전체 화면 전용 대형 애니메이션) */
          <div className="flex-1 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md z-[60]">
            <div className="relative mb-12">
               <div className="w-32 h-32 border-8 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
               <Sparkles size={48} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-4">{loadingMessages[loadingType][loadingMsgIndex]}</h3>
            <p className="text-slate-400 font-bold uppercase tracking-widest animate-pulse italic">AI Logic Processing...</p>
          </div>
        ) : step === 'keyword' ? (
          /* 1단계: 시공 품목 선택 (카드 그리드 방식) */
          <div className="flex-1 overflow-y-auto p-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="max-w-6xl mx-auto space-y-12">
              <div className="flex items-end justify-between border-b-4 border-slate-900 pb-8">
                <div>
                  <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 italic uppercase">01. Service Configuration</h2>
                  <p className="text-xl text-slate-500 font-medium">홍보하고 싶은 시공 품목을 모두 선택하세요. AI가 최적의 키워드 조합을 찾아냅니다.</p>
                </div>
                <div className="flex items-center gap-6 bg-indigo-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-indigo-100">
                  <div>
                    <h4 className="text-lg font-black leading-tight italic">날씨 연동 모드</h4>
                    <p className="text-xs text-indigo-200 mt-1">기상 상황에 맞는 심리 자극 멘트 생성</p>
                  </div>
                  <button 
                    onClick={() => setIsWeatherEnabled(!isWeatherEnabled)}
                    className={`w-16 h-8 rounded-full relative transition-all ${isWeatherEnabled ? 'bg-white/30' : 'bg-slate-400/50'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg transition-all ${isWeatherEnabled ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-6">
                {categories.map((cat) => (
                  <button 
                    key={cat.id} 
                    onClick={() => setSelectedTopics(p => p.includes(cat.id) ? p.filter(t => t !== cat.id) : [...p, cat.id])}
                    className={`h-48 rounded-[3rem] border-4 transition-all flex flex-col items-center justify-center gap-4 relative overflow-hidden group ${
                      selectedTopics.includes(cat.id)
                        ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-105'
                        : 'bg-white border-white text-slate-400 hover:border-indigo-200 hover:text-slate-600 shadow-sm'
                    }`}
                  >
                    <Target size={32} className={selectedTopics.includes(cat.id) ? 'text-indigo-400' : 'text-slate-100 group-hover:text-indigo-100'} />
                    <span className="text-xl font-black">{cat.name}</span>
                    {selectedTopics.includes(cat.id) && (
                      <div className="absolute top-6 right-6 bg-indigo-500 text-white p-1 rounded-full shadow-lg">
                        <Check size={16} strokeWidth={4} />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="pt-12 flex justify-center">
                <button 
                  onClick={handleGenerateTitles}
                  disabled={selectedTopics.length === 0}
                  className="px-20 py-8 bg-indigo-600 text-white rounded-[3rem] font-black text-3xl shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 flex items-center gap-6 disabled:opacity-30"
                >
                  <Sparkles size={32} fill="currentColor" className="text-amber-300" />
                  마케팅 컨셉 도출하기
                  <ArrowRight size={32} />
                </button>
              </div>
            </div>
          </div>
        ) : step === 'title' ? (
          /* 2단계: 제목 선정 (대형 리스트 카드) */
          <div className="flex-1 overflow-y-auto p-16 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="max-w-5xl mx-auto space-y-12">
              <div className="border-b-4 border-slate-900 pb-8">
                <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 italic uppercase">02. Strategic Headline</h2>
                <p className="text-xl text-slate-500 font-medium">유입률이 가장 높을 것으로 예상되는 제목을 하나 골라주세요.</p>
              </div>

              <div className="space-y-4">
                {titles.map((t, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleGenerateIndex(t)}
                    className="w-full text-left p-10 bg-white border border-slate-200 rounded-[3rem] hover:border-indigo-600 hover:shadow-2xl transition-all group flex items-center justify-between"
                  >
                    <p className="text-2xl font-bold text-slate-800 group-hover:text-indigo-600 leading-snug">{t}</p>
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                      <ChevronRight size={28} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : step === 'index' ? (
          /* 3단계: 목차 확인 (인포그래픽 스타일) */
          <div className="flex-1 overflow-y-auto p-16 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="max-w-4xl mx-auto space-y-12">
              <div className="border-b-4 border-slate-900 pb-8">
                <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 italic uppercase">03. Content Structure</h2>
                <p className="text-xl text-slate-500 font-medium">선택한 제목에 맞춰 설계된 원고의 목차입니다.</p>
              </div>

              <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none text-indigo-600"><ListOrdered size={300} /></div>
                <div className="bg-indigo-50 p-8 rounded-3xl border border-indigo-100 mb-12">
                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2 italic">Selected Title</h4>
                  <p className="text-3xl font-black text-indigo-900 leading-tight">"{selectedTitle}"</p>
                </div>
                <div className="space-y-6">
                  {indexList.map((idx, i) => (
                    <div key={i} className="flex gap-8 items-center group">
                      <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white font-black text-xl flex items-center justify-center shadow-lg">{i+1}</div>
                      <p className="text-2xl font-bold text-slate-700 leading-snug">{idx}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center pt-8">
                <button 
                  onClick={handleGenerateFullContent}
                  className="px-24 py-8 bg-slate-900 text-white rounded-[3rem] font-black text-3xl shadow-2xl hover:bg-black transition-all hover:scale-105 active:scale-95 flex items-center gap-6"
                >
                  <FileText size={32} className="text-indigo-400" />
                  전문 원고 생성 시작
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 최종 결과: 스튜디오 편집기 레이아웃 (매우 웅장하게) */
          <div className="flex-1 flex overflow-hidden animate-in fade-in zoom-in-95 duration-700 bg-white">
            {/* 좌측: 결과물 컨텐츠 영역 */}
            <div className="flex-1 overflow-y-auto p-20 scrollbar-hide border-r border-slate-100">
               <div className="max-w-3xl mx-auto space-y-16">
                  {activeTab === 'blog' ? (
                    <article className="prose prose-slate max-w-none">
                      <div className="mb-20 pb-12 border-b-2 border-slate-100">
                         <div className="flex items-center gap-3 text-indigo-600 font-black uppercase tracking-[0.4em] mb-6 italic text-sm">
                            <Monitor size={20} /> Professional Blog Post
                         </div>
                         <h2 className="text-6xl font-black text-slate-900 tracking-tighter leading-[1.1] !mt-0">{selectedTitle}</h2>
                      </div>
                      <div className="space-y-12 blog-content-view" 
                           style={{ fontSize: '1.25rem', lineHeight: '2.1', color: '#334155', textAlign: 'justify', wordBreak: 'keep-all' }}
                           dangerouslySetInnerHTML={{ __html: generatedData.blog_html }} />
                    </article>
                  ) : activeTab === 'insta' ? (
                    <div className="space-y-12 max-w-xl mx-auto">
                      <div className="p-12 bg-slate-50 rounded-[4rem] shadow-inner border border-slate-100 relative">
                         <div className="flex items-center gap-4 mb-10">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-xl"><Instagram size={32}/></div>
                            <div>
                               <p className="text-2xl font-black text-slate-900 italic leading-tight">Instagram Engagement</p>
                               <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Optimized for Social Feed</p>
                            </div>
                         </div>
                         <pre className="whitespace-pre-wrap text-2xl font-bold text-slate-700 leading-relaxed italic tracking-tight">
                            {generatedData.insta_text}
                         </pre>
                      </div>
                      <div className="p-10 bg-indigo-50 rounded-[3rem] border-2 border-indigo-100">
                        <p className="text-sm font-black text-indigo-600 uppercase mb-4 flex items-center gap-3 tracking-widest italic"><Hash size={20}/> AI Recommended Tags</p>
                        <p className="text-lg text-indigo-400 font-bold tracking-tight leading-relaxed">#GLUNEX #디테일링 #시공후기 #차쟁이 #유리막코팅 #카스타그램 #세차스타그램 #명품시공 #CARLIFESTYLE</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-12 max-w-2xl mx-auto">
                      <div className="flex items-center gap-6 p-8 bg-slate-900 rounded-[3rem] text-white shadow-2xl">
                        <Film size={48} className="text-blue-400 animate-pulse" />
                        <div>
                          <p className="text-3xl font-black italic tracking-tight">Vertical Video Script</p>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.3em] mt-2">Short-form Production Guide</p>
                        </div>
                      </div>
                      <div className="bg-slate-900 p-16 rounded-[4rem] shadow-2xl text-white border border-slate-800 space-y-12">
                         <div className="space-y-8">
                            <div className="border-l-[10px] border-blue-500 pl-8 py-2">
                               <p className="text-sm font-black text-blue-400 uppercase tracking-[0.4em] mb-2 italic">Scene 01. The Hook</p>
                               <p className="text-xl font-bold text-slate-300 italic">"고객의 시선을 0.5초 만에 사로잡는 강렬한 첫 시공 장면(물방울 발수 등)을 배치하세요."</p>
                            </div>
                            <div className="border-l-[10px] border-indigo-500/30 pl-8 py-2">
                               <p className="text-sm font-black text-slate-500 uppercase tracking-[0.4em] mb-2 italic">Scene 02. Expert Process</p>
                               <p className="text-xl font-bold text-slate-300 italic">"전문 장비의 기계음(ASMR)과 시공 공정을 클로즈업하여 신뢰도를 극대화합니다."</p>
                            </div>
                            <div className="pt-12 border-t border-slate-800">
                               <p className="text-sm font-black text-amber-500 uppercase tracking-[0.4em] mb-6 italic">Narration / Script</p>
                               <p className="text-4xl font-black italic leading-[1.3] text-white tracking-tighter shadow-indigo-900 drop-shadow-2xl">{generatedData.short_form}</p>
                            </div>
                         </div>
                      </div>
                    </div>
                  )}
               </div>
            </div>

            {/* 우측: 사이드 컨트롤 바 (모드 전환 및 액션) */}
            <div className="w-[450px] bg-slate-50 border-l border-slate-200 p-12 flex flex-col shrink-0">
               <div className="space-y-12 flex-1">
                  <div className="space-y-4">
                     <h5 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] italic">Select Output Channel</h5>
                     <div className="grid grid-cols-1 gap-3">
                        {[
                          { id: 'blog', name: '네이버 블로그 리포트', icon: <Chrome size={24}/>, desc: 'SEO 최적화 전문 원고' },
                          { id: 'insta', name: '인스타그램 피드', icon: <Instagram size={24}/>, desc: '도달율 중심 SNS 본문' },
                          { id: 'short', name: '숏폼 가이드북', icon: <Film size={24}/>, desc: '릴스/쇼츠 제작 스크립트' }
                        ].map(tab => (
                          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`p-8 rounded-[2.5rem] border-4 text-left transition-all group ${activeTab === tab.id ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-105' : 'bg-white border-white text-slate-400 hover:border-indigo-100'}`}
                          >
                            <div className="flex items-center gap-4 mb-2">
                               {tab.icon}
                               <span className="text-xl font-black tracking-tight">{tab.name}</span>
                            </div>
                            <p className={`text-xs font-medium ${activeTab === tab.id ? 'text-slate-400' : 'text-slate-300'}`}>{tab.desc}</p>
                          </button>
                        ))}
                     </div>
                  </div>

                  <div className="p-8 bg-indigo-600 rounded-[3rem] text-white shadow-2xl shadow-indigo-100 flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center"><Download size={32} /></div>
                    <div>
                      <p className="text-2xl font-black italic tracking-tighter leading-none">Content Verified</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest mt-2 text-indigo-200">System Ready for Deployment</p>
                    </div>
                  </div>
               </div>

               <button 
                  onClick={handleCopy}
                  className={`w-full py-10 ${isCopied ? 'bg-emerald-600 shadow-emerald-200' : 'bg-slate-900 shadow-slate-900/20'} text-white rounded-[3rem] font-black text-3xl flex items-center justify-center gap-6 transition-all hover:scale-[1.03] shadow-2xl active:scale-95`}
               >
                  {isCopied ? <CheckCircle2 size={36} /> : <Copy size={36} />}
                  {isCopied ? 'COPY SUCCESS' : 'COPY ALL CONTENT'}
               </button>
            </div>
          </div>
        )}
      </main>

      {/* 3. 복사 버퍼 (숨김 처리) */}
      <div 
        ref={copyBufferRef}
        style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '800px', pointerEvents: 'none', userSelect: 'all', display: 'none' }}
        dangerouslySetInnerHTML={{ __html: generatedData ? `<h2>${selectedTitle}</h2>` + generatedData.blog_html : '' }}
      />
    </div>
  );
};

export default Creator;