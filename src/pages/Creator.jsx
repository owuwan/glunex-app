import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, CloudRain, Sun, Snowflake, Cloud, 
  CheckCircle2, Zap, Layout, Instagram, Video, 
  Copy, Check, ArrowLeft, ArrowRight, RefreshCw,
  Target, ListOrdered, FileText, MousePointer2,
  Image as ImageIcon, Loader2, Camera
} from 'lucide-react';

/**
 * [AI 프롬프트 설정]
 */
const SYSTEM_PROMPT_TITLES = `
당신은 대한민국 최고의 자동차 디테일링 전문 마케터입니다.
[시공 항목]과 [날씨]를 분석하여 고객의 클릭을 유도하는 제목 5개를 작성하세요.
절대로 '글루넥스', 'GLUNEX' 또는 특정 브랜드/매장 이름을 언급하지 마세요.
반드시 JSON 구조로만 응답하세요: { "titles": ["제목1", "제목2", "제목3", "제목4", "제목5"] }
`;

const SYSTEM_PROMPT_INDEX = `
선택된 제목을 바탕으로 네이버 블로그에 최적화된 5단계 목차를 구성하세요.
전문성과 SEO(검색엔진최적화)를 강조하되, 절대로 매장명이나 브랜드를 언급하지 마세요.
반드시 JSON 구조로만 응답하세요: { "index": ["1. 목차내용", "2. 목차내용", "3. 목차내용", "4. 목차내용", "5. 목차내용"] }
`;

const SYSTEM_PROMPT_CONTENT = `
당신은 자동차 디테일링 전문가입니다. 선정된 5개 목차를 바탕으로 블로그 본문, 인스타 문구, 숏폼 대본, 그리고 이미지 생성을 위한 프롬프트를 작성하세요.

[필수 지시사항]
1. 블로그 본문 (blog_html): 
   - 각 5개의 목차별로 본문 내용은 공백 제외 450자에서 550자 사이로 매우 상세하게 작성하세요. (전체 최소 2,250자 이상)
   - 각 목차 섹션이 끝날 때마다 [[image_1]], [[image_2]], [[image_3]], [[image_4]], [[image_5]] 태그를 순서대로 배치하세요.
   - 절대로 '글루넥스', 'GLUNEX' 등 상호명을 언급하지 마세요.
   - HTML 태그(h2, p, br, strong)를 사용하세요.
2. 이미지 프롬프트 (image_prompts):
   - 각 목차의 주제에 어울리는 영문 프롬프트 5개를 작성하세요.
   - 스타일 가이드: "Premium Korean car detailing studio background, shot on iPhone 15 Pro, 24mm lens, natural lighting, hyper-realistic, 8k, no text, no logo" 키워드를 반드시 포함하세요.

[출력 형식]
JSON 구조로만 응답하세요:
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
    if (!apiKey) return `https://placehold.co/800x600/f1f5f9/64748b?text=API+Key+Missing`;
    
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
      if (!response.ok) throw new Error();
      const data = await response.json();
      return data.images[0].url;
    } catch (e) {
      return `https://placehold.co/800x600/f1f5f9/64748b?text=Generation+Error`;
    }
  };

  // 1단계: 제목 생성
  const handleGenerateTitles = async () => {
    if (selectedTopics.length === 0) return alert("주제를 선택해주세요.");
    setLoading(true);
    setLoadingMsg("제목을 짓고 있습니다...");
    try {
      const selectedNames = categories.filter(c => selectedTopics.includes(c.id)).map(c => c.name).join(', ');
      const weatherInfo = isWeatherEnabled ? `날씨: ${weather.desc}` : "날씨무관";
      const data = await callGemini(`시공: ${selectedNames}, ${weatherInfo}`, SYSTEM_PROMPT_TITLES);
      setTitles(data.titles);
      setStep('title');
    } catch (e) { alert("오류 발생"); }
    finally { setLoading(false); }
  };

  // 2단계: 목차 생성
  const handleGenerateIndex = async (title) => {
    setSelectedTitle(title);
    setLoading(true);
    setLoadingMsg("SEO에 맞게 목차를 짓고 있습니다...");
    try {
      const data = await callGemini(`제목: ${title}`, SYSTEM_PROMPT_INDEX);
      setIndexList(data.index);
      setStep('index');
    } catch (e) { alert("목차 생성 실패"); }
    finally { setLoading(false); }
  };

  // 3단계: 최종 본문 생성
  const handleGenerateFullContent = async () => {
    setLoading(true);
    setLoadingMsg("이미지와 글을 만들고 있습니다...");
    try {
      const prompt = `제목: ${selectedTitle}\n목차: ${indexList.join(', ')}`;
      const data = await callGemini(prompt, SYSTEM_PROMPT_CONTENT);
      
      const imagePrompts = [data.image_prompts.p1, data.image_prompts.p2, data.image_prompts.p3, data.image_prompts.p4, data.image_prompts.p5];
      const images = await Promise.all(imagePrompts.map(p => callFalAI(p)));

      let finalHtml = data.blog_html;
      images.forEach((url, i) => {
        const replacement = `
          <div class="my-8 rounded-[2rem] overflow-hidden border border-slate-100 shadow-lg bg-slate-50">
            <img src="${url}" class="w-full h-auto block" alt="Step ${i+1}" />
            <div class="p-3 bg-white text-center border-t border-slate-50 flex items-center justify-center gap-2">
              <div class="w-1 h-1 rounded-full bg-blue-600 animate-pulse"></div>
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Shot on iPhone 15 Pro</span>
            </div>
          </div>
        `;
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
      showToast("복사되었습니다!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e) { alert("복사 실패"); }
  };

  const getWeatherIcon = (status) => {
    switch(status) {
      case 'rain': return <CloudRain size={16} className="text-blue-500" />;
      case 'snow': return <Snowflake size={16} className="text-blue-300" />;
      case 'cloud': return <Cloud size={16} className="text-slate-400" />;
      default: return <Sun size={16} className="text-orange-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white items-center justify-center animate-fade-in p-10 text-center">
        <div className="relative mb-8">
          <div className="w-16 h-16 border-[4px] border-slate-50 border-t-blue-600 rounded-full animate-spin mx-auto shadow-sm"></div>
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-pulse" size={24} />
        </div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight italic uppercase mb-2">Glunex <span className="text-blue-600">Ai</span> Agent</h2>
        <div className="space-y-2">
            <p className="text-sm text-slate-600 font-bold">{loadingMsg}</p>
            <p className="text-[9px] text-slate-300 font-black tracking-widest uppercase">Processing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white font-noto overflow-hidden relative text-left">
      {toastMsg && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[9999] animate-bounce px-4 w-full max-w-xs">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-full text-xs font-black shadow-2xl flex items-center justify-center gap-2 border border-slate-700 backdrop-blur-md">
            <CheckCircle2 size={14} className="text-green-400" /> {toastMsg}
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="px-5 py-4 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => {
            if (step === 'keyword') navigate('/dashboard');
            else if (step === 'title') setStep('keyword');
            else if (step === 'index') setStep('title');
            else setStep('index');
          }} className="p-1.5 hover:bg-slate-50 rounded-lg transition-all border border-transparent">
            <ArrowLeft size={20} className="text-slate-400" />
          </button>
          <h1 className="text-lg font-black text-slate-900 tracking-tighter uppercase italic leading-none">Glunex <span className="text-blue-600">Ai</span></h1>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 shadow-inner">
          {getWeatherIcon(weather.status)}
          <span className="text-[10px] font-black text-slate-600 uppercase">
            {weather.loading ? '...' : `${weather.desc} ${weather.temp}°C`}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-5 space-y-6 pb-40">
        
        {step === 'keyword' && (
          <>
            <section className="animate-fade-in">
              <div className={`p-6 rounded-[2rem] border-2 transition-all duration-700 shadow-xl ${isWeatherEnabled ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Zap size={18} className={isWeatherEnabled ? 'text-blue-200' : 'text-blue-600'} />
                    <h2 className="text-xs font-black uppercase tracking-widest leading-none">날씨 동기화</h2>
                  </div>
                  <button onClick={() => setIsWeatherEnabled(!isWeatherEnabled)} className={`w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner ${isWeatherEnabled ? 'bg-white/30' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all ${isWeatherEnabled ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
                <p className="text-[12px] font-bold opacity-95">
                  {isWeatherEnabled ? `오늘 '${weather.desc}' 날씨에 최적화된 마케팅 원고를 생성합니다.` : "날씨 상황과 무관한 일반 마케팅 원고를 생성합니다."}
                </p>
              </div>
            </section>

            <section className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-[11px] font-black text-slate-400 tracking-widest uppercase">Subject Select</h2>
                <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">Multiple</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setSelectedTopics(p => p.includes(cat.id) ? p.filter(t => t !== cat.id) : [...p, cat.id])}
                    className={`relative py-5 rounded-2xl border-2 transition-all text-center ${
                      selectedTopics.includes(cat.id)
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.03] z-10 font-bold'
                        : 'bg-white border-white text-slate-500 shadow-sm text-[13px] font-bold'
                    }`}
                  >
                    {cat.name}
                    {selectedTopics.includes(cat.id) && <CheckCircle2 size={12} className="absolute top-1.5 right-1.5 text-blue-400" fill="currentColor" />}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {step === 'title' && (
          <section className="space-y-6 animate-fade-in text-left">
            <div className="flex items-center justify-between px-1">
              <div>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase mb-1 inline-block tracking-tighter">Ai Optimized</span>
                <h2 className="text-xl font-black text-slate-900 tracking-tighter leading-tight italic">제목을 선택하세요</h2>
              </div>
              <button onClick={handleGenerateTitles} className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95 shadow-sm">
                <RefreshCw size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {titles.map((t, i) => (
                <button key={i} onClick={() => handleGenerateIndex(t)}
                  className="w-full text-left p-5 rounded-2xl bg-white border border-slate-50 hover:border-blue-500 transition-all active:scale-[0.98] group relative overflow-hidden shadow-sm"
                >
                  <p className="text-[14px] font-bold text-slate-800 leading-tight group-hover:text-blue-600 z-10 relative">{t}</p>
                  <MousePointer2 className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-100 opacity-0 group-hover:opacity-100 transition-all" size={24} />
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 'index' && (
          <section className="space-y-6 animate-fade-in">
            <div className="px-1">
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase mb-1 inline-block">5-Step Plan</span>
              <h2 className="text-xl font-black text-slate-900 tracking-tighter leading-tight italic mb-2">포스팅 흐름 확인</h2>
              <p className="text-[11px] text-slate-400 font-bold border-l-2 border-blue-600 pl-3 leading-relaxed uppercase tracking-tighter">Each section includes 500+ characters & iPhone quality shots.</p>
            </div>
            
            <div className="bg-slate-50 rounded-[2rem] border border-slate-100 p-6 space-y-4 shadow-inner">
               {indexList.map((idx, i) => (
                 <div key={i} className="flex gap-4 items-start group">
                    <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-[9px] font-black flex items-center justify-center text-slate-400 shrink-0 group-hover:border-blue-600 group-hover:text-blue-600 transition-all shadow-sm">
                      0{i + 1}
                    </div>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed tracking-tight">{idx}</p>
                 </div>
               ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => handleGenerateIndex(selectedTitle)} className="flex-1 py-4 bg-white border border-slate-100 rounded-2xl text-slate-400 text-xs font-black flex items-center justify-center gap-2 active:scale-95 transition-all">
                <RefreshCw size={14} /> 재생성
              </button>
              <button onClick={handleGenerateFullContent} className="flex-[2.2] py-4 bg-slate-900 text-white rounded-2xl text-xs font-black shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2 active:scale-95 transition-all">
                <FileText size={16} /> 이대로 작성 시작
              </button>
            </div>
          </section>
        )}

        {step === 'result' && generatedData && (
          <section className="space-y-5 animate-fade-in pb-20">
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
              {[{ id: 'blog', name: '블로그' }, { id: 'insta', name: '인스타' }, { id: 'short', name: '숏폼대본' }].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 rounded-xl text-[12px] font-black transition-all ${
                    activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl scale-[1.02] z-10' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-2xl min-h-[500px] relative overflow-hidden text-left border-t-[8px] border-t-blue-600">
              <div className="absolute top-6 right-6 z-30">
                <button onClick={handleCopy} className={`p-3.5 rounded-2xl border transition-all active:scale-90 shadow-xl ${isCopied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-900 border-slate-800 text-white'}`}>
                  {isCopied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              
              <div className="pt-12">
                {activeTab === 'blog' ? (
                  <article className="prose prose-slate max-w-none font-noto">
                    <h2 className="text-xl font-black text-slate-900 italic border-l-[6px] border-blue-600 pl-5 mb-10 leading-tight tracking-tighter">{selectedTitle}</h2>
                    <div className="text-[14px] leading-relaxed text-slate-600 font-medium space-y-10 tracking-tight" dangerouslySetInnerHTML={{ __html: generatedData.blog_html }} />
                  </article>
                ) : (
                  <div className="pt-6">
                    <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl mb-6 border border-blue-100 flex items-center gap-3">
                       <Camera size={16} className="animate-pulse" />
                       <p className="text-[10px] font-black uppercase tracking-widest leading-none">iPhone Style Content Active</p>
                    </div>
                    <pre className="whitespace-pre-wrap font-noto text-[14px] text-slate-800 leading-relaxed font-bold italic bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                      {activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form}
                    </pre>
                  </div>
                )}
              </div>
              
              <div className="mt-20 pt-6 border-t border-slate-50 text-center opacity-30">
                 <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.4em]">Engine v4.1 • Premium AI Agent</p>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-3xl border-t border-slate-100 max-w-md mx-auto z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
        {step === 'keyword' && (
          <button onClick={handleGenerateTitles} disabled={selectedTopics.length === 0}
            className={`w-full py-5 rounded-[2rem] font-black text-[15px] flex items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl ${
              selectedTopics.length > 0 ? 'bg-slate-900 text-white shadow-slate-900/30 hover:bg-slate-800' : 'bg-slate-100 text-slate-300'
            }`}
          >
            <Sparkles size={20} className="animate-pulse text-amber-400" /> 제목 생성하기 <ArrowRight size={18} />
          </button>
        )}
        {step === 'result' && (
           <div className="flex gap-2.5">
              <button onClick={handleCopy} className="flex-[2.2] py-5 bg-slate-900 text-white rounded-[2rem] font-black text-[15px] shadow-2xl active:scale-95 flex items-center justify-center gap-3">
                 {isCopied ? <Check size={20} /> : <Copy size={20} />} {isCopied ? '복사 완료' : '전체 내용 복사'}
              </button>
              <button onClick={() => setStep('keyword')} className="flex-1 py-5 bg-white border border-slate-200 rounded-[2rem] text-slate-400 font-black text-[14px] active:scale-95 transition-all">초기화</button>
           </div>
        )}
      </footer>
    </div>
  );
};

export default Creator;