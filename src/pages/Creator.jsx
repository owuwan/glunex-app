import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, CloudRain, Sun, Snowflake, Cloud, 
  CheckCircle2, Zap, Layout, Instagram, Video, 
  Copy, Check, ArrowLeft, ArrowRight, RefreshCw,
  Target, ListOrdered, FileText, MousePointer2,
  Camera, Wand2, Info, Eye, Star, ShieldCheck,
  ZapOff, Palette, MousePointer
} from 'lucide-react';

/**
 * [AI 마스터 프롬프트 설정]
 * 상호명 언급 금지 및 집필 분량을 엄격하게 통제합니다.
 */
const SYSTEM_PROMPT_TITLES = `
당신은 대한민국 최고의 자동차 디테일링 전문 마케터입니다.
[시공 항목]과 [날씨]를 분석하여 고객의 클릭을 유도하는 트렌디한 제목 5개를 작성하세요.
절대로 '글루넥스', 'GLUNEX' 또는 특정 브랜드/매장 이름을 언급하지 마세요. 오직 시공 서비스의 가치와 정보에 집중하세요.
반드시 JSON 구조로만 응답하세요: { "titles": ["제목1", "제목2", "제목3", "제목4", "제목5"] }
`;

const SYSTEM_PROMPT_INDEX = `
선택된 제목을 바탕으로 네이버 블로그에 최적화된 전문적인 5단계 목차를 구성하세요.
브랜드명은 절대 포함하지 마세요. SEO 최적화된 정보성 목차여야 합니다.
반드시 JSON 구조로만 응답하세요: { "index": ["1. 목차내용", "2. 목차내용", "3. 목차내용", "4. 목차내용", "5. 목차내용"] }
`;

const SYSTEM_PROMPT_CONTENT = `
당신은 자동차 디테일링 전문가입니다. 선정된 5개 목차를 바탕으로 블로그 본문, 인스타 문구, 숏폼 대본, 그리고 각 목차별 이미지 생성을 위한 프롬프트를 작성하세요.

[필수 지시사항]
1. 블로그 본문 (blog_html): 
   - 각 5개의 목차별로 본문 내용은 공백 제외 450자에서 550자 사이로 매우 상세하게 작성하세요. 
   - 총 5개 섹션이므로 전체 분량은 공백 제외 최소 2,250자 이상이어야 합니다.
   - 각 목차(섹션)가 끝날 때마다 [[image_1]], [[image_2]], [[image_3]], [[image_4]], [[image_5]] 태그를 순서대로 하나씩 배치하세요.
   - 절대로 '글루넥스', 'GLUNEX' 등 상호명을 언급하지 마세요.
   - HTML 태그(h2, p, br, strong)를 사용하세요. h2는 목차 제목으로 사용하세요.
2. 이미지 프롬프트 (image_prompts):
   - 각 목차의 주제에 어울리는 구체적인 영문 프롬프트 5개를 작성하세요. (p1 ~ p5)
   - 스타일 가이드: "Premium Korean car detailing shop indoor background, shot on iPhone 15 Pro, 24mm lens, natural studio lighting, ultra-realistic texture, 8k, no text, no logo" 키워드를 반드시 포함하세요.

[출력 형식]
JSON으로만 응답하세요:
{
  "blog_html": "HTML 내용",
  "insta_text": "인스타 내용",
  "short_form": "숏폼 대본",
  "image_prompts": { "p1": "...", "p2": "...", "p3": "...", "p4": "...", "p5": "..." }
}
`;

const Creator = ({ userStatus }) => {
  const navigate = useNavigate();
  
  // --- 상태 관리 (490줄 이상의 풍성한 UI를 위한 상태들) ---
  const [step, setStep] = useState('keyword'); 
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
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
  const contentRef = useRef(null);

  // 실시간 날씨 연동
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
    { id: 'special_wash', name: '실내특수세차' }, { id: 'interior_clean', name: '실내크리닝' },
    { id: 'iron_remove', name: '철분제거' }, { id: 'glass_repel', name: '유리발수코팅' },
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
      const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
        method: "POST",
        headers: {
          "Authorization": `Key ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: prompt,
          image_size: "landscape_4_3",
          num_inference_steps: 4
        })
      });
      const data = await response.json();
      return data.images[0].url;
    } catch (e) { return null; }
  };

  // 1단계: 제목 생성
  const handleGenerateTitles = async () => {
    if (selectedTopics.length === 0) return alert("시공 항목을 선택해주세요.");
    setLoading(true);
    setLoadingMsg("대한민국 상위 1%의 클릭을 유도하는\n트렌디한 헤드라인을 설계 중입니다...");
    try {
      const selectedNames = categories.filter(c => selectedTopics.includes(c.id)).map(c => c.name).join(', ');
      const data = await callGemini(`시공: ${selectedNames}, 날씨: ${weather.desc}`, SYSTEM_PROMPT_TITLES);
      setTitles(data.titles);
      setStep('title');
    } catch (e) { alert("연결 오류가 발생했습니다."); }
    finally { setLoading(false); }
  };

  // 2단계: 목차 생성
  const handleGenerateIndex = async (title) => {
    setSelectedTitle(title);
    setLoading(true);
    setLoadingMsg("검색 엔진(SEO) 최적화와 독자의 가독성을 고려하여\n체계적인 목차를 구성 중입니다...");
    try {
      const data = await callGemini(`제목: ${title}`, SYSTEM_PROMPT_INDEX);
      setIndexList(data.index);
      setStep('index');
    } catch (e) { alert("목차 구성 실패"); }
    finally { setLoading(false); }
  };

  // 3단계: 최종 집필 (이미지 5장 병렬 생성)
  const handleGenerateFullContent = async () => {
    setLoading(true);
    setLoadingMsg("아이폰 15 Pro 감성의 고화질 사진 5장과\n전문 마케팅 원고를 정성껏 생성 중입니다...");
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
          <div class="my-12 rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-2xl animate-fade-up bg-slate-50">
            <img src="${url}" class="w-full h-auto block" alt="detail" />
            <div class="p-4 bg-white text-center border-t border-slate-50 flex items-center justify-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Shot on iPhone 15 Pro</span>
            </div>
          </div>
        ` : `<div class="p-10 text-center text-slate-300 text-xs italic">이미지 현상 대기 중...</div>`;
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
      showToast("클립보드에 복사되었습니다!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) { alert("복사 권한 오류"); }
  };

  return (
    <div className="h-full flex flex-col bg-[#F9FAFB] font-noto overflow-hidden relative text-left">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up { animation: fadeUp 0.8s ease-out forwards; }
        .blog-body h2, .blog-body p { opacity: 0; animation: fadeUp 0.8s ease-out forwards; }
      `}</style>

      {toastMsg && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[9999] animate-bounce w-full max-w-xs px-4">
          <div className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] text-sm font-black shadow-2xl flex items-center justify-center gap-3 border border-slate-700 backdrop-blur-lg">
            <CheckCircle2 size={18} className="text-green-400" /> {toastMsg}
          </div>
        </div>
      )}

      {/* 헤더 섹션 */}
      <header className="px-6 py-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if(step === 'keyword') navigate('/dashboard');
              else if(step === 'title') setStep('keyword');
              else if(step === 'index') setStep('title');
              else setStep('index');
            }} 
            className="p-2.5 hover:bg-slate-50 rounded-2xl transition-all active:scale-90 border border-transparent hover:border-slate-100"
          >
            <ArrowLeft size={22} className="text-slate-400 group-hover:text-slate-900" />
          </button>
          <div className="text-left">
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Partner <span className="text-blue-600">Ai</span></h1>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1.5 leading-none">Premium Marketing Agent</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 bg-slate-50 px-4 py-2.5 rounded-3xl min-w-[110px] justify-center border border-slate-100 shadow-inner">
          {weather.status === 'rain' ? <CloudRain size={18} className="text-blue-500" /> : <Sun size={18} className="text-orange-400" />}
          <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">
             {weather.loading ? 'LOADING' : `${weather.desc} ${weather.temp}°C`}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8 pb-44">
        
        {loading ? (
          <div className="flex flex-col h-full items-center justify-center animate-fade-in py-24 text-center">
            <div className="relative mb-12">
              <div className="w-24 h-24 border-[6px] border-slate-50 border-t-blue-600 rounded-full animate-spin shadow-sm"></div>
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-pulse" size={28} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tighter italic uppercase leading-none">Generating...</h2>
            <p className="text-[15px] text-slate-600 font-bold leading-relaxed whitespace-pre-line px-4 tracking-tight">{loadingMsg}</p>
          </div>
        ) : step === 'keyword' ? (
          <>
            <section className="animate-fade-in">
              <div className={`p-8 rounded-[3rem] border-2 transition-all duration-700 shadow-2xl ${isWeatherEnabled ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-2xl ${isWeatherEnabled ? 'bg-white/20' : 'bg-blue-50'}`}>
                       <Zap size={24} className={isWeatherEnabled ? 'text-white' : 'text-blue-600'} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black uppercase tracking-tight leading-none">날씨 인사이트</h2>
                      <p className={`text-[9px] font-black uppercase mt-1.5 tracking-widest ${isWeatherEnabled ? 'text-blue-200' : 'text-slate-400'}`}>Real-time Weather Sync</p>
                    </div>
                  </div>
                  <button onClick={() => setIsWeatherEnabled(!isWeatherEnabled)} className={`w-16 h-8 rounded-full relative transition-all duration-300 shadow-inner ${isWeatherEnabled ? 'bg-white/30' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-xl transition-all ${isWeatherEnabled ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
                <p className="text-[15px] font-bold opacity-95 leading-relaxed tracking-tight border-t border-white/10 pt-5">
                   {isWeatherEnabled ? `오늘처럼 '${weather.desc}' 날씨에 고객들이 가장 필요로 할 서비스가 무엇인지 분석하여 제안합니다.` : "날씨 상황과 무관한 일반적인 전문 마케팅 원고를 생성합니다."}
                </p>
              </div>
            </section>

            <section className="space-y-6 animate-fade-in pb-10">
              <div className="flex items-center justify-between px-2">
                 <h2 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
                    <Target size={24} className="text-blue-600" /> 시공 품목 선택
                 </h2>
                 <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Multiple</span>
                 </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setSelectedTopics(p => p.includes(cat.id) ? p.filter(t => t !== cat.id) : [...p, cat.id])}
                    className={`relative py-8 px-2 rounded-[2rem] border-2 transition-all duration-500 text-center ${
                      selectedTopics.includes(cat.id)
                        ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.06] z-10 font-black'
                        : 'bg-white border-white text-slate-500 hover:border-blue-100 shadow-sm text-[15px] font-bold'
                    }`}
                  >
                    {cat.name}
                    {selectedTopics.includes(cat.id) && (
                       <div className="absolute top-3 right-3 text-blue-400 animate-fade-in">
                          <CheckCircle2 size={18} fill="currentColor" className="text-white shadow-md" />
                       </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : step === 'title' ? (
          <section className="space-y-8 animate-fade-in text-left">
            <div className="flex items-center justify-between px-1">
              <div>
                <div className="flex items-center gap-2 mb-3">
                   <div className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase shadow-lg tracking-widest flex items-center gap-2">
                      <Star size={12} fill="currentColor" /> Ai Optimized Headline
                   </div>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight italic">제목을 하나 골라주세요</h2>
              </div>
              <button 
                onClick={handleGenerateTitles} 
                className="p-3.5 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95 shadow-md group"
              >
                <RefreshCw size={24} className="group-hover:rotate-180 transition-transform duration-500" />
              </button>
            </div>
            <div className="space-y-4">
              {titles.map((t, i) => (
                <button key={i} onClick={() => handleGenerateIndex(t)}
                  className="w-full text-left p-8 rounded-[2.5rem] bg-white border border-slate-50 hover:border-blue-500 transition-all active:scale-[0.98] group relative overflow-hidden shadow-sm border-l-[10px] border-l-blue-600/10 hover:border-l-blue-600"
                >
                  <p className="text-lg font-black text-slate-800 leading-snug group-hover:text-blue-600 relative z-10 tracking-tight">{t}</p>
                  <MousePointer2 className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-50 opacity-0 group-hover:opacity-100 transition-all" size={32} />
                </button>
              ))}
            </div>
          </section>
        ) : step === 'index' ? (
          <section className="space-y-10 animate-fade-in">
            <div className="px-1">
              <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full uppercase mb-4 inline-block tracking-widest shadow-sm">Plan Architecture</span>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight italic mb-4">설계된 글의 흐름입니다</h2>
              <p className="text-[12px] text-slate-400 font-bold border-l-[4px] border-blue-600 pl-5 leading-relaxed uppercase tracking-tight">Each section will be expanded into 500+ characters with 5 iPhone shots.</p>
            </div>
            
            <div className="bg-slate-50 rounded-[3rem] border border-slate-100 p-10 space-y-6 shadow-inner relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full blur-3xl -mr-10 -mt-10"></div>
               {indexList.map((idx, i) => (
                 <div key={i} className="flex gap-6 items-start group">
                    <div className="w-9 h-9 rounded-2xl bg-white border border-slate-200 text-[11px] font-black flex items-center justify-center text-slate-400 shrink-0 group-hover:border-blue-600 group-hover:text-blue-600 transition-all shadow-md">
                      0{i + 1}
                    </div>
                    <p className="text-base font-bold text-slate-700 leading-snug tracking-tight pt-1.5">{idx}</p>
                 </div>
               ))}
            </div>

            <div className="flex gap-4">
              <button onClick={() => handleGenerateIndex(selectedTitle)} className="flex-1 py-6 bg-white border-2 border-slate-100 rounded-[2.5rem] text-slate-500 text-sm font-black active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-slate-50">
                 <RefreshCw size={20} /> 목차 재생성
              </button>
              <button onClick={handleGenerateFullContent} className="flex-[2.5] py-6 bg-slate-900 text-white rounded-[2.5rem] font-black text-base shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-slate-800">
                 <FileText size={22} className="text-blue-400" /> 원고 집필 및 사진 현상
              </button>
            </div>
          </section>
        ) : (
          <section className="space-y-8 animate-fade-in pb-20">
            <div className="flex bg-slate-200/50 p-2 rounded-[2.2rem] border border-slate-100 shadow-inner">
              {[
                { id: 'blog', name: '블로그' },
                { id: 'insta', name: '인스타그램' },
                { id: 'short', name: '숏폼대본' }
              ].map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id)} 
                  className={`flex-1 py-4.5 rounded-[1.8rem] text-[14px] font-black transition-all duration-500 ${
                    activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl scale-[1.03] z-10' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-2xl min-h-[600px] relative overflow-hidden text-left border-t-[12px] border-t-blue-600 animate-fade-up">
              <div className="absolute top-10 right-10 z-30">
                <button 
                  onClick={handleCopy} 
                  className={`p-5 rounded-[1.8rem] border-2 transition-all active:scale-90 shadow-xl ${isCopied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-900 border-slate-800 text-white'}`}
                >
                  {isCopied ? <Check size={28} /> : <Copy size={28} />}
                </button>
              </div>
              
              <div className="pt-16">
                {activeTab === 'blog' ? (
                  <article className="prose prose-slate max-w-none font-noto blog-body">
                    <div className="mb-14 pb-10 border-b border-slate-50">
                        <div className="flex items-center gap-2 mb-4">
                           <div className="bg-blue-50 p-2 rounded-xl border border-blue-100">
                              <Camera size={18} className="text-blue-600 animate-pulse" />
                           </div>
                           <span className="text-blue-600 font-black text-[11px] uppercase tracking-[0.2em]">Shot on iPhone Style Content</span>
                        </div>
                        <h2 className="text-[1.8rem] font-black text-slate-900 leading-[1.3] tracking-tighter italic border-l-[10px] border-blue-600 pl-8">
                           {selectedTitle}
                        </h2>
                    </div>
                    <div className="text-[17px] leading-[2.2] text-slate-700 font-medium space-y-14 tracking-tight" dangerouslySetInnerHTML={{ __html: generatedData.blog_html }} />
                  </article>
                ) : (
                  <div className="pt-10 animate-fade-up">
                    <div className="bg-blue-50 text-blue-600 p-5 rounded-[2rem] mb-10 border border-blue-100 flex items-center gap-4">
                       <Sparkles size={22} className="animate-pulse" />
                       <p className="text-[13px] font-black uppercase tracking-[0.1em] leading-none">Premium Social Copywriting</p>
                    </div>
                    <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 shadow-inner relative overflow-hidden">
                       <div className="absolute top-0 left-10 w-1.5 h-12 bg-blue-600 rounded-b-full"></div>
                       <pre className="whitespace-pre-wrap font-noto text-[16px] text-slate-800 leading-loose font-bold italic tracking-tight">
                          {activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form}
                       </pre>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-24 pt-12 border-t border-slate-50 text-center opacity-30">
                 <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.6em]">Glunex Intelligence Engine v5.0 • High-End AI</p>
              </div>
            </div>
            
            <button 
               onClick={() => { setStep('keyword'); setGeneratedData(null); setTitles([]); setIndexList([]); }} 
               className="w-full py-7 text-slate-400 text-[12px] font-black flex items-center justify-center gap-4 uppercase tracking-[0.5em] bg-white border border-slate-100 rounded-[2.5rem] hover:bg-slate-50 transition-all active:scale-95"
            >
              <RefreshCw size={18} /> Start New Project
            </button>
          </section>
        )}
      </main>

      {/* 하단 고정 버튼 (490줄대의 웅장함을 완성하는 하단바) */}
      <footer className="fixed bottom-0 left-0 right-0 p-8 bg-white/80 backdrop-blur-3xl border-t border-slate-100 max-w-md mx-auto z-40 shadow-[0_-20px_50px_rgba(0,0,0,0.06)]">
        {step === 'keyword' && (
          <button 
            onClick={handleGenerateTitles} 
            disabled={selectedTopics.length === 0} 
            className={`w-full py-7 rounded-[3rem] font-black text-[18px] flex items-center justify-center gap-5 transition-all active:scale-95 shadow-2xl ${
              selectedTopics.length > 0 ? 'bg-slate-900 text-white shadow-slate-900/40 hover:bg-slate-800' : 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200 shadow-none'
            }`}
          >
            <Sparkles size={24} className="animate-pulse text-amber-400" /> 
            제목 생성하기 
            <ArrowRight size={22} className="ml-1" />
          </button>
        )}
        {step === 'result' && (
           <div className="flex gap-4">
              <button 
                onClick={handleCopy} 
                className="flex-[2.5] py-7 bg-slate-900 text-white rounded-[3rem] font-black text-[17px] shadow-2xl active:scale-95 flex items-center justify-center gap-5 transition-all hover:bg-slate-800"
              >
                 {isCopied ? <CheckCircle2 size={24} className="text-green-400"/> : <Copy size={24}/>} 
                 {isCopied ? '복사 완료!' : '전체 내용 복사'}
              </button>
              <button 
                onClick={() => { setStep('keyword'); setGeneratedData(null); }} 
                className="flex-1 py-7 bg-white border-2 border-slate-900 text-slate-900 rounded-[3rem] font-black text-[15px] active:scale-95 transition-all hover:bg-slate-50"
              >
                초기화
              </button>
           </div>
        )}
      </footer>
    </div>
  );
};

export default Creator;