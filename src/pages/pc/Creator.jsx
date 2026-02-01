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
  ChevronDown, MoreHorizontal, Maximize2, Monitor, Cpu, Layers, Square
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
      "검색 엔진 알고리즘 데이터베이스 동기화 중...",
      "유입 극대화를 위한 자동차 전문 키워드 분석 중...",
      "전환율 최적화 헤드라인 구조 설계 중..."
    ],
    index: [
      "디테일링 시공 프로세스 고증 분석 중...",
      "SEO 최적화 5단계 콘텐츠 아키텍처 구성 중...",
      "하이엔드 스토리텔링 목차 빌드 중..."
    ],
    content: [
      "Fal AI 기반의 시공 실사 이미지 렌더링 중...",
      "자동차 외장관리 전문가 페르소나 적용 원고 집필 중...",
      "이미지-텍스트 메타데이터 동기화 및 패키징 중...",
      "알고리즘 적합성 최종 검증 중..."
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
    { id: 'wash', name: '프리미엄 세차', desc: '기본 디테일링 케어' }, 
    { id: 'detailing', name: '수입차 디테일링', desc: '고급 정밀 케어' },
    { id: 'coating', name: '유리막코팅', desc: '표면 보호 시공' }, 
    { id: 'undercoating', name: '언더코팅', desc: '하부 부식 방지' },
    { id: 'special_wash', name: '특수 세차', desc: '철분/타르 제거 전문' }, 
    { id: 'interior_clean', name: '실내 크리닝', desc: '정밀 내장제 살균' },
    { id: 'iron_remove', name: '철분제거', desc: '도장면 고착물 제거' }, 
    { id: 'glass_repel', name: '발수코팅', desc: '전면 유리 시계 확보' },
    { id: 'tinting', name: '썬팅(틴팅)', desc: '열차단 및 프라이버시' }, 
    { id: 'blackbox', name: '블랙박스', desc: '상시 녹화 전장 작업' },
    { id: 'new_car', name: '신차패키지', desc: '토탈 케어 솔루션' }, 
    { id: 'leather_coating', name: '가죽코팅', desc: '시트 이염 방지 시공' }
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
          <div style="margin: 60px 0; border-radius: 32px; overflow: hidden; box-shadow: 0 30px 60px rgba(0,0,0,0.12);">
            <img src="${url}" width="100%" style="display: block;" alt="Professional Detailing Work" />
          </div>
        ` : `<p>[시공 이미지 렌더링 중...]</p>`;
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
        showToast("전문 원고와 시공 이미지가 클립보드에 복사되었습니다.");
        setTimeout(() => setIsCopied(false), 2000);
      } else {
        const text = activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form;
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        showToast("SNS 최적화 본문이 복사되었습니다.");
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (err) { alert("복사 실패"); }
  };

  return (
    <div className="h-full flex flex-col bg-[#F1F3F5] font-sans selection:bg-indigo-100 overflow-hidden">
      {/* 1. 상단 인텔리전트 네비게이션 */}
      <header className="h-20 px-12 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-8">
          <button 
            onClick={() => navigate('/dashboard')}
            className="group flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-all font-bold"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm uppercase tracking-tighter">Exit Studio</span>
          </button>
          
          <div className="w-px h-8 bg-slate-200" />

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-indigo-400 shadow-xl">
              <Cpu size={24} fill="currentColor" className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                AI <span className="text-indigo-600">Marketing Core</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1.5">v2.0 Professional Studio</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 px-6 py-2.5 bg-slate-100 rounded-2xl border border-slate-200/50">
            <div className={`p-1.5 rounded-lg bg-white shadow-sm ${weather.status === 'rain' ? 'text-blue-500' : 'text-orange-500'}`}>
              {weather.status === 'rain' ? <CloudRain size={18} /> : <Sun size={18} />}
            </div>
            <div className="text-left">
              <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Weather Context</p>
              <p className="text-xs font-black text-slate-700 tracking-tight">{weather.desc}, {weather.temp}°C Sync</p>
            </div>
          </div>
          <button onClick={() => setStep('keyword')} className="px-6 py-2.5 bg-white border border-slate-200 rounded-2xl font-bold text-xs text-slate-600 hover:bg-slate-900 hover:text-white transition-all shadow-sm flex items-center gap-2">
            <RefreshCw size={14} /> RESET STUDIO
          </button>
        </div>
      </header>

      {/* 2. 시공 스튜디오 메인 캔버스 */}
      <main className="flex-1 overflow-hidden flex relative">
        
        {/* 토스트 */}
        {toastMsg && (
          <div className="fixed top-24 right-12 z-[100] animate-in slide-in-from-right-4 duration-300">
            <div className="bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 font-bold">
              <CheckCircle2 size={20} className="text-emerald-400" /> {toastMsg}
            </div>
          </div>
        )}

        {loading ? (
          /* 고화질 로딩 뷰 */
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 backdrop-blur-md z-[60]">
            <div className="w-full max-w-xl text-center space-y-12">
               <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                  <div className="absolute inset-0 border-[3px] border-slate-200 rounded-[2.5rem]"></div>
                  <div className="absolute inset-0 border-[3px] border-t-indigo-600 rounded-[2.5rem] animate-spin"></div>
                  <Sparkles size={48} className="text-indigo-600 animate-pulse" />
               </div>
               <div className="space-y-4">
                  <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight italic uppercase">Processing...</h3>
                  <div className="h-1.5 w-48 bg-slate-200 mx-auto rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 w-1/2 animate-[loading_2s_infinite_ease-in-out]" />
                  </div>
                  <p className="text-xl font-bold text-slate-600 pt-4 px-12 leading-relaxed">{loadingMessages[loadingType][loadingMsgIndex]}</p>
               </div>
            </div>
          </div>
        ) : step === 'keyword' ? (
          /* 1단계: 마스터 구성 (와이드 그리드) */
          <div className="flex-1 overflow-y-auto p-12 lg:p-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="max-w-7xl mx-auto space-y-16">
              <div className="flex items-end justify-between border-b-2 border-slate-200 pb-12">
                <div className="space-y-4">
                  <h2 className="text-6xl font-black text-slate-900 tracking-tighter uppercase italic">01 <span className="text-indigo-600 not-italic">Configure</span></h2>
                  <p className="text-2xl text-slate-500 font-medium tracking-tight">AI 엔진이 분석할 핵심 시공 품목을 선택하여 마케팅 로직을 구성하십시오.</p>
                </div>
                
                <button 
                    onClick={() => setIsWeatherEnabled(!isWeatherEnabled)}
                    className={`flex items-center gap-6 p-8 rounded-[2.5rem] transition-all border-4 ${isWeatherEnabled ? 'bg-indigo-600 border-indigo-500 text-white shadow-2xl' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-200'}`}
                >
                  <div className="text-left">
                    <h4 className="text-xl font-black leading-tight italic uppercase">Weather Intelligence</h4>
                    <p className={`text-xs mt-1 font-bold ${isWeatherEnabled ? 'text-indigo-200' : 'text-slate-300'}`}>현재 기상 상황 실시간 연동 및 원고 반영</p>
                  </div>
                  <div className={`w-16 h-8 rounded-full relative transition-all ${isWeatherEnabled ? 'bg-white/20' : 'bg-slate-100'}`}>
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-xl transition-all ${isWeatherEnabled ? 'right-1' : 'left-1'}`} />
                  </div>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {categories.map((cat) => (
                  <button 
                    key={cat.id} 
                    onClick={() => setSelectedTopics(p => p.includes(cat.id) ? p.filter(t => t !== cat.id) : [...p, cat.id])}
                    className={`p-10 rounded-[3rem] border-4 transition-all text-left relative overflow-hidden group ${
                      selectedTopics.includes(cat.id)
                        ? 'bg-slate-900 border-slate-900 text-white shadow-2xl -translate-y-2'
                        : 'bg-white border-white text-slate-400 hover:border-indigo-100 hover:text-slate-700 shadow-sm'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-colors ${selectedTopics.includes(cat.id) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                      <Target size={24} />
                    </div>
                    <span className="text-2xl font-black block leading-none">{cat.name}</span>
                    <p className={`text-xs mt-2 font-bold uppercase tracking-widest ${selectedTopics.includes(cat.id) ? 'text-slate-500' : 'text-slate-300'}`}>{cat.desc}</p>
                    
                    {selectedTopics.includes(cat.id) && (
                      <div className="absolute top-10 right-10 text-indigo-400 animate-in zoom-in-50">
                        <CheckCircle2 size={32} fill="currentColor" className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="pt-8 flex justify-center">
                <button 
                  onClick={handleGenerateTitles}
                  disabled={selectedTopics.length === 0}
                  className="group relative px-24 py-8 bg-indigo-600 text-white rounded-[3.5rem] font-black text-4xl shadow-[0_40px_100px_-20px_rgba(79,70,229,0.5)] hover:bg-indigo-700 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-8 disabled:opacity-20 disabled:grayscale"
                >
                  <Sparkles size={40} className="text-amber-300 group-hover:rotate-12 transition-transform" />
                  GENERATE STRATEGY
                  <ArrowRight size={40} className="group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        ) : step === 'title' ? (
          /* 2단계: 전략 선택 (마케팅 대시보드 리스트) */
          <div className="flex-1 overflow-y-auto p-12 lg:p-20 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="max-w-5xl mx-auto space-y-12">
              <div className="border-b-4 border-slate-900 pb-12 space-y-4">
                <h2 className="text-6xl font-black text-slate-900 tracking-tighter uppercase italic">02 <span className="text-indigo-600 not-italic">Select</span></h2>
                <p className="text-2xl text-slate-500 font-medium">검색 유입 및 클릭률 최적화가 검증된 추천 헤드라인 중 최적의 안을 선정하십시오.</p>
              </div>

              <div className="space-y-6">
                {titles.map((t, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleGenerateIndex(t)}
                    className="w-full text-left p-12 bg-white border-2 border-slate-100 rounded-[3.5rem] hover:border-indigo-600 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-10">
                       <span className="text-3xl font-black text-slate-200 group-hover:text-indigo-600 transition-colors tracking-tighter">#0{i+1}</span>
                       <p className="text-3xl font-bold text-slate-800 group-hover:text-slate-900 leading-tight tracking-tight">{t}</p>
                    </div>
                    <div className="w-16 h-16 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                      <ArrowRight size={32} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : step === 'index' ? (
          /* 3단계: 구조 설계 (인포그래픽 렌더링) */
          <div className="flex-1 overflow-y-auto p-12 lg:p-20 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="max-w-5xl mx-auto space-y-16">
              <div className="border-b-4 border-slate-900 pb-12 space-y-4">
                <h2 className="text-6xl font-black text-slate-900 tracking-tighter uppercase italic">03 <span className="text-indigo-600 not-italic">Architecture</span></h2>
                <p className="text-2xl text-slate-500 font-medium">선택된 전략을 바탕으로 설계된 5단계 시공 전문 콘텐츠 아키텍처입니다.</p>
              </div>

              <div className="grid grid-cols-5 gap-12 relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2 -z-10" />
                {indexList.map((idx, i) => (
                  <div key={i} className="space-y-8 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-[2rem] bg-slate-900 text-white font-black text-2xl flex items-center justify-center shadow-2xl border-4 border-white">0{i+1}</div>
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 min-h-[160px] flex items-center text-center">
                      <p className="text-lg font-black text-slate-700 leading-snug tracking-tighter">{idx}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center pt-12">
                <button 
                  onClick={handleGenerateFullContent}
                  className="px-24 py-10 bg-slate-900 text-white rounded-[4rem] font-black text-4xl shadow-2xl hover:bg-black transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-8"
                >
                  <FileText size={40} className="text-indigo-500" />
                  INITIATE WRITING
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 최종 결과: 하이엔드 스튜디오 에디터 */
          <div className="flex-1 flex overflow-hidden animate-in fade-in zoom-in-95 duration-1000 bg-white">
            {/* 좌측: 콘텐츠 뷰어 (매우 넓게) */}
            <div className="flex-1 overflow-y-auto p-24 lg:p-32 scrollbar-hide">
               <div className="max-w-4xl mx-auto">
                  {activeTab === 'blog' ? (
                    <article className="prose prose-indigo max-w-none">
                      <div className="mb-32 pb-16 border-b-8 border-slate-900">
                         <div className="flex items-center gap-4 text-indigo-600 font-black uppercase tracking-[0.6em] mb-12 italic text-base">
                            <Layers size={24} /> Professional Detailing Report
                         </div>
                         <h2 className="text-7xl font-black text-slate-900 tracking-[ -0.04em] leading-[1.05] !mt-0 uppercase italic">{selectedTitle}</h2>
                      </div>
                      <div className="space-y-16 blog-content-view" 
                           style={{ fontSize: '1.4rem', lineHeight: '2.3', color: '#1E293B', textAlign: 'justify', wordBreak: 'keep-all', fontWeight: '500' }}
                           dangerouslySetInnerHTML={{ __html: generatedData.blog_html }} />
                    </article>
                  ) : activeTab === 'insta' ? (
                    <div className="space-y-16 max-w-2xl mx-auto">
                      <div className="p-16 bg-slate-950 rounded-[5rem] shadow-[0_50px_100px_-30px_rgba(0,0,0,0.5)] border border-slate-800 relative overflow-hidden group">
                         <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                         <div className="flex items-center gap-6 mb-16 relative">
                            <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-yellow-400 via-pink-600 to-purple-800 flex items-center justify-center text-white shadow-2xl"><Instagram size={40}/></div>
                            <div>
                               <p className="text-3xl font-black text-white italic leading-tight tracking-tighter uppercase">Algorithm Core</p>
                               <p className="text-sm text-slate-500 font-black uppercase tracking-[0.4em] mt-1.5">Engagement Engine</p>
                            </div>
                         </div>
                         <pre className="relative whitespace-pre-wrap text-3xl font-bold text-slate-200 leading-[1.6] italic tracking-tight drop-shadow-xl">
                            {generatedData.insta_text}
                         </pre>
                      </div>
                      <div className="p-12 bg-white rounded-[3.5rem] border-4 border-slate-900 shadow-2xl">
                        <p className="text-lg font-black text-slate-900 uppercase mb-6 flex items-center gap-4 tracking-widest italic border-b-2 border-slate-100 pb-4"><Hash size={24} className="text-indigo-600"/> Intelligence Tags</p>
                        <p className="text-xl text-slate-600 font-bold tracking-tight leading-relaxed italic">#GLUNEX #디테일링 #시공후기 #차쟁이 #유리막코팅 #카스타그램 #세차스타그램 #명품시공 #인천광택 #CARLIFESTYLE #DETAILED</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-16 max-w-3xl mx-auto">
                      <div className="flex items-center gap-8 p-12 bg-indigo-600 rounded-[4rem] text-white shadow-[0_40px_100px_-20px_rgba(79,70,229,0.4)] relative overflow-hidden">
                        <div className="absolute -right-20 -bottom-20 opacity-10"><Film size={300} /></div>
                        <Film size={64} className="text-white fill-white/20 animate-pulse" />
                        <div>
                          <p className="text-5xl font-black italic tracking-tighter uppercase leading-none">Script Core</p>
                          <p className="text-sm text-indigo-200 font-black uppercase tracking-[0.5em] mt-3">Short-form Video Engine</p>
                        </div>
                      </div>
                      <div className="bg-slate-950 p-20 rounded-[5rem] shadow-2xl text-white border-8 border-slate-900 space-y-16">
                         <div className="space-y-12">
                            <div className="border-l-[12px] border-indigo-500 pl-10 py-2">
                               <p className="text-lg font-black text-indigo-400 uppercase tracking-[0.5em] mb-4 italic">Stage 01. Visual Hook</p>
                               <p className="text-2xl font-bold text-slate-300 italic tracking-tight leading-relaxed">"고객의 시선을 단 0.3초 만에 장악할 강렬한 시공 전후 비교(비딩/발수) 장면을 배치하십시오."</p>
                            </div>
                            <div className="border-l-[12px] border-slate-800 pl-10 py-2 opacity-50">
                               <p className="text-lg font-black text-slate-500 uppercase tracking-[0.5em] mb-4 italic">Stage 02. Professionalism</p>
                               <p className="text-2xl font-bold text-slate-300 italic tracking-tight leading-relaxed">"전문 시공 장비의 타격음과 섬세한 브러쉬 터치를 극단적인 클로즈업으로 묘사하십시오."</p>
                            </div>
                            <div className="pt-16 border-t-2 border-slate-800">
                               <p className="text-lg font-black text-amber-500 uppercase tracking-[0.6em] mb-8 italic">Voice-Over Script</p>
                               <p className="text-5xl font-black italic leading-[1.25] text-white tracking-tighter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">{generatedData.short_form}</p>
                            </div>
                         </div>
                      </div>
                    </div>
                  )}
               </div>
            </div>

            {/* 우측: 전문가용 컨트롤 패널 (매우 웅장한 사이드바) */}
            <div className="w-[520px] bg-[#F8F9FA] border-l border-slate-200 p-16 flex flex-col shrink-0 z-40">
               <div className="space-y-16 flex-1">
                  <div className="space-y-6">
                     <h5 className="text-xs font-black text-slate-400 uppercase tracking-[0.5em] italic border-l-4 border-indigo-600 pl-4">Switch Production Hub</h5>
                     <div className="space-y-4">
                        {[
                          { id: 'blog', name: 'Blog Intelligence', icon: <Monitor size={28}/>, desc: '네이버 상위 노출 SEO 전문 원고' },
                          { id: 'insta', name: 'Social Feed Core', icon: <Instagram size={28}/>, desc: '인스타그램 도달 최적화 본문' },
                          { id: 'short', name: 'Video Script Hub', icon: <Film size={28}/>, desc: '숏폼(릴스/쇼츠) 제작 가이드' }
                        ].map(tab => (
                          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`w-full p-10 rounded-[3.5rem] border-4 text-left transition-all relative overflow-hidden group ${activeTab === tab.id ? 'bg-slate-900 border-slate-900 text-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] scale-[1.05] z-10' : 'bg-white border-white text-slate-400 hover:border-indigo-100 hover:text-slate-600 shadow-sm'}`}
                          >
                            <div className="flex items-center gap-6 mb-3">
                               <div className={`${activeTab === tab.id ? 'text-indigo-400' : 'text-slate-200 group-hover:text-indigo-100'}`}>{tab.icon}</div>
                               <span className="text-2xl font-black tracking-tighter uppercase italic">{tab.name}</span>
                            </div>
                            <p className={`text-sm font-bold tracking-tight ${activeTab === tab.id ? 'text-slate-400' : 'text-slate-300'}`}>{tab.desc}</p>
                          </button>
                        ))}
                     </div>
                  </div>

                  <div className="p-10 bg-indigo-600 rounded-[3.5rem] text-white shadow-[0_30px_60px_-15px_rgba(79,70,229,0.5)] flex items-center gap-8 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 opacity-10 -translate-y-1/2 translate-x-1/2"><Square size={200} fill="white" /></div>
                    <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform"><Download size={40} strokeWidth={3} /></div>
                    <div>
                      <p className="text-3xl font-black italic tracking-tighter leading-none uppercase">Verified</p>
                      <p className="text-xs font-bold uppercase tracking-[0.4em] mt-3 text-indigo-200">System Ready for Export</p>
                    </div>
                  </div>
               </div>

               <button 
                  onClick={handleCopy}
                  className={`w-full py-12 ${isCopied ? 'bg-emerald-600' : 'bg-slate-900'} text-white rounded-[4rem] font-black text-4xl flex items-center justify-center gap-8 transition-all hover:scale-[1.02] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] active:scale-95 uppercase italic tracking-tighter`}
               >
                  {isCopied ? <CheckCircle2 size={48} /> : <Copy size={48} />}
                  {isCopied ? 'Copy Done' : 'Master Copy'}
               </button>
            </div>
          </div>
        )}
      </main>

      {/* 3. 복사 버퍼 (오리지널 로직 유지) */}
      <div 
        ref={copyBufferRef}
        style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '800px', pointerEvents: 'none', userSelect: 'all', display: 'none' }}
        dangerouslySetInnerHTML={{ __html: generatedData ? `<h2>${selectedTitle}</h2>` + generatedData.blog_html : '' }}
      />

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default Creator;