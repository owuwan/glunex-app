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
  ChevronDown, MoreHorizontal, Maximize2, Monitor, Cpu, Layers, Square,
  CheckCircle as CheckIcon
} from 'lucide-react';

/**
 * [AI 마스터 프롬프트 설정 - 모바일 앱 버전 100% 복사]
 */
const SYSTEM_PROMPT_TITLES = `
당신은 대한민국 최고의 '자동차 외장관리(Automotive Detailing)' 전문 마케터입니다.
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
- [장비 및 도구 필수 고증]: 철분제거, 유리막, 광택기, 썬팅 헤라 등 고유의 질감 묘사 포함.

[출력 형식]
JSON 응답: { "blog_html": "...", "insta_text": "...", "short_form": "...", "image_prompts": { "p1": "...", "p2": "...", "p3": "...", "p4": "...", "p5": "..." } }
`;

const getEnvVar = (key) => {
  try {
    return import.meta.env[key];
  } catch (e) {
    return undefined;
  }
};

const apiKey = ""; 

const Creator = () => {
  const navigate = useNavigate();
  
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

  // [수정] 모바일 앱 버전 로딩 문구와 100% 동일하게 복구
  const loadingMessages = {
    title: [
      "고객의 시선을 사로잡는\n최적의 자동차 시공 제목을 설계 중입니다",
      "검색량 분석을 통해 유입이 가장 잘 되는\n차량 관련 키워드를 추출하고 있습니다",
      "예약 전환율을 높이는\n전략적인 첫 문장을 고민하고 있습니다"
    ],
    index: [
      "차량 전문가의 깊이가 느껴지는\n체계적인 목차를 구성하고 있습니다",
      "글의 논리적인 흐름과\nSEO 최적화 구조를 설계 중입니다",
      "사장님의 전문성을 돋보이게 할\n스토리보드를 완성하고 있습니다"
    ],
    content: [
      "실제 시공 현장의 생생함을 담은 이미지를\n비용 최적화 실사 질감으로 현상하고 있습니다",
      "디테일링 전문가의 관점에서\n정성스럽게 전문 원고를 집필 중입니다",
      "이미지와 글의 완벽한 복사 호환을 위해\n데이터 구조를 정밀하게 가공하고 있습니다",
      "네이버 블로그 알고리즘에 맞춘\n맞춤형 포스팅을 곧 완성합니다"
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
    { id: 'wash', name: '프리미엄 세차' }, { id: 'detailing', name: '수입차 디테일링' },
    { id: 'coating', name: '유리막코팅' }, { id: 'undercoating', name: '언더코팅' },
    { id: 'special_wash', name: '특수 세차' }, { id: 'interior_clean', name: '실내 크리닝' },
    { id: 'iron_remove', name: '철분제거' }, { id: 'glass_repel', name: '발수코팅' },
    { id: 'tinting', name: '썬팅(틴팅)' }, { id: 'blackbox', name: '블랙박스' },
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
          <div style="margin: 32px 0; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
            <img src="${url}" width="100%" style="display: block;" alt="전문 시공 사진" />
          </div>
        ` : `<p>[이미지 생성 대기 중...]</p>`;
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
        showToast("원고와 이미지가 복사되었습니다.");
        setTimeout(() => setIsCopied(false), 2000);
      } else {
        const text = activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form;
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        showToast("텍스트가 복사되었습니다.");
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (err) { alert("복사 실패"); }
  };

  return (
    <div className="h-full flex-1 flex flex-col bg-slate-50 font-sans selection:bg-indigo-100 overflow-hidden">
      {/* 1. 글로벌 헤더 (완전 한글화) */}
      <header className="h-14 px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-1 rounded-md shadow-sm"><Sparkles size={14} fill="currentColor" /></div>
            <h1 className="text-sm font-bold text-slate-900 uppercase tracking-tight italic">
              AI <span className="text-indigo-600 not-italic">콘텐츠 스튜디오</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg">
            <div className={`p-0.5 rounded ${weather.status === 'rain' ? 'text-blue-500' : 'text-orange-500'}`}>
              {weather.status === 'rain' ? <CloudRain size={14} /> : <Sun size={14} />}
            </div>
            <span className="text-[11px] font-semibold text-slate-600">{weather.desc}, {weather.temp}°C 연동</span>
          </div>
          <button onClick={() => setStep('keyword')} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-[11px] text-slate-500 hover:bg-slate-900 hover:text-white transition-all shadow-sm">
            초기화
          </button>
        </div>
      </header>

      {/* 2. 메인 컨텐츠 */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        
        {toastMsg && (
          <div className="fixed top-16 right-6 z-[100] animate-in slide-in-from-top-2">
            <div className="bg-slate-900 text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 text-xs font-bold">
              <CheckCircle2 size={14} className="text-emerald-400" /> {toastMsg}
            </div>
          </div>
        )}

        {/* [수정] 로딩 화면: 수직/수평 정중앙 배치 및 모바일 앱 문구 적용 */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm z-[60] animate-in fade-in duration-300">
            <div className="relative mb-10">
               <div className="w-20 h-20 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
               <Sparkles size={28} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3 whitespace-pre-line text-center leading-relaxed tracking-tight">
              {loadingMessages[loadingType][loadingMsgIndex]}
            </h3>
            <p className="text-[11px] text-slate-400 font-bold tracking-[0.2em] uppercase italic">AI Analysis Center</p>
          </div>
        ) : step === 'keyword' ? (
          /* 1단계: 시공 품목 구성 (한글화) */
          <div className="flex-1 overflow-y-auto p-10 animate-in fade-in duration-500">
            <div className="max-w-5xl mx-auto space-y-10">
              <div className="flex items-end justify-between border-b border-slate-200 pb-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">01 서비스 구성</h2>
                  <p className="text-sm text-slate-500 font-medium tracking-tight">홍보용 핵심 키워드를 선택하여 마케팅 로직을 구성하십시오.</p>
                </div>
                
                <button 
                    onClick={() => setIsWeatherEnabled(!isWeatherEnabled)}
                    className={`flex items-center gap-4 px-4 py-2 rounded-xl transition-all border-2 ${isWeatherEnabled ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-100'}`}
                >
                  <div className="text-left">
                    <h4 className="text-xs font-bold leading-tight uppercase italic">날씨 동기화 시스템</h4>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-all ${isWeatherEnabled ? 'bg-white/20' : 'bg-slate-100'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isWeatherEnabled ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                {categories.map((cat) => (
                  <button 
                    key={cat.id} 
                    onClick={() => setSelectedTopics(p => p.includes(cat.id) ? p.filter(t => t !== cat.id) : [...p, cat.id])}
                    className={`p-6 rounded-2xl border-2 transition-all text-left relative group ${
                      selectedTopics.includes(cat.id)
                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                        : 'bg-white border-white text-slate-400 hover:border-indigo-100 hover:text-slate-600 shadow-sm'
                    }`}
                  >
                    <Target size={18} className={selectedTopics.includes(cat.id) ? 'text-indigo-400' : 'text-slate-100 group-hover:text-indigo-100'} />
                    <span className="text-sm font-bold block mt-3">{cat.name}</span>
                    {selectedTopics.includes(cat.id) && (
                      <div className="absolute top-4 right-4 text-indigo-400">
                        <CheckIcon size={16} fill="currentColor" className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="pt-6 flex justify-center">
                <button 
                  onClick={handleGenerateTitles}
                  disabled={selectedTopics.length === 0}
                  className="group px-12 py-4 bg-indigo-600 text-white rounded-xl font-bold text-base shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-4 disabled:opacity-20"
                >
                  <Sparkles size={20} fill="currentColor" className="text-amber-300" />
                  마케팅 전략 수립
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        ) : step === 'title' ? (
          /* 2단계: 헤드라인 선정 (한글화) */
          <div className="flex-1 overflow-y-auto p-10 animate-in fade-in duration-500">
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="border-b border-slate-200 pb-6 space-y-1">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">02 제목 선정</h2>
                <p className="text-sm text-slate-500 font-medium">검색 유입률이 가장 높은 헤드라인을 선정하십시오.</p>
              </div>

              <div className="space-y-3">
                {titles.map((t, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleGenerateIndex(t)}
                    className="w-full text-left p-6 bg-white border border-slate-200 rounded-xl hover:border-indigo-600 hover:shadow-md transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-6">
                       <span className="text-lg font-black text-slate-200 group-hover:text-indigo-600 transition-colors">0{i+1}</span>
                       <p className="text-base font-bold text-slate-800 group-hover:text-slate-900 tracking-tight">{t}</p>
                    </div>
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-600" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : step === 'index' ? (
          /* 3단계: 구조 확인 (한글화) */
          <div className="flex-1 overflow-y-auto p-10 animate-in fade-in duration-500">
            <div className="max-w-3xl mx-auto space-y-10">
              <div className="border-b border-slate-200 pb-6 space-y-1">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">03 원고 구조</h2>
                <p className="text-sm text-slate-500 font-medium">콘텐츠 전문성을 위한 시공 프로세스 아키텍처입니다.</p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6 relative overflow-hidden">
                <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 mb-6">
                  <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 italic">확정된 헤드라인</h4>
                  <p className="text-lg font-black text-indigo-900 leading-tight">"{selectedTitle}"</p>
                </div>
                <div className="space-y-4">
                  {indexList.map((idx, i) => (
                    <div key={i} className="flex gap-5 items-center">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">{i+1}</div>
                      <p className="text-sm font-bold text-slate-700">{idx}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <button 
                  onClick={handleGenerateFullContent}
                  className="px-16 py-4 bg-slate-900 text-white rounded-xl font-bold text-base shadow-xl hover:bg-black transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-4"
                >
                  <FileText size={20} className="text-indigo-500" />
                  최종 원고 집필 시작
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 최종 결과: 하이엔드 스튜디오 에디터 (완전 한글화) */
          <div className="flex-1 flex overflow-hidden animate-in fade-in duration-1000 bg-white">
            <div className="flex-1 overflow-y-auto p-12 lg:p-16 scrollbar-hide border-r border-slate-100">
               <div className="max-w-2xl mx-auto">
                  {activeTab === 'blog' ? (
                    <article className="prose prose-slate max-w-none">
                      <div className="mb-16 pb-8 border-b-2 border-slate-900">
                         <div className="flex items-center gap-2 text-indigo-600 font-black uppercase tracking-[0.4em] mb-4 italic text-[10px]">
                            <Layers size={14} /> 전문 시공 보고서
                         </div>
                         <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight !mt-0 uppercase italic">{selectedTitle}</h2>
                      </div>
                      <div className="space-y-8 blog-content-view" 
                           style={{ fontSize: '1rem', lineHeight: '1.9', color: '#334155', textAlign: 'justify', wordBreak: 'keep-all' }}
                           dangerouslySetInnerHTML={{ __html: generatedData.blog_html }} />
                    </article>
                  ) : activeTab === 'insta' ? (
                    <div className="space-y-8 max-w-md mx-auto">
                      <div className="p-10 bg-slate-950 rounded-3xl shadow-2xl border border-slate-800 relative overflow-hidden">
                         <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-yellow-400 via-pink-600 to-purple-800 flex items-center justify-center text-white shadow-xl"><Instagram size={24}/></div>
                            <div>
                               <p className="text-lg font-black text-white italic leading-tight uppercase tracking-tighter">알고리즘 분석 센터</p>
                               <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">SNS 최적화 본문</p>
                            </div>
                         </div>
                         <pre className="relative whitespace-pre-wrap text-lg font-bold text-slate-200 leading-relaxed italic tracking-tight">
                            {generatedData.insta_text}
                         </pre>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                         <p className="text-[11px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2 tracking-widest italic"><Hash size={14} className="text-indigo-500" /> 추천 해시태그</p>
                         <p className="text-xs text-slate-600 font-bold">#GLUNEX #디테일링 #시공후기 #차쟁이 #유리막코팅 #카스타그램 #세차스타그램 #프리미엄시공</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-10 max-w-lg mx-auto">
                      <div className="flex items-center gap-4 p-8 bg-indigo-600 rounded-3xl text-white shadow-xl">
                        <Film size={32} className="text-white fill-white/20 animate-pulse" />
                        <div>
                          <p className="text-2xl font-black italic tracking-tighter uppercase leading-none">영상 스크립트 엔진</p>
                          <p className="text-[10px] text-indigo-200 font-black uppercase tracking-[0.4em] mt-2">숏폼 제작 센터</p>
                        </div>
                      </div>
                      <div className="bg-slate-950 p-12 rounded-3xl shadow-2xl text-white border-4 border-slate-900 space-y-8">
                         <div className="space-y-8 pt-4 border-t border-slate-800">
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] mb-4 italic">음성 나레이션 대본</p>
                            <p className="text-2xl font-black italic leading-snug text-white tracking-tighter">{generatedData.short_form}</p>
                         </div>
                      </div>
                    </div>
                  )}
               </div>
            </div>

            {/* 우측 사이드 패널 (완전 한글화) */}
            <div className="w-80 bg-slate-50 border-l border-slate-200 p-8 flex flex-col shrink-0">
               <div className="space-y-8 flex-1">
                  <div className="space-y-4">
                     <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic border-l-2 border-indigo-600 pl-3">채널별 콘텐츠 스위치</h5>
                     <div className="space-y-2">
                        {[
                          { id: 'blog', name: '네이버 블로그', icon: <Monitor size={18}/>, desc: 'SEO 최적화 전문 리포트' },
                          { id: 'insta', name: '인스타그램 피드', icon: <Instagram size={18}/>, desc: '도달 최적화 소셜 본문' },
                          { id: 'short', name: '숏폼 가이드북', icon: <Film size={18}/>, desc: '릴스/쇼츠 촬영 대본' }
                        ].map(tab => (
                          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${activeTab === tab.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-white text-slate-400 hover:border-indigo-50 shadow-sm'}`}
                          >
                            <div className="flex items-center gap-3 mb-1">
                               <div className={`${activeTab === tab.id ? 'text-indigo-400' : 'text-slate-200'}`}>{tab.icon}</div>
                               <span className="text-sm font-black tracking-tight uppercase italic">{tab.name}</span>
                            </div>
                            <p className={`text-[10px] font-semibold ${activeTab === tab.id ? 'text-slate-400' : 'text-slate-300'}`}>{tab.desc}</p>
                          </button>
                        ))}
                     </div>
                  </div>

                  <div className="p-5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100 flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0"><Download size={20} /></div>
                    <div>
                      <p className="text-sm font-black italic tracking-tighter leading-none">검증 완료</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest mt-1.5 text-indigo-200 leading-none">내보내기 준비 완료</p>
                    </div>
                  </div>
               </div>

               <button 
                  onClick={handleCopy}
                  className={`w-full py-4 ${isCopied ? 'bg-emerald-600' : 'bg-slate-900'} text-white rounded-xl font-black text-sm flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-xl active:scale-95 uppercase italic`}
               >
                  {isCopied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                  {isCopied ? '복사 완료' : '전체 내용 복사하기'}
               </button>
            </div>
          </div>
        )}
      </main>

      {/* 3. 복사 버퍼 (비노출 로직) */}
      <div 
        ref={copyBufferRef}
        style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '800px', pointerEvents: 'none', userSelect: 'all', display: 'none' }}
        dangerouslySetInnerHTML={{ __html: generatedData ? `<h2>${selectedTitle}</h2>` + generatedData.blog_html : '' }}
      />
    </div>
  );
};

export default Creator;