import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, CloudRain, Sun, Snowflake, Cloud, 
  CheckCircle2, Zap, Layout, Instagram, Video, 
  Copy, Check, ArrowLeft, ArrowRight, RefreshCw,
  Target, ListOrdered, FileText, MousePointer2,
  Camera, Wand2, Info, Eye, Smartphone, ChevronRight,
  Star, ShieldCheck, Palette, ZapOff
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
- 각 섹션 끝에 [[image_1]] ~ [[image_5]] 태그를 순서대로 하나씩 배치하세요.
- HTML 태그(h2, p, br, strong)를 사용하세요.

[2단계: 이미지 프롬프트 생성 지침]
- 모든 프롬프트(p1~p5)는 반드시 다음 형식을 준수하세요:
  "Authentic real-life photo, Authentic real-work photo of [상황] referencing images from portal search. [물리적 묘사]. Shot on iPhone 15 Pro, unpolished, natural lighting, blurred license plate."
- [중요]: 너무 선명하지 않게, 실제 작업자가 현장에서 대충 찍은 듯한 'raw handheld shot' 느낌을 강조하세요.

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

  // [수정] 감성적인 로딩 메시지 (브랜드 반복 제거)
  const loadingMessages = [
    "오늘의 날씨를 분석하여 가장 효과적인 키워드를 선정하고 있습니다",
    "고객의 마음을 움직이는 전문적인 문장들을 다듬는 중입니다",
    "실제 시공 현장의 생생함을 담은 이미지를 생성하고 있어요",
    "디테일링 전문가의 관점으로 정성스럽게 글을 집필하고 있습니다",
    "클릭을 부르는 매력적인 헤드라인을 설계하는 중입니다",
    "거의 다 되었습니다. 잠시만 기다려주세요"
  ];

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 3000);
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
        headers: {
          "Authorization": `Key ${apiKey}`,
          "Content-Type": "application/json"
        },
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
    if (selectedTopics.length === 0) return alert("시공 항목을 하나 이상 선택해주세요.");
    setLoading(true);
    try {
      const selectedNames = categories.filter(c => selectedTopics.includes(c.id)).map(c => c.name).join(', ');
      const data = await callGemini(`시공: ${selectedNames}, 날씨: ${weather.desc}`, SYSTEM_PROMPT_TITLES);
      setTitles(data.titles);
      setStep('title');
    } catch (e) { alert("연결 오류가 발생했습니다."); }
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
        callFalAI(data.image_prompts.p1),
        callFalAI(data.image_prompts.p2),
        callFalAI(data.image_prompts.p3),
        callFalAI(data.image_prompts.p4),
        callFalAI(data.image_prompts.p5)
      ]);

      let finalHtml = data.blog_html;
      images.forEach((url, i) => {
        const replacement = url ? `
          <div class="my-10 rounded-3xl overflow-hidden border border-slate-100 shadow-2xl animate-fade-in-up bg-slate-50">
            <img src="${url}" class="w-full h-auto block" alt="detail" />
            <div class="p-4 bg-white text-center border-t border-slate-50 flex items-center justify-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-blue-600/30 animate-pulse"></div>
              <span class="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] italic">Captured by On-Site Snap</span>
            </div>
          </div>
        ` : `<div class="p-8 text-center text-slate-300 text-xs italic">이미지를 불러오지 못했습니다.</div>`;
        finalHtml = finalHtml.replace(`[[image_${i + 1}]]`, replacement);
      });

      setGeneratedData({ ...data, blog_html: finalHtml });
      setStep('result');
    } catch (e) { alert("최종 생성 오류가 발생했습니다."); }
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
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes floating { 0% { transform: translateY(0); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0); } }
        @keyframes textFade { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .animate-floating { animation: floating 3s ease-in-out infinite; }
        .animate-text-fade { animation: textFade 0.5s ease-out forwards; }
        .blog-body h2 { font-size: 1.4rem; font-weight: 800; color: #0f172a; margin-top: 2.5rem; margin-bottom: 1rem; border-left: 5px solid #2563eb; padding-left: 1rem; letter-spacing: -0.02em; }
        .blog-body p { font-size: 1rem; line-height: 1.9; color: #334155; margin-bottom: 1.5rem; text-align: justify; word-break: keep-all; }
      `}</style>

      {toastMsg && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[9999] animate-bounce w-full max-w-[300px] px-4">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-3xl text-[14px] font-bold shadow-2xl flex items-center justify-center gap-2 border border-slate-700 backdrop-blur-lg">
            <CheckCircle2 size={18} className="text-green-400" /> {toastMsg}
          </div>
        </div>
      )}

      {/* 헤더 [업데이트: V1.1 배지 복구] */}
      <header className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => {
              if(step === 'keyword') navigate('/dashboard');
              else if(step === 'title') setStep('keyword');
              else if(step === 'index') setStep('title');
              else setStep('index');
            }} className="p-2 hover:bg-slate-50 rounded-xl active:scale-90 transition-all border border-transparent shadow-sm">
            <ArrowLeft size={22} className="text-slate-500" />
          </button>
          <div className="text-left">
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none flex items-center gap-2">
              GLUNEX <span className="text-blue-600">AI</span>
              <span className="bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded-full not-italic tracking-normal">V1.1</span>
            </h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1.5 italic">Hyper-Realism Agent</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 shadow-inner">
          {weather.status === 'rain' ? <CloudRain size={16} className="text-blue-500" /> : <Sun size={16} className="text-orange-400" />}
          <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">{weather.desc} {weather.temp}°C</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8 pb-44 relative">
        
        {loading ? (
          /* [업데이트] 감성 로딩 시스템 (도트 제거 및 멘트 최적화) */
          <div className="flex flex-col h-full items-center justify-center animate-fade-in py-24 text-center">
            <div className="relative mb-14 animate-floating">
              <div className="w-28 h-28 bg-blue-600/5 rounded-full flex items-center justify-center relative">
                 <div className="w-20 h-20 border-[6px] border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                 <Sparkles className="absolute text-blue-600 animate-pulse" size={40} />
              </div>
            </div>
            
            <div className="space-y-4 max-w-[280px]">
               <h3 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">Wait for Magic</h3>
               <div className="h-12 overflow-hidden relative">
                  <p key={loadingMsgIndex} className="text-[14px] text-slate-500 font-bold leading-snug animate-text-fade absolute w-full left-0">
                    {loadingMessages[loadingMsgIndex]}
                  </p>
               </div>
               <div className="pt-4">
                 <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100 animate-pulse">
                   AI Generating...
                 </span>
               </div>
            </div>
          </div>
        ) : step === 'keyword' ? (
          <>
            <section className="animate-fade-in-up">
              <div className={`p-8 rounded-[3rem] border-2 transition-all duration-700 shadow-2xl ${isWeatherEnabled ? 'bg-blue-600 border-blue-400 text-white shadow-blue-200/50' : 'bg-white border-slate-200 text-slate-900'}`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${isWeatherEnabled ? 'bg-white/20 shadow-lg' : 'bg-blue-50'}`}>
                       <Zap size={24} className={isWeatherEnabled ? 'text-white' : 'text-blue-600'} />
                    </div>
                    <div>
                      <h2 className="text-[18px] font-black uppercase tracking-tight leading-none">날씨 인사이트</h2>
                      <p className={`text-[10px] font-bold uppercase mt-1.5 tracking-[0.2em] ${isWeatherEnabled ? 'text-blue-200' : 'text-slate-400'}`}>Environment Intelligence</p>
                    </div>
                  </div>
                  <button onClick={() => setIsWeatherEnabled(!isWeatherEnabled)} className={`w-14 h-7 rounded-full relative transition-all duration-500 shadow-inner ${isWeatherEnabled ? 'bg-white/30' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-xl transition-all duration-500 ${isWeatherEnabled ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
                <p className="text-[14px] font-semibold opacity-95 leading-relaxed tracking-tight border-t border-white/10 pt-6">
                   {isWeatherEnabled ? `현재 '${weather.desc}' 날씨를 분석하여 방문율이 가장 높은 맞춤형 마케팅 원고를 설계합니다.` : "모든 상황에 적합한 보편적인 마케팅 원고를 생성합니다."}
                </p>
              </div>
            </section>

            <section className="space-y-6 animate-fade-in-up delay-100 pb-12">
              <div className="flex items-center justify-between px-2">
                 <h2 className="text-xl font-black text-slate-900 tracking-tighter flex items-center gap-3 uppercase italic">
                    <Target size={24} className="text-blue-600" /> 시공 품목 선택
                 </h2>
                 <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 uppercase tracking-widest">Multi-Select</span>
              </div>
              <div className="grid grid-cols-3 gap-3.5">
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setSelectedTopics(p => p.includes(cat.id) ? p.filter(t => t !== cat.id) : [...p, cat.id])}
                    className={`relative py-7 px-2 rounded-[2rem] border-2 transition-all duration-300 text-center ${
                      selectedTopics.includes(cat.id)
                        ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.05] font-black z-10'
                        : 'bg-white border-white text-slate-500 hover:border-blue-100 shadow-sm text-[14px] font-bold'
                    }`}
                  >
                    {cat.name}
                    {selectedTopics.includes(cat.id) && (
                       <div className="absolute top-3 right-3 text-blue-400">
                          <CheckCircle2 size={16} fill="currentColor" className="text-white shadow-md" />
                       </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : step === 'title' ? (
          <section className="space-y-8 animate-fade-in-up text-left">
            <div className="flex items-center justify-between px-2">
              <div>
                <div className="flex items-center gap-2 mb-3">
                   <div className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase shadow-lg tracking-widest flex items-center gap-1.5">
                      <Sparkles size={12} fill="currentColor" /> AI Best Headlines
                   </div>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-tight italic">제목을 선택하세요</h2>
              </div>
              <button onClick={handleGenerateTitles} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 transition-all active:scale-95 shadow-lg group">
                <RefreshCw size={24} className="group-active:rotate-180 transition-transform duration-500" />
              </button>
            </div>
            <div className="space-y-4">
              {titles.map((t, i) => (
                <button key={i} onClick={() => handleGenerateIndex(t)}
                  className="w-full text-left p-6 rounded-[2rem] bg-white border border-slate-50 hover:border-blue-600 transition-all active:scale-[0.98] group relative overflow-hidden shadow-md border-l-[8px] border-l-blue-600/10 hover:border-l-blue-600"
                >
                  <p className="text-[17px] font-black text-slate-800 leading-snug group-hover:text-blue-600 tracking-tight z-10 relative">{t}</p>
                </button>
              ))}
            </div>
          </section>
        ) : step === 'index' ? (
          <section className="space-y-10 animate-fade-in-up">
            <div className="px-2">
              <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full uppercase mb-4 inline-block tracking-[0.2em]">Story Board</span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-tight italic">설계된 글의 흐름입니다</h2>
              <p className="text-[12px] text-slate-400 font-bold border-l-4 border-blue-600 pl-5 leading-relaxed mt-4 uppercase tracking-tighter">Content structure is optimized for SEO.</p>
            </div>
            
            <div className="bg-slate-50 rounded-[3rem] border border-slate-100 p-8 space-y-5 shadow-inner relative overflow-hidden">
               <div className="absolute top-0 right-0 w-40 h-40 bg-blue-100/30 rounded-full blur-3xl -mr-12 -mt-12"></div>
               {indexList.map((idx, i) => (
                 <div key={i} className="flex gap-5 items-start group">
                    <div className="w-8 h-8 rounded-2xl bg-white border border-slate-200 text-[11px] font-black flex items-center justify-center text-slate-400 shrink-0 group-hover:border-blue-600 group-hover:text-blue-600 transition-all shadow-sm">
                      0{i + 1}
                    </div>
                    <p className="text-[16px] font-black text-slate-700 leading-snug tracking-tight pt-1.5">{idx}</p>
                 </div>
               ))}
            </div>

            <div className="flex gap-4">
              <button onClick={() => handleGenerateIndex(selectedTitle)} className="flex-1 py-5 bg-white border-2 border-slate-100 rounded-[2rem] text-slate-500 text-sm font-black active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-slate-50 shadow-sm">
                <RefreshCw size={18} /> 재생성
              </button>
              <button onClick={handleGenerateFullContent} className="flex-[2.5] py-5 bg-slate-900 text-white rounded-[2rem] font-black text-base shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
                <FileText size={20} className="text-blue-400" /> 원고 집필 시작
              </button>
            </div>
          </section>
        ) : (
          <section className="space-y-8 animate-fade-in-up pb-24">
            <div className="flex bg-slate-200/50 p-2 rounded-3xl border border-slate-100 shadow-inner">
              {[
                { id: 'blog', name: '블로그', icon: <Layout size={16}/> },
                { id: 'insta', name: '인스타그램', icon: <Instagram size={16}/> },
                { id: 'short', name: '숏폼대본', icon: <Video size={16}/> }
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} 
                  className={`flex-1 py-3.5 rounded-2xl text-[13px] font-black flex items-center justify-center gap-2.5 transition-all duration-500 ${
                    activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl scale-[1.03] z-10' : 'text-slate-500'
                  }`}
                >
                  {tab.icon} {tab.name}
                </button>
              ))}
            </div>

            <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-[0_30px_100px_rgba(0,0,0,0.08)] min-h-[650px] relative overflow-hidden text-left border-t-[10px] border-t-blue-600 animate-fade-in-up">
              <div className="absolute top-8 right-8 z-30">
                <button onClick={handleCopy} className={`p-4 rounded-2xl border transition-all active:scale-90 shadow-xl ${isCopied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-900 border-slate-800 text-white'}`}>
                  {isCopied ? <Check size={24} /> : <Copy size={24} />}
                </button>
              </div>
              
              <div className="pt-14">
                {activeTab === 'blog' ? (
                  <article className="prose prose-slate max-w-none blog-body">
                    <div className="mb-14 pb-8 border-b border-slate-100">
                        <div className="flex items-center gap-2.5 mb-4">
                           <Camera size={16} className="text-slate-400" />
                           <span className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">Real-Life Documentation</span>
                        </div>
                        <h2 className="text-[26px] font-black text-slate-900 leading-[1.4] tracking-tighter italic border-l-[8px] border-blue-600 pl-8 !mt-0">
                           {selectedTitle}
                        </h2>
                    </div>
                    <div className="text-[17px] leading-[2.2] text-slate-700 font-medium space-y-12 tracking-tight" dangerouslySetInnerHTML={{ __html: generatedData.blog_html }} />
                  </article>
                ) : (
                  <div className="pt-8 animate-fade-in-up">
                    <div className="bg-blue-50 text-blue-600 p-5 rounded-3xl mb-10 border border-blue-100 flex items-center gap-4">
                       <Sparkles size={22} className="animate-pulse" />
                       <p className="text-[12px] font-black uppercase tracking-[0.15em]">Social Impact Content</p>
                    </div>
                    <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 shadow-inner relative overflow-hidden">
                       <div className="absolute top-0 left-10 w-1.5 h-12 bg-blue-600 rounded-b-full shadow-lg"></div>
                       <pre className="whitespace-pre-wrap text-[16px] text-slate-800 leading-relaxed font-bold italic tracking-tight">
                          {activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form}
                       </pre>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-24 pt-10 border-t border-slate-50 text-center opacity-40">
                 <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.6em]">GLUNEX AI Agent v6.5</p>
              </div>
            </div>
            
            <button onClick={() => { setStep('keyword'); setGeneratedData(null); setTitles([]); setIndexList([]); }} className="w-full py-6 text-slate-400 text-[12px] font-black flex items-center justify-center gap-4 uppercase tracking-[0.4em] bg-white border border-slate-100 rounded-3xl hover:bg-slate-50 active:scale-95 transition-all shadow-sm">
              <RefreshCw size={18} /> New Project Start
            </button>
          </section>
        )}
      </main>

      {/* 하단 버튼 */}
      <footer className="fixed bottom-0 left-0 right-0 p-8 bg-white/85 backdrop-blur-3xl border-t border-slate-100 max-w-md mx-auto z-40 shadow-[0_-20px_50px_rgba(0,0,0,0.06)]">
        {step === 'keyword' && (
          <button onClick={handleGenerateTitles} disabled={selectedTopics.length === 0} 
            className={`w-full py-5 rounded-[2.5rem] font-black text-lg flex items-center justify-center gap-5 transition-all active:scale-95 shadow-2xl ${
              selectedTopics.length > 0 ? 'bg-slate-900 text-white shadow-slate-900/50 hover:bg-black' : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <Sparkles size={22} className="animate-pulse text-amber-400" /> 제목 생성하기 <ArrowRight size={20} />
          </button>
        )}
        {step === 'result' && (
           <div className="flex gap-4">
              <button onClick={handleCopy} className="flex-[2.5] py-5 bg-slate-900 text-white rounded-[2.5rem] font-black text-lg shadow-2xl active:scale-95 flex items-center justify-center gap-4 transition-all hover:bg-black">
                 {isCopied ? <CheckCircle2 size={22} className="text-green-400"/> : <Copy size={22}/>} {isCopied ? '복사 완료' : '전체 내용 복사'}
              </button>
              <button onClick={() => setStep('keyword')} className="flex-1 py-5 bg-white border-2 border-slate-900 text-slate-900 rounded-[2.5rem] font-black text-[15px] active:scale-95 transition-all hover:bg-slate-50">초기화</button>
           </div>
        )}
      </footer>
    </div>
  );
};

export default Creator;