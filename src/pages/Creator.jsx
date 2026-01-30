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
 * [AI 마스터 프롬프트 설정 - 기술 키워드 추출 및 네이버 검색 참조 로직]
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
당신은 대한민국 자동차 외장관리 전문가입니다. 선정된 5개 목차를 바탕으로 블로그 본문과 핵심 키워드 기반의 이미지 프롬프트를 생성하세요.

[1단계: 본문 작성 지침]
- 각 목차별 본문 내용은 공백 제외 450~550자 사이로 아주 상세하게 작성하세요. (전체 최소 2,250자 이상 필수)
- 상호명(GLUNEX 등) 언급 절대 금지. 전문적인 용어와 실제 공정 설명을 상세히 기술하세요.
- 각 섹션 끝에 [[image_1]], [[image_2]], [[image_3]], [[image_4]], [[image_5]] 태그를 순서대로 하나씩 배치하세요.
- HTML 태그(h2, p, br, strong)를 사용하세요. h2는 목차 제목으로 사용하세요.

[2단계: 키워드 요약 및 이미지 프롬프트 생성 지침]
- 각 섹션의 내용을 분석하여 가장 핵심적인 '기술 장비'나 '시공 상황' 키워드 3개를 한국어로 추출하세요.
- 추출된 키워드를 다음 영문 템플릿에 넣어 image_prompts(p1~p5)를 생성하세요:
  "Please check the '[키워드1]' '[키워드2]' '[키워드3]' in Korea detail shop with images within a year through www.naver.com search engine and make an image."

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
  
  // --- 상태 관리 (풍성한 UI 유지를 위한 모든 상태 복구) ---
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
    if (selectedTopics.length === 0) return alert("시공 항목을 하나 이상 선택해주세요.");
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

  // 3단계: 최종 집필 (네이버 검색 참조 로직 포함)
  const handleGenerateFullContent = async () => {
    setLoading(true);
    setLoadingMsg("글에서 핵심 키워드를 추출하여\n네이버 실제 시공 이미지를 참조 중입니다...");
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
          <div class="my-8 rounded-2xl overflow-hidden border border-slate-100 shadow-xl animate-fade-in-up bg-slate-50">
            <img src="${url}" class="w-full h-auto block" alt="detail" />
            <div class="p-3 bg-white text-center border-t border-slate-50 flex items-center justify-center gap-1.5">
              <div class="w-1 h-1 rounded-full bg-blue-600 animate-pulse"></div>
              <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Shot on iPhone 15 Pro</span>
            </div>
          </div>
        ` : `<div class="p-6 text-center text-slate-300 text-xs italic">이미지 생성 대기 중...</div>`;
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
      showToast("복사되었습니다!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) { alert("복사 실패"); }
  };

  return (
    <div className="h-full flex flex-col bg-[#F9FAFB] font-pretendard overflow-hidden relative text-left select-none">
      {/* Pretendard 폰트 주입 및 애니메이션 정의 */}
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');
        * { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif !important; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.6s ease-out forwards; }
        .blog-body h2, .blog-body p { opacity: 0; animation: fadeInUp 0.6s ease-out forwards; }
      `}</style>

      {toastMsg && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[9999] animate-bounce w-full max-w-[280px] px-4">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-full text-[13px] font-bold shadow-2xl flex items-center justify-center gap-2 border border-slate-700 backdrop-blur-md">
            <CheckCircle2 size={16} className="text-green-400" /> {toastMsg}
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if(step === 'keyword') navigate('/dashboard');
              else if(step === 'title') setStep('keyword');
              else if(step === 'index') setStep('title');
              else setStep('index');
            }} 
            className="p-1.5 hover:bg-slate-50 rounded-lg active:scale-90 transition-all border border-transparent"
          >
            <ArrowLeft size={20} className="text-slate-500" />
          </button>
          <div className="text-left">
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tighter uppercase italic leading-none">GLUNEX <span className="text-blue-600">AI</span></h1>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.1em] mt-1">Marketing Agent Pro</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 shadow-inner">
          {weather.status === 'rain' ? <CloudRain size={14} className="text-blue-500" /> : <Sun size={14} className="text-orange-400" />}
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{weather.desc} {weather.temp}°C</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-5 space-y-6 pb-40">
        
        {loading ? (
          <div className="flex flex-col h-full items-center justify-center animate-fade-in py-20 text-center">
            <div className="relative mb-10">
              <div className="w-20 h-20 border-[5px] border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-pulse" size={24} />
            </div>
            <p className="text-sm text-slate-800 font-bold leading-relaxed whitespace-pre-line px-6">{loadingMsg}</p>
          </div>
        ) : step === 'keyword' ? (
          <>
            {/* 날씨 인사이트 섹션 */}
            <section className="animate-fade-in">
              <div className={`p-6 rounded-[2.5rem] border-2 transition-all duration-700 shadow-xl ${isWeatherEnabled ? 'bg-blue-600 border-blue-400 text-white shadow-blue-200/40' : 'bg-white border-slate-200 text-slate-900'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isWeatherEnabled ? 'bg-white/20' : 'bg-blue-50'}`}>
                       <Zap size={20} className={isWeatherEnabled ? 'text-white' : 'text-blue-600'} />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-black uppercase tracking-tight leading-none">날씨 인사이트</h2>
                      <p className={`text-[8px] font-bold uppercase mt-1 tracking-widest ${isWeatherEnabled ? 'text-blue-200' : 'text-slate-400'}`}>Environment Sync</p>
                    </div>
                  </div>
                  <button onClick={() => setIsWeatherEnabled(!isWeatherEnabled)} className={`w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner ${isWeatherEnabled ? 'bg-white/30' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg transition-all ${isWeatherEnabled ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
                <p className="text-[13px] font-medium opacity-95 leading-relaxed tracking-tight border-t border-white/10 pt-4">
                   {isWeatherEnabled ? `현재 '${weather.desc}' 날씨를 분석하여 고객이 가장 반응할 마케팅 문구를 생성합니다.` : "모든 상황에 적합한 범용 마케팅 원고를 생성합니다."}
                </p>
              </div>
            </section>

            {/* 품목 선택 섹션 */}
            <section className="space-y-4 animate-fade-in pb-10">
              <div className="flex items-center justify-between px-1">
                 <h2 className="text-lg font-extrabold text-slate-900 tracking-tighter flex items-center gap-2 uppercase italic">
                    <Target size={20} className="text-blue-600" /> 시공 품목 선택
                 </h2>
                 <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100 uppercase">Multiple</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {categories.map((cat) => (
                  <button 
                    key={cat.id} 
                    onClick={() => setSelectedTopics(p => p.includes(cat.id) ? p.filter(t => t !== cat.id) : [...p, cat.id])}
                    className={`relative py-5 px-1 rounded-2xl border-2 transition-all duration-300 text-center ${
                      selectedTopics.includes(cat.id)
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.03] font-bold'
                        : 'bg-white border-white text-slate-500 hover:border-blue-100 shadow-sm text-[13px] font-bold'
                    }`}
                  >
                    {cat.name}
                    {selectedTopics.includes(cat.id) && (
                       <div className="absolute top-2 right-2 text-blue-400">
                          <CheckCircle2 size={12} fill="currentColor" className="text-white shadow-sm" />
                       </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : step === 'title' ? (
          <section className="space-y-6 animate-fade-in text-left">
            <div className="flex items-center justify-between px-1">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                   <div className="bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase shadow-md tracking-wider flex items-center gap-1">
                      <Sparkles size={10} fill="currentColor" /> Ai Best Choice
                   </div>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tighter leading-tight italic">제목을 선택하세요</h2>
              </div>
              <button onClick={handleGenerateTitles} className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-all active:scale-95 shadow-sm group">
                <RefreshCw size={20} className="group-active:rotate-180 transition-transform" />
              </button>
            </div>
            <div className="space-y-3">
              {titles.map((t, i) => (
                <button key={i} onClick={() => handleGenerateIndex(t)}
                  className="w-full text-left p-5 rounded-2xl bg-white border border-slate-50 hover:border-blue-500 transition-all active:scale-[0.98] group relative overflow-hidden shadow-sm border-l-[6px] border-l-blue-600/10 hover:border-l-blue-600"
                >
                  <p className="text-[15px] font-bold text-slate-800 leading-snug group-hover:text-blue-600 tracking-tight z-10 relative">{t}</p>
                </button>
              ))}
            </div>
          </section>
        ) : step === 'index' ? (
          <section className="space-y-8 animate-fade-in">
            <div className="px-1">
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase mb-3 inline-block tracking-widest">Plan Roadmap</span>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tighter leading-tight italic">설계된 글의 흐름입니다</h2>
              <p className="text-[11px] text-slate-400 font-bold border-l-3 border-blue-600 pl-4 leading-relaxed mt-3 uppercase tracking-tighter">Detail-writing with 5 premium iPhone photos.</p>
            </div>
            
            <div className="bg-slate-50 rounded-[2.2rem] border border-slate-100 p-7 space-y-4 shadow-inner relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
               {indexList.map((idx, i) => (
                 <div key={i} className="flex gap-4 items-start group">
                    <div className="w-7 h-7 rounded-xl bg-white border border-slate-200 text-[10px] font-black flex items-center justify-center text-slate-400 shrink-0 group-hover:border-blue-600 group-hover:text-blue-600 transition-all">
                      0{i + 1}
                    </div>
                    <p className="text-sm font-bold text-slate-700 leading-snug tracking-tight pt-1">{idx}</p>
                 </div>
               ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => handleGenerateIndex(selectedTitle)} className="flex-1 py-4.5 bg-white border-2 border-slate-100 rounded-2xl text-slate-500 text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-slate-50">
                <RefreshCw size={16} /> 재생성
              </button>
              <button onClick={handleGenerateFullContent} className="flex-[2.5] py-4.5 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                <FileText size={18} className="text-blue-400" /> 원고 집필 시작
              </button>
            </div>
          </section>
        ) : (
          <section className="space-y-6 animate-fade-in pb-20">
            {/* 채널 탭 선택 */}
            <div className="flex bg-slate-200/50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
              {[
                { id: 'blog', name: '블로그', icon: <Layout size={14}/> },
                { id: 'insta', name: '인스타그램', icon: <Instagram size={14}/> },
                { id: 'short', name: '숏폼대본', icon: <Video size={14}/> }
              ].map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id)} 
                  className={`flex-1 py-3 rounded-xl text-[12px] font-extrabold flex items-center justify-center gap-2 transition-all duration-300 ${
                    activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl scale-[1.02] z-10' : 'text-slate-500'
                  }`}
                >
                  {tab.icon} {tab.name}
                </button>
              ))}
            </div>

            {/* 결과 콘텐츠 카드 */}
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-2xl min-h-[550px] relative overflow-hidden text-left border-t-[8px] border-t-blue-600 animate-fade-in-up">
              <div className="absolute top-6 right-6 z-30">
                <button onClick={handleCopy} className={`p-3.5 rounded-xl border transition-all active:scale-90 shadow-lg ${isCopied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-900 border-slate-800 text-white'}`}>
                  {isCopied ? <Check size={22} /> : <Copy size={22} />}
                </button>
              </div>
              
              <div className="pt-12">
                {activeTab === 'blog' ? (
                  <article className="prose prose-slate max-w-none blog-body">
                    <div className="mb-10 pb-6 border-b border-slate-50">
                        <div className="flex items-center gap-2 mb-3">
                           <Camera size={14} className="text-slate-400" />
                           <span className="text-slate-400 font-bold text-[9px] uppercase tracking-[0.1em]">Naver Search Referenced</span>
                        </div>
                        <h2 className="text-[22px] font-black text-slate-900 leading-[1.3] tracking-tighter italic border-l-[6px] border-blue-600 pl-6">
                           {selectedTitle}
                        </h2>
                    </div>
                    <div className="text-[16px] leading-[2.1] text-slate-700 font-medium space-y-10 tracking-tight" dangerouslySetInnerHTML={{ __html: generatedData.blog_html }} />
                  </article>
                ) : (
                  <div className="pt-6 animate-fade-in-up">
                    <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl mb-8 border border-blue-100 flex items-center gap-3">
                       <Sparkles size={18} className="animate-pulse" />
                       <p className="text-[11px] font-black uppercase tracking-[0.1em]">Social Script Pro</p>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner relative overflow-hidden">
                       <div className="absolute top-0 left-8 w-1 h-10 bg-blue-600 rounded-b-full"></div>
                       <pre className="whitespace-pre-wrap text-[15px] text-slate-800 leading-relaxed font-bold italic tracking-tight">
                          {activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form}
                       </pre>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-20 pt-8 border-t border-slate-50 text-center opacity-30">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.5em]">GLUNEX AI Engine v5.6</p>
              </div>
            </div>
            
            <button onClick={() => { setStep('keyword'); setGeneratedData(null); setTitles([]); setIndexList([]); }} className="w-full py-5 text-slate-400 text-[11px] font-black flex items-center justify-center gap-3 uppercase tracking-[0.3em] bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all">
              <RefreshCw size={16} /> New Project Start
            </button>
          </section>
        )}
      </main>

      {/* 하단 고정 액션 바 */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-3xl border-t border-slate-100 max-w-md mx-auto z-40 shadow-[0_-15px_40px_rgba(0,0,0,0.04)]">
        {step === 'keyword' && (
          <button 
            onClick={handleGenerateTitles} 
            disabled={selectedTopics.length === 0} 
            className={`w-full py-4.5 rounded-[2.2rem] font-extrabold text-base flex items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl ${
              selectedTopics.length > 0 ? 'bg-slate-900 text-white shadow-slate-900/40' : 'bg-slate-100 text-slate-300 border border-slate-200 shadow-none'
            }`}
          >
            <Sparkles size={20} className="animate-pulse text-amber-400" /> 
            제목 생성하기 
            <ArrowRight size={18} />
          </button>
        )}
        {step === 'result' && (
           <div className="flex gap-3">
              <button onClick={handleCopy} className="flex-[2.5] py-4.5 bg-slate-900 text-white rounded-[2rem] font-bold text-base shadow-xl active:scale-95 flex items-center justify-center gap-3 transition-all">
                 {isCopied ? <CheckCircle2 size={20} className="text-green-400"/> : <Copy size={20}/>} {isCopied ? '복사 완료' : '전체 내용 복사'}
              </button>
              <button onClick={() => setStep('keyword')} className="flex-1 py-4.5 bg-white border-2 border-slate-900 text-slate-900 rounded-[2rem] font-bold text-[14px] active:scale-95 transition-all">초기화</button>
           </div>
        )}
      </footer>
    </div>
  );
};

export default Creator;