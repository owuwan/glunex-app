import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, CloudRain, Sun, Snowflake, Cloud, 
  CheckCircle2, Zap, Layout, Instagram, Video, 
  Copy, Check, ArrowLeft, ArrowRight, RefreshCw,
  Target, ListOrdered, FileText, MousePointer2,
  Camera, Wand2, Info, Eye, Smartphone, ChevronRight,
  Star, ShieldCheck, Palette, ZapOff, X, FileSearch, CheckCircle
} from 'lucide-react';

/**
 * [AI 마스터 프롬프트 설정]
 */
const SYSTEM_PROMPT_TITLES = `
당신은 대한민국 최고의 자동차 디테일링 전문 마케터입니다.
상호명(예: 글루넥스, GLUNEX 등)은 절대로 언급하지 마세요. 오직 서비스의 가치에 집중하세요.
반드시 JSON 구조로만 응답하세요: { "titles": ["제목1", "제목2", "제목3", "제목4", "제목5"] }
`;

const SYSTEM_PROMPT_INDEX = `
네이버 블로그 전문 5단계 목차를 구성하세요. 브랜드명 제외. SEO 최적화된 정보성 목차여야 합니다.
반드시 JSON 구조로만 응답하세요: { "index": ["1. 목차내용", "2. 목차내용", "3. 목차내용", "4. 목차내용", "5. 목차내용"] }
`;

const SYSTEM_PROMPT_CONTENT = `
당신은 대한민국 자동차 외장관리 전문가입니다. 선정된 5개 목차를 바탕으로 블로그 본문과 실사 이미지 프롬프트를 생성하세요.

[1단계: 본문 작성 지침]
- 각 목차별 본문 내용은 공백 제외 450~550자 사이로 상세하게 작성하세요. (전체 최소 2,250자 이상)
- 상호명(GLUNEX 등) 언급 절대 금지. 전문적인 용어와 실제 공정 설명을 기술하세요.
- 각 섹션 끝에 [[image_1]] ~ [[image_5]] 태그를 순서대로 배치하세요.
- HTML 태그(h2, p, br, strong)를 사용하세요.

[2단계: 이미지 프롬프트 생성 지침]
- 모든 프롬프트(p1~p5)는 반드시 다음 형식을 준수하세요:
  "Authentic real-life photo, Authentic real-work photo of [상황] referencing images from portal search. [물리적 묘사]. Shot on iPhone 15 Pro, unpolished, natural lighting, blurred license plate."
- [중요]: 너무 선명하지 않게, 실제 작업자가 현장에서 찍은 듯한 'raw handheld shot' 느낌을 강조하세요.

[출력 형식]
JSON으로만 응답:
{
  "blog_html": "HTML 내용",
  "insta_text": "인스타 내용",
  "short_form": "숏폼 대본",
  "image_prompts": { "p1": "...", "p2": "...", "p3": "...", "p4": "...", "p5": "..." }
}
`;

const Creator = ({ userStatus }) => {
  const navigate = useNavigate();
  
  // --- 상태 관리 ---
  const [step, setStep] = useState('keyword'); 
  const [loading, setLoading] = useState(false);
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

  const loadingMessages = [
    "오늘의 날씨를 분석하여 가장 효과적인 키워드를 선정하고 있습니다",
    "고객의 클릭을 유도하는 최적의 문장들을 다듬는 중입니다",
    "시공 현장의 생생함이 느껴지는 이미지를 현상하고 있어요",
    "디테일링 전문가의 관점에서 정성스럽게 글을 작성하고 있습니다",
    "거의 다 되었습니다. 마지막 검수를 시작합니다"
  ];

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 3500);
    }
    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid=${API_KEY}&units=metric&lang=kr`);
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
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
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
  };

  const callFalAI = async (prompt) => {
    const apiKey = import.meta.env.VITE_FAL_API_KEY;
    if (!apiKey || apiKey === "undefined") return null;
    try {
      const response = await fetch("https://fal.run/fal-ai/flux-pro/v1.1", {
        method: "POST",
        headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
          // [핵심] 비용 최적화 해상도 (약 0.015달러 수준)
          image_size: { width: 896, height: 672 } 
        })
      });
      const data = await response.json();
      return data.images[0].url;
    } catch (e) { return null; }
  };

  const handleGenerateTitles = async () => {
    if (selectedTopics.length === 0) return alert("시공 항목을 선택해주세요.");
    setLoading(true);
    try {
      const selectedNames = categories.filter(c => selectedTopics.includes(c.id)).map(c => c.name).join(', ');
      const data = await callGemini(`시공: ${selectedNames}, 날씨: ${weather.desc}`, SYSTEM_PROMPT_TITLES);
      setTitles(data.titles);
      setStep('title');
    } catch (e) { alert("연결 오류 발생"); }
    finally { setLoading(false); }
  };

  const handleGenerateIndex = async (title) => {
    setSelectedTitle(title);
    setLoading(true);
    try {
      const data = await callGemini(`제목: ${title}`, SYSTEM_PROMPT_INDEX);
      setIndexList(data.index);
      setStep('index');
    } catch (e) { alert("목차 구성 실패"); }
    finally { setLoading(false); }
  };

  const handleGenerateFullContent = async () => {
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
          <div class="my-8 rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50">
            <img src="${url}" class="w-full h-auto block" alt="detail" />
            <div class="p-3 bg-white text-center border-t border-slate-50 flex items-center justify-center gap-1.5">
              <div class="w-1 h-1 rounded-full bg-blue-600/40 animate-pulse"></div>
              <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest italic">Raw Shot | Captured On-Site</span>
            </div>
          </div>
        ` : `<div class="p-8 text-center text-slate-200 text-xs italic">이미지 처리 대기 중...</div>`;
        finalHtml = finalHtml.replace(`[[image_${i + 1}]]`, replacement);
      });

      setGeneratedData({ ...data, blog_html: finalHtml });
      setStep('result');
    } catch (e) { alert("최종 생성 오류"); }
    finally { setLoading(false); }
  };

  const handleCopy = async () => {
    const text = activeTab === 'blog' ? generatedData.blog_html : (activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form);
    try {
      if (activeTab === 'blog') {
        const blob = new Blob([text], { type: "text/html" });
        await navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]);
      } else { await navigator.clipboard.writeText(text); }
      setIsCopied(true);
      showToast("내용이 복사되었습니다!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) { alert("복사 실패"); }
  };

  return (
    <div className="h-full flex flex-col bg-[#F9FAFB] font-pretendard overflow-hidden relative text-left select-none">
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');
        * { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif !important; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes floating { 0% { transform: translateY(0); } 50% { transform: translateY(-8px); } 100% { transform: translateY(0); } }
        @keyframes textFade { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
        .animate-floating { animation: floating 3s ease-in-out infinite; }
        .animate-text-fade { animation: textFade 0.6s ease-out forwards; }
        .blog-preview h2 { font-size: 1.25rem; font-weight: 900; color: #1e293b; margin-top: 2rem; margin-bottom: 0.8rem; border-left: 4px solid #2563eb; padding-left: 0.8rem; letter-spacing: -0.02em; }
        .blog-preview p { font-size: 0.95rem; line-height: 1.8; color: #475569; margin-bottom: 1.2rem; text-align: justify; word-break: keep-all; }
        .blog-preview strong { color: #0f172a; font-weight: 800; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>

      {toastMsg && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[9999] animate-bounce w-full max-w-[260px]">
          <div className="bg-slate-900 text-white px-5 py-3.5 rounded-2xl text-[13px] font-bold shadow-2xl flex items-center justify-center gap-2 border border-slate-700 backdrop-blur-md">
            <CheckCircle2 size={16} className="text-green-400" /> {toastMsg}
          </div>
        </div>
      )}

      {/* 헤더 [V1.1 배지 깔끔하게 고정] */}
      <header className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => {
              if(step === 'keyword') navigate('/dashboard');
              else if(step === 'title') setStep('keyword');
              else if(step === 'index') setStep('title');
              else setStep('index');
            }} className="p-2 hover:bg-slate-50 rounded-xl active:scale-90 transition-all">
            <ArrowLeft size={22} className="text-slate-500" />
          </button>
          <div className="text-left">
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none flex items-center gap-2">
              GLUNEX <span className="text-blue-600">AI</span>
              <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-md not-italic tracking-normal">V1.1</span>
            </h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.1em] mt-1.5 italic">Hyper-Realism Agent</p>
          </div>
        </div>
        <div className="bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 shadow-inner flex items-center gap-1.5">
          {weather.status === 'rain' ? <CloudRain size={14} className="text-blue-500" /> : <Sun size={14} className="text-orange-400" />}
          <span className="text-[10px] font-black text-slate-600 uppercase">{weather.desc} {weather.temp}°</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6 pb-44 scrollbar-hide">
        
        {loading ? (
          /* [로딩 화면] 감성 극대화 */
          <div className="flex flex-col h-full items-center justify-center animate-fade-in py-24 text-center">
            <div className="relative mb-14 animate-floating">
              <div className="w-24 h-24 bg-blue-600/5 rounded-full flex items-center justify-center relative shadow-inner">
                 <div className="w-16 h-16 border-[5px] border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                 <Sparkles className="absolute text-blue-600 animate-pulse" size={32} />
              </div>
            </div>
            
            <div className="space-y-4 px-6 max-w-[280px]">
               <h3 className="text-base font-black text-slate-900 tracking-tight uppercase italic opacity-60">Wait for Excellence</h3>
               <div className="h-14 overflow-hidden relative">
                  <p key={loadingMsgIndex} className="text-[14px] text-slate-500 font-bold leading-relaxed animate-text-fade absolute w-full left-0">
                    {loadingMessages[loadingMsgIndex]}
                  </p>
               </div>
               <div className="pt-2 flex justify-center gap-1.5">
                 {[0, 1, 2].map(i => <div key={i} className="w-1 h-1 bg-blue-600/20 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />)}
               </div>
            </div>
          </div>
        ) : step === 'keyword' ? (
          /* [단계 1] 키워드 선택 */
          <>
            <section className="animate-fade-in-up">
              <div className={`p-8 rounded-[3rem] border-2 transition-all duration-700 shadow-xl ${isWeatherEnabled ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isWeatherEnabled ? 'bg-white/20' : 'bg-blue-50'}`}>
                       <Zap size={22} className={isWeatherEnabled ? 'text-white' : 'text-blue-600'} />
                    </div>
                    <div>
                      <h2 className="text-[16px] font-black uppercase tracking-tight leading-none">날씨 연동 시스템</h2>
                      <p className={`text-[9px] font-bold uppercase mt-1 tracking-widest ${isWeatherEnabled ? 'text-blue-200' : 'text-slate-400'}`}>Weather Logic Sync</p>
                    </div>
                  </div>
                  <button onClick={() => setIsWeatherEnabled(!isWeatherEnabled)} className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isWeatherEnabled ? 'bg-white/30' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg transition-all ${isWeatherEnabled ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
                <p className="text-[13px] font-medium opacity-95 leading-relaxed tracking-tight border-t border-white/10 pt-6">
                   {isWeatherEnabled ? `현재 서울의 '${weather.desc}' 날씨를 반영하여 고객의 예약 전환율을 극대화하는 원고를 설계합니다.` : "모든 기상 상황에서 사용 가능한 표준 마케팅 원고를 생성합니다."}
                </p>
              </div>
            </section>

            <section className="space-y-5 animate-fade-in-up delay-100 pb-20">
              <div className="flex items-center justify-between px-1">
                 <h2 className="text-lg font-black text-slate-900 tracking-tighter flex items-center gap-2 uppercase italic">
                    <Target size={20} className="text-blue-600" /> 시공 품목
                 </h2>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setSelectedTopics(p => p.includes(cat.id) ? p.filter(t => t !== cat.id) : [...p, cat.id])}
                    className={`relative py-6 px-1 rounded-2xl border-2 transition-all duration-300 text-center ${
                      selectedTopics.includes(cat.id)
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.03] font-black z-10'
                        : 'bg-white border-white text-slate-500 shadow-sm text-[13px] font-bold'
                    }`}
                  >
                    {cat.name}
                    {selectedTopics.includes(cat.id) && <div className="absolute top-2 right-2 text-blue-400"><CheckCircle size={12} fill="white" /></div>}
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : step === 'title' ? (
          /* [단계 2] 제목 선택 */
          <section className="space-y-6 animate-fade-in-up text-left">
            <div className="px-1">
              <div className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest mb-2 inline-block">Step 02. Select Headline</div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic">가장 끌리는 제목을 골라주세요</h2>
            </div>
            <div className="space-y-3">
              {titles.map((t, i) => (
                <button key={i} onClick={() => handleGenerateIndex(t)}
                  className="w-full text-left p-6 rounded-[2rem] bg-white border border-slate-50 hover:border-blue-600 transition-all active:scale-[0.98] shadow-sm border-l-[8px] border-l-blue-600/10"
                >
                  <p className="text-[16px] font-black text-slate-800 leading-snug tracking-tight group-hover:text-blue-600 transition-colors">{t}</p>
                </button>
              ))}
            </div>
            <button onClick={handleGenerateTitles} className="w-full py-4 text-slate-400 text-xs font-bold flex items-center justify-center gap-2"><RefreshCw size={14} /> 다른 제목 추천받기</button>
          </section>
        ) : step === 'index' ? (
          /* [단계 3] 목차 기획 */
          <section className="space-y-8 animate-fade-in-up">
            <div className="px-1">
              <div className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest mb-2 inline-block">Step 03. Plan Structure</div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic">설계된 글의 목차입니다</h2>
            </div>
            
            <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-8 space-y-5 shadow-inner relative overflow-hidden">
               {indexList.map((idx, i) => (
                 <div key={i} className="flex gap-4 items-start group">
                    <div className="w-8 h-8 rounded-2xl bg-white border border-slate-200 text-[11px] font-black flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                      {i + 1}
                    </div>
                    <p className="text-[15px] font-black text-slate-700 leading-snug tracking-tight pt-1.5">{idx}</p>
                 </div>
               ))}
            </div>

            <div className="flex gap-3 px-1">
              <button onClick={() => handleGenerateIndex(selectedTitle)} className="p-5 bg-white border-2 border-slate-100 rounded-2xl text-slate-400 active:scale-95 transition-all shadow-sm"><RefreshCw size={20} /></button>
              <button onClick={handleGenerateFullContent} className="flex-1 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-base shadow-xl active:scale-95 flex items-center justify-center gap-3">
                <FileText size={20} className="text-blue-400" /> 원고 집필 시작
              </button>
            </div>
          </section>
        ) : (
          /* [최종 단계] 완성된 포스팅 결과 페이지 (사장님 요청사항 적극 반영) */
          <section className="space-y-6 animate-fade-in-up pb-24">
            {/* 상단 탭 내비게이션 [심플 앱 스타일] */}
            <div className="flex bg-slate-200/50 p-1.5 rounded-2xl border border-slate-100 shadow-inner mx-1">
              {[
                { id: 'blog', name: '블로그', icon: <Layout size={14}/> },
                { id: 'insta', name: '인스타그램', icon: <Instagram size={14}/> },
                { id: 'short', name: '숏폼대본', icon: <Video size={14}/> }
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} 
                  className={`flex-1 py-3 rounded-xl text-[12px] font-black flex items-center justify-center gap-2 transition-all duration-300 ${
                    activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg scale-[1.02] z-10' : 'text-slate-500'
                  }`}
                >
                  {tab.icon} {tab.name}
                </button>
              ))}
            </div>

            {/* 메인 결과 카드 [화이트 도큐먼트 스타일] */}
            <div className="bg-white p-7 rounded-[3rem] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] min-h-[650px] relative overflow-hidden text-left animate-fade-in-up">
              
              {/* 상단 툴바 [복사 버튼 통합] */}
              <div className="flex justify-between items-center mb-10 pb-5 border-b border-slate-50">
                 <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><FileSearch size={18} /></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Document</p>
                      <p className="text-[12px] font-black text-slate-800 tracking-tight mt-1 capitalize">{activeTab} Preview</p>
                    </div>
                 </div>
                 <button onClick={handleCopy} className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all active:scale-90 font-black text-[12px] ${isCopied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-900 border-slate-800 text-white shadow-lg shadow-slate-900/10'}`}>
                    {isCopied ? <Check size={16} /> : <Copy size={16} />}
                    {isCopied ? '복사됨' : '복사'}
                 </button>
              </div>

              {/* 본문 콘텐츠 영역 */}
              <div className="content-container px-1">
                {activeTab === 'blog' ? (
                  <article className="blog-preview">
                    {/* 제목 섹션 - 딱 한 번만 강조 */}
                    <div className="mb-12">
                       <div className="flex items-center gap-2 mb-4">
                          <Camera size={14} className="text-blue-500" />
                          <span className="text-[10px] font-black text-blue-500/60 uppercase tracking-[0.2em]">Real-Life Documentation</span>
                       </div>
                       <h2 className="!mt-0 !mb-0 !border-l-0 !pl-0 text-[26px] font-black text-slate-900 leading-[1.35] tracking-tighter">
                          {selectedTitle}
                       </h2>
                    </div>
                    {/* 본문 및 이미지 */}
                    <div className="space-y-10" dangerouslySetInnerHTML={{ __html: generatedData.blog_html }} />
                  </article>
                ) : (
                  <div className="animate-fade-in-up py-4">
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner relative overflow-hidden">
                       <div className="absolute top-0 left-8 w-1.5 h-10 bg-blue-600 rounded-b-full shadow-sm"></div>
                       <pre className="whitespace-pre-wrap text-[15px] text-slate-700 leading-relaxed font-bold tracking-tight italic">
                          {activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form}
                       </pre>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 푸터 카피라이트 */}
              <div className="mt-24 pt-10 border-t border-slate-50 text-center opacity-30">
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.6em]">GLUNEX AI Marketing Platform</p>
              </div>
            </div>
            
            {/* 초기화 버튼 [심플하게 하단 배치] */}
            <button onClick={() => { setStep('keyword'); setGeneratedData(null); setTitles([]); setIndexList([]); }} className="w-full py-6 text-slate-300 text-[11px] font-black flex items-center justify-center gap-4 uppercase tracking-[0.3em] bg-white border border-slate-100 rounded-[2rem] active:scale-95 transition-all shadow-sm">
              <RefreshCw size={16} /> Create New Post
            </button>
          </section>
        )}
      </main>

      {/* 하단 플로팅 액션 바 [기존 UI와 통일] */}
      <footer className="fixed bottom-0 left-0 right-0 p-8 bg-white/85 backdrop-blur-2xl border-t border-slate-100 max-w-md mx-auto z-40 shadow-[0_-15px_40px_rgba(0,0,0,0.04)]">
        {step === 'keyword' && (
          <button onClick={handleGenerateTitles} disabled={selectedTopics.length === 0} 
            className={`w-full py-5 rounded-[2.5rem] font-black text-lg flex items-center justify-center gap-5 transition-all active:scale-95 shadow-2xl ${
              selectedTopics.length > 0 ? 'bg-slate-900 text-white shadow-slate-900/40' : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <Sparkles size={22} className="text-amber-400 animate-pulse" /> 마케팅 제목 생성 <ArrowRight size={20} />
          </button>
        )}
        {step === 'result' && (
           <div className="flex gap-4">
              <button onClick={handleCopy} className={`flex-[3] py-5 bg-slate-900 text-white rounded-[2.5rem] font-black text-lg shadow-2xl active:scale-95 flex items-center justify-center gap-4 transition-all ${isCopied ? 'bg-green-600' : ''}`}>
                 {isCopied ? <CheckCircle2 size={22}/> : <Copy size={22}/>} {isCopied ? '복사 완료' : '전체 내용 복사'}
              </button>
              <button onClick={() => setStep('keyword')} className="flex-1 py-5 bg-white border-2 border-slate-100 text-slate-400 rounded-[2.5rem] font-black text-[15px] active:scale-95 transition-all">초기화</button>
           </div>
        )}
      </footer>
    </div>
  );
};

export default Creator;