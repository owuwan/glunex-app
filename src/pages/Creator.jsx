import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, CloudRain, Sun, Snowflake, Cloud, 
  CheckCircle2, Zap, Layout, Instagram, Video, 
  Copy, Check, ArrowLeft, ArrowRight, RefreshCw,
  Target, ListOrdered, FileText, MousePointer2,
  Camera, Wand2, Info, Eye, Smartphone
} from 'lucide-react';

/**
 * [AI 프롬프트 설정]
 * 브랜드 언급 금지 및 집필 분량을 엄격하게 통제합니다.
 */
const SYSTEM_PROMPT_TITLES = `
당신은 대한민국 최고의 자동차 디테일링 전문 마케터입니다.
[시공 항목]과 [날씨]를 분석하여 고객의 클릭을 유도하는 트렌디한 제목 5개를 작성하세요.
상호명(예: 글루넥스, GLUNEX 등)은 절대로 언급하지 마세요. 오직 시공 서비스의 가치에 집중하세요.
반드시 JSON 구조로만 응답하세요: { "titles": ["제목1", "제목2", "제목3", "제목4", "제목5"] }
`;

const SYSTEM_PROMPT_INDEX = `
선택된 제목을 바탕으로 네이버 블로그에 최적화된 전문적인 5단계 목차를 구성하세요.
브랜드명은 절대 포함하지 마세요. SEO 최적화된 정보성 목차여야 합니다.
반드시 JSON 구조로만 응답하세요: { "index": ["1. 목차내용", "2. 목차내용", "3. 목차내용", "4. 목차내용", "5. 목차내용"] }
`;

const SYSTEM_PROMPT_CONTENT = `
당신은 자동차 디테일링 전문가입니다. 선정된 5개 목차를 바탕으로 블로그 본문, 인스타 문구, 숏폼 대본, 그리고 이미지 생성을 위한 프롬프트를 작성하세요.

[지시사항]
1. 블로그 본문 (blog_html): 
   - 각 목차별 본문 내용은 공백 제외 450~550자 사이로 아주 상세하게 작성하세요. (전체 2,250자 이상 필수)
   - 각 목차 섹션이 끝나는 지점에 [[image_1]], [[image_2]], [[image_3]], [[image_4]], [[image_5]] 태그를 순서대로 하나씩 배치하세요.
   - 상호명(글루넥스, GLUNEX 등)은 절대로 언급하지 마세요. 전문적인 용어와 공정 설명을 사용하세요.
   - HTML 태그(h2, p, br, strong)를 사용하세요. h2는 목차 제목으로 사용하세요.
2. 이미지 프롬프트 (image_prompts):
   - 각 목차 주제에 맞는 구체적인 영문 프롬프트 5개를 작성하세요 (p1~p5).
   - 스타일 가이드: "Premium Korean car detailing shop indoor, shot on iPhone 15 Pro, 24mm lens, natural lighting, hyper-realistic, 8k, no text, no logo"

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
    if (selectedTopics.length === 0) return alert("항목을 선택해주세요.");
    setLoading(true);
    setLoadingMsg("대한민국 상위 1%의 클릭을 유도하는\n트렌디한 헤드라인을 설계 중입니다...");
    try {
      const selectedNames = categories.filter(c => selectedTopics.includes(c.id)).map(c => c.name).join(', ');
      const data = await callGemini(`시공: ${selectedNames}, 날씨: ${weather.desc}`, SYSTEM_PROMPT_TITLES);
      setTitles(data.titles);
      setStep('title');
    } catch (e) { alert("오류가 발생했습니다."); }
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

  // 3단계: 최종 집필
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
          <div class="my-6 rounded-2xl overflow-hidden border border-slate-100 shadow-lg animate-fade-in-up bg-slate-50">
            <img src="${url}" class="w-full h-auto block" alt="detail" />
            <div class="p-2 bg-white text-center border-t border-slate-50 flex items-center justify-center gap-1.5">
              <div class="w-1 h-1 rounded-full bg-blue-600 animate-pulse"></div>
              <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Shot on iPhone 15 Pro</span>
            </div>
          </div>
        ` : `<div class="p-5 text-center text-slate-300 text-[10px] italic">이미지 로딩 중...</div>`;
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
    } catch (err) { alert("복사 오류"); }
  };

  return (
    <div className="h-full flex flex-col bg-white font-noto overflow-hidden relative text-left">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.6s ease-out forwards; }
        .blog-body h2, .blog-body p { opacity: 0; animation: fadeInUp 0.6s ease-out forwards; }
      `}</style>

      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-bounce w-full max-w-[280px] px-4">
          <div className="bg-slate-900 text-white px-5 py-2.5 rounded-full text-[11px] font-black shadow-xl flex items-center justify-center gap-2 border border-slate-700">
            <CheckCircle2 size={14} className="text-green-400" /> {toastMsg}
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="px-5 py-3 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if(step === 'keyword') navigate('/dashboard');
              else if(step === 'title') setStep('keyword');
              else if(step === 'index') setStep('title');
              else setStep('index');
            }} 
            className="p-1.5 hover:bg-slate-50 rounded-lg active:scale-90 transition-all"
          >
            <ArrowLeft size={18} className="text-slate-400" />
          </button>
          <div className="text-left">
            <h1 className="text-base font-black text-slate-900 tracking-tighter uppercase italic leading-none">Partner <span className="text-blue-600 text-sm">Ai</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-full border border-slate-100 shadow-inner">
          {weather.status === 'rain' ? <CloudRain size={14} className="text-blue-500" /> : <Sun size={14} className="text-orange-400" />}
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight">{weather.desc} {weather.temp}°C</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-5 space-y-5 pb-32">
        
        {loading ? (
          <div className="flex flex-col h-full items-center justify-center animate-fade-in py-20 text-center">
            <div className="relative mb-6">
              <div className="w-14 h-14 border-[4px] border-slate-50 border-t-blue-600 rounded-full animate-spin"></div>
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-pulse" size={18} />
            </div>
            <p className="text-[13px] text-slate-700 font-bold leading-relaxed whitespace-pre-line px-4">{loadingMsg}</p>
          </div>
        ) : step === 'keyword' ? (
          <>
            <section className="animate-fade-in">
              <div className={`p-5 rounded-3xl border-2 transition-all duration-500 shadow-lg ${isWeatherEnabled ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className={isWeatherEnabled ? 'text-blue-200' : 'text-blue-600'} />
                    <h2 className="text-[11px] font-black uppercase tracking-widest leading-none">날씨 인사이트</h2>
                  </div>
                  <button onClick={() => setIsWeatherEnabled(!isWeatherEnabled)} className={`w-10 h-5 rounded-full relative transition-all duration-300 ${isWeatherEnabled ? 'bg-white/30' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-md transition-all ${isWeatherEnabled ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
                <p className="text-[11px] font-bold opacity-90 leading-snug">날씨를 분석하여 방문 유도 효과가 큰 원고를 제안합니다.</p>
              </div>
            </section>

            <section className="space-y-3 animate-fade-in pb-10">
              <h2 className="text-[10px] font-black text-slate-400 tracking-widest uppercase px-1">Subject Selection</h2>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setSelectedTopics(p => p.includes(cat.id) ? p.filter(t => t !== cat.id) : [...p, cat.id])}
                    className={`relative py-4 rounded-xl border-2 transition-all text-center ${
                      selectedTopics.includes(cat.id) ? 'bg-slate-900 border-slate-900 text-white shadow-md scale-[1.03] font-bold' : 'bg-white border-slate-50 text-slate-500 text-[12px] font-bold'
                    }`}>
                    {cat.name}
                    {selectedTopics.includes(cat.id) && <CheckCircle2 size={12} className="absolute top-1 right-1 text-blue-400" fill="currentColor" />}
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : step === 'title' ? (
          <section className="space-y-4 animate-fade-in text-left">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-black text-slate-900 tracking-tighter leading-tight italic underline decoration-blue-500/30 underline-offset-4">제목을 선택하세요</h2>
              <button onClick={handleGenerateTitles} className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 transition-all border border-slate-100 active:scale-95"><RefreshCw size={16} /></button>
            </div>
            <div className="space-y-2.5">
              {titles.map((t, i) => (
                <button key={i} onClick={() => handleGenerateIndex(t)}
                  className="w-full text-left p-4 rounded-2xl bg-white border border-slate-50 hover:border-blue-500 transition-all active:scale-[0.98] group shadow-sm"
                >
                  <p className="text-[13px] font-bold text-slate-800 leading-snug group-hover:text-blue-600 tracking-tight">{t}</p>
                </button>
              ))}
            </div>
          </section>
        ) : step === 'index' ? (
          <section className="space-y-5 animate-fade-in">
            <div className="px-1">
              <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase mb-1.5 inline-block">Plan architecture</span>
              <h2 className="text-base font-black text-slate-900 tracking-tighter leading-tight italic">설계된 글의 흐름입니다</h2>
            </div>
            
            <div className="bg-slate-50 rounded-3xl border border-slate-100 p-6 space-y-4 shadow-inner">
               {indexList.map((idx, i) => (
                 <div key={i} className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-[9px] font-black flex items-center justify-center text-slate-400 shrink-0">0{i + 1}</div>
                    <p className="text-[13px] font-bold text-slate-700 leading-snug tracking-tight pt-0.5">{idx}</p>
                 </div>
               ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => handleGenerateIndex(selectedTitle)} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl text-slate-400 text-[11px] font-black active:scale-95 transition-all flex items-center justify-center gap-1.5"><RefreshCw size={14} /> 재생성</button>
              <button onClick={handleGenerateFullContent} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"><FileText size={16} className="text-blue-400" /> 원고 집필 시작</button>
            </div>
          </section>
        ) : (
          <section className="space-y-4 animate-fade-in pb-20">
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
              {[{ id: 'blog', name: '블로그' }, { id: 'insta', name: '인스타' }, { id: 'short', name: '숏폼대본' }].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>{tab.name}</button>
              ))}
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl min-h-[500px] relative overflow-hidden text-left border-t-[6px] border-t-blue-600 animate-fade-in-up">
              <div className="absolute top-6 right-6 z-30">
                <button onClick={handleCopy} className={`p-2.5 rounded-xl border transition-all active:scale-90 shadow-md ${isCopied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-900 border-slate-800 text-white'}`}>
                  {isCopied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
              
              <div className="pt-10">
                {activeTab === 'blog' ? (
                  <article className="prose prose-slate max-w-none font-noto blog-body">
                    <h2 className="text-lg font-black text-slate-900 italic border-l-[4px] border-blue-600 pl-4 mb-8 leading-tight tracking-tighter">{selectedTitle}</h2>
                    <div className="text-[14px] leading-[1.8] text-slate-600 font-medium space-y-8 tracking-tight" dangerouslySetInnerHTML={{ __html: generatedData.blog_html }} />
                  </article>
                ) : (
                  <div className="pt-6">
                    <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl mb-6 border border-blue-100 flex items-center gap-2 animate-fade-in-up">
                       <Camera size={14} className="animate-pulse" />
                       <p className="text-[9px] font-black uppercase tracking-widest leading-none">iPhone Style Content</p>
                    </div>
                    <pre className="whitespace-pre-wrap font-noto text-[13px] text-slate-800 leading-relaxed font-bold italic bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner animate-fade-in-up">
                       {activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form}
                    </pre>
                  </div>
                )}
              </div>
            </div>
            
            <button onClick={() => { setStep('keyword'); setGeneratedData(null); setTitles([]); setIndexList([]); }} className="w-full py-4 text-slate-400 text-[10px] font-black flex items-center justify-center gap-3 uppercase tracking-[0.4em] bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all active:scale-95"><RefreshCw size={14} /> New Project</button>
          </section>
        )}
      </main>

      {/* 하단 고정 버튼 */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-3xl border-t border-slate-100 max-w-md mx-auto z-40 shadow-sm">
        {step === 'keyword' && (
          <button onClick={handleGenerateTitles} disabled={selectedTopics.length === 0} 
            className={`w-full py-4.5 rounded-2xl font-black text-[14px] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${
              selectedTopics.length > 0 ? 'bg-slate-900 text-white shadow-slate-900/30' : 'bg-slate-100 text-slate-300 border border-slate-200 shadow-none'
            }`}
          >
            <Sparkles size={18} className="animate-pulse text-amber-400" /> 제목 생성하기 <ArrowRight size={18} />
          </button>
        )}
        {step === 'result' && (
           <div className="flex gap-2.5">
              <button onClick={handleCopy} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-[14px] shadow-xl active:scale-95 flex items-center justify-center gap-3 transition-all">
                 {isCopied ? <CheckCircle2 size={20} className="text-green-400"/> : <Copy size={20}/>} 전체 복사
              </button>
              <button onClick={() => setStep('keyword')} className="flex-1 py-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-400 font-black text-[12px] active:scale-95 transition-all">다시</button>
           </div>
        )}
      </footer>
    </div>
  );
};

export default Creator;