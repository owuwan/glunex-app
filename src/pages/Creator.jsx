import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, CloudRain, Sun, Snowflake, Cloud, 
  CheckCircle2, Zap, Layout, Instagram, Video, 
  Copy, Check, ArrowLeft, ArrowRight, RefreshCw,
  Wand2, Target, PenTool, Hash, Info, Star
} from 'lucide-react';

/**
 * [글루넥스 AI 마스터 프롬프트]
 */
const SYSTEM_PROMPT = `
당신은 대한민국 최고의 자동차 디테일링 전문 마케터이자 '글루넥스(GLUNEX)'의 수석 카피라이터입니다.
사용자가 선택한 [시공 항목]과 [현재 날씨]를 분석하여 네이버 블로그, 인스타그램, 숏폼 대본을 작성하세요.

[지시사항]
1. 제목(titles): 고객의 클릭을 유도하는 제목 5개. 날씨 상황을 언급하여 시급함을 강조.
2. 블로그(blog_html): 전문직 어조. HTML 태그(h2, p, br, strong, ul, li) 사용 필수.
3. 인스타그램(insta_text): 해시태그(#)와 이모지 사용.
4. 숏폼(short_form): 15초 내외의 빠른 템포 대본.

반드시 다른 설명 없이 순수 JSON 구조로만 응답하세요:
{
  "titles": ["제목1", "제목2", "제목3", "제목4", "제목5"],
  "blog_html": "HTML 내용",
  "insta_text": "인스타 내용",
  "short_form": "숏폼 대본"
}
`;

const App = ({ userStatus }) => {
  const navigate = useNavigate();
  
  // --- 상태 관리 ---
  const [step, setStep] = useState('keyword'); 
  const [loading, setLoading] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isWeatherEnabled, setIsWeatherEnabled] = useState(true);
  const [weather, setWeather] = useState({ status: 'clear', desc: '맑음', temp: 0, loading: true });
  const [generatedData, setGeneratedData] = useState(null);
  const [activeTab, setActiveTab] = useState('blog');
  const [isCopied, setIsCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // --- 실시간 날씨 연동 ---
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid=${API_KEY}&units=metric&lang=kr`
        );
        const data = await response.json();
        if (data.cod === 200) {
          const main = data.weather[0].main.toLowerCase();
          let status = 'clear';
          if (main.includes('rain')) status = 'rain';
          else if (main.includes('snow')) status = 'snow';
          else if (main.includes('cloud')) status = 'cloud';
          setWeather({ status, desc: data.weather[0].description, temp: Math.round(data.main.temp), loading: false });
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

  const extractJson = (text) => {
    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}') + 1;
      return JSON.parse(text.substring(start, end));
    } catch (e) { return null; }
  };

  const handleGenerate = async () => {
    if (selectedTopics.length === 0) return alert("주제를 선택해주세요.");
    if (userStatus !== 'approved') {
      if(window.confirm("🔒 프리미엄 파트너 전용 기능입니다.\n승인 페이지로 이동할까요?")) navigate('/mypage');
      return;
    }

    setLoading(true);
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY; 
    const selectedNames = categories.filter(c => selectedTopics.includes(c.id)).map(c => c.name).join(', ');
    const weatherInfo = isWeatherEnabled ? `날씨: ${weather.desc}, 온도: ${weather.temp}도` : "날씨무관";
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `매장: GLUNEX, 시공: ${selectedNames}, ${weatherInfo}.` }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      const resData = await response.json();
      const content = extractJson(resData.candidates[0].content.parts[0].text);
      if (!content) throw new Error();
      setGeneratedData(content);
      setStep('title');
    } catch (e) {
      alert("AI 생성 중 일시적 오류가 발생했습니다.");
    } finally { setLoading(false); }
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
    const cls = "text-slate-500";
    switch(status) {
      case 'rain': return <CloudRain size={16} className="text-blue-500" />;
      case 'snow': return <Snowflake size={16} className="text-blue-300" />;
      case 'cloud': return <Cloud size={16} className={cls} />;
      default: return <Sun size={16} className="text-orange-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white items-center justify-center animate-fade-in font-noto p-8 text-center">
        <div className="relative mb-8">
          <div className="w-20 h-20 border-[5px] border-slate-50 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-pulse" size={24} />
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight italic uppercase">Glunex <span className="text-blue-600">Ai</span> Agent</h2>
        <p className="text-sm text-slate-400 font-bold mt-4">데이터를 분석하여 최적의 원고를 집필 중입니다.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white font-noto overflow-hidden relative text-left">
      {toastMsg && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[9999] animate-bounce">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-full text-xs font-black shadow-2xl flex items-center gap-2 border border-slate-700">
            <CheckCircle2 size={14} className="text-green-400" /> {toastMsg}
          </div>
        </div>
      )}

      {/* 헤더: 더 얇고 깔끔하게 */}
      <header className="px-5 py-4 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => step === 'keyword' ? navigate('/dashboard') : setStep('keyword')} className="p-1.5 hover:bg-slate-50 rounded-lg active:scale-90 transition-all">
            <ArrowLeft size={20} className="text-slate-400" />
          </button>
          <h1 className="text-lg font-black text-slate-900 tracking-tighter uppercase italic leading-none">Glunex <span className="text-blue-600">Ai</span></h1>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
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
              <div className={`p-5 rounded-3xl border-2 transition-all duration-500 ${isWeatherEnabled ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-100 text-white' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap size={18} className={isWeatherEnabled ? 'text-blue-200' : 'text-blue-600'} />
                    <h2 className="text-xs font-black uppercase tracking-widest">날씨 동기화</h2>
                  </div>
                  <button onClick={() => setIsWeatherEnabled(!isWeatherEnabled)}
                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isWeatherEnabled ? 'bg-white/30' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm ${isWeatherEnabled ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
                <p className="text-[11px] font-bold leading-relaxed opacity-90">
                  {isWeatherEnabled ? `현재 '${weather.desc}' 날씨에 최적화된 마케팅을 제안합니다.` : "일반적인 상황의 마케팅 원고를 생성합니다."}
                </p>
              </div>
            </section>

            <section className="space-y-4 animate-fade-in">
              <h2 className="text-sm font-black text-slate-400 tracking-widest uppercase px-1">Subjects</h2>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setSelectedTopics(p => p.includes(cat.id) ? p.filter(t => t !== cat.id) : [...p, cat.id])}
                    className={`relative py-5 rounded-2xl border-2 transition-all text-center ${
                      selectedTopics.includes(cat.id)
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.03] z-10 font-bold'
                        : 'bg-white border-slate-50 text-slate-500 text-[13px] font-bold'
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

        {step === 'title' && generatedData && (
          <section className="space-y-6 animate-fade-in">
            <div className="px-1">
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase mb-2 inline-block">Ai Choice</span>
              <h2 className="text-xl font-black text-slate-900 tracking-tighter leading-tight italic">제목을 선택하세요</h2>
            </div>
            <div className="space-y-3">
              {generatedData.titles.map((t, i) => (
                <button key={i} onClick={() => { setGeneratedData(p => ({ ...p, currentTitle: t })); setStep('result'); }}
                  className="w-full text-left p-5 rounded-3xl bg-slate-50 border border-slate-100 hover:border-blue-500 transition-all active:scale-[0.98] group"
                >
                  <p className="text-[14px] font-bold text-slate-800 leading-snug group-hover:text-blue-600 tracking-tight">{t}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 'result' && generatedData && (
          <section className="space-y-4 animate-fade-in pb-10">
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              {[{ id: 'blog', name: '블로그' }, { id: 'insta', name: '인스타' }, { id: 'short', name: '숏폼' }].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2.5 rounded-xl text-[12px] font-black transition-all ${
                    activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl min-h-[450px] relative overflow-hidden text-left">
              <button onClick={handleCopy} className={`absolute top-5 right-5 p-3 rounded-xl border transition-all active:scale-90 ${isCopied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-900 border-slate-800 text-white shadow-lg'}`}>
                {isCopied ? <Check size={18} /> : <Copy size={18} />}
              </button>
              <div className="pt-10">
                {activeTab === 'blog' ? (
                  <article className="prose prose-slate max-w-none">
                    <h2 className="text-lg font-black text-slate-900 italic border-l-4 border-blue-600 pl-4 mb-8 leading-tight">{generatedData.currentTitle}</h2>
                    <div className="text-[14px] leading-relaxed text-slate-600 font-medium space-y-6" dangerouslySetInnerHTML={{ __html: generatedData.blog_html }} />
                  </article>
                ) : (
                  <pre className="whitespace-pre-wrap font-noto text-[14px] text-slate-800 leading-relaxed font-bold italic bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    {activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form}
                  </pre>
                )}
              </div>
            </div>
            <button onClick={() => setStep('keyword')} className="w-full py-4 text-slate-400 text-[11px] font-black flex items-center justify-center gap-2 uppercase tracking-widest">
              <RefreshCw size={14} /> New Content
            </button>
          </section>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-2xl border-t border-slate-50 max-w-md mx-auto z-40">
        {step === 'keyword' ? (
          <button onClick={handleGenerate} disabled={selectedTopics.length === 0}
            className={`w-full py-5 rounded-3xl font-black text-[15px] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${
              selectedTopics.length > 0 ? 'bg-slate-900 text-white shadow-slate-900/20' : 'bg-slate-100 text-slate-300'
            }`}
          >
            <Sparkles size={18} className="animate-pulse text-amber-400" /> 제목 생성하기 <ArrowRight size={18} />
          </button>
        ) : step === 'result' ? (
          <div className="flex gap-2">
            <button onClick={handleCopy} className="flex-[2] py-5 bg-slate-900 text-white rounded-3xl font-black text-[15px] shadow-xl active:scale-95 flex items-center justify-center gap-2">
              {isCopied ? <CheckCircle2 size={18} /> : <Copy size={18} />} 전체 복사하기
            </button>
            <button onClick={() => setStep('keyword')} className="flex-1 py-5 bg-white border-2 border-slate-900 text-slate-900 rounded-3xl font-black text-[15px] active:scale-95">다시쓰기</button>
          </div>
        ) : null}
      </footer>
    </div>
  );
};

export default App;