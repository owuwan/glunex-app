import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, CloudRain, Sun, Snowflake, Cloud, 
  CheckCircle2, Zap, Layout, Instagram, Video, 
  Copy, Check, ArrowLeft, ArrowRight, RefreshCw,
  Loader2, AlertCircle, Thermometer, Info,
  Smartphone, Monitor, ChevronRight, Wand2
} from 'lucide-react';

/**
 * [글루넥스 AI 마스터 프롬프트]
 */
const SYSTEM_PROMPT = `
당신은 대한민국 최고의 자동차 디테일링 전문 마케터이자 '글루넥스(GLUNEX)'의 수석 카피라이터입니다.
사용자가 선택한 [시공 항목]과 [현재 날씨]를 분석하여 네이버 블로그, 인스타그램, 숏폼 대본을 작성하세요.

[필수 지시사항]
1. 제목(titles): 고객의 클릭을 유도하는 강력한 헤드라인 5개를 작성하세요. 날씨 상황을 반드시 언급하여 시급함을 강조할 것.
2. 블로그(blog_html): 
   - 전문성과 신뢰감이 느껴지는 전문직 어조를 사용하되, 사장님의 친절함과 디테일이 묻어나야 함.
   - HTML 태그(h2, p, br, strong, ul, li 등)를 사용하여 네이버 블로그에 최적화된 가독성 확보.
   - 시공 전(오염), 시공 중(노하우), 시공 후(결과)의 과정을 드라마틱하게 설명.
3. 인스타그램(insta_text): 해시태그(#)와 이모지를 풍부하게 사용하여 방문을 유도하는 감성 마케팅 문구 작성.
4. 숏폼(short_form): 15초 내외의 빠른 템포 편집점과 자막 내용을 포함한 강렬한 후킹 대본.

반드시 다른 설명 없이 아래와 같은 순수 JSON 구조로만 응답하세요:
{
  "titles": ["제목1", "제목2", "제목3", "제목4", "제목5"],
  "blog_html": "HTML 내용",
  "insta_text": "인스타 내용",
  "short_form": "숏폼 대본"
}
`;

const Creator = ({ userStatus }) => {
  const navigate = useNavigate();
  
  const [step, setStep] = useState('keyword'); 
  const [loading, setLoading] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isWeatherEnabled, setIsWeatherEnabled] = useState(true);
  const [weather, setWeather] = useState({ status: 'clear', desc: '맑음', temp: 20, loading: true });
  const [generatedData, setGeneratedData] = useState(null);
  const [activeTab, setActiveTab] = useState('blog');
  const [isCopied, setIsCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const contentRef = useRef(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
        if (!API_KEY) {
          setWeather({ status: 'clear', desc: '맑음', temp: 20, loading: false });
          return;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid=${API_KEY}&units=metric&lang=kr`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        const data = await response.json();
        if (data.cod === 200) {
          const main = data.weather[0].main.toLowerCase();
          let status = 'clear';
          if (main.includes('rain') || main.includes('drizzle') || main.includes('thunderstorm')) status = 'rain';
          else if (main.includes('snow')) status = 'snow';
          else if (main.includes('cloud')) status = 'cloud';
          setWeather({ status, desc: data.weather[0].description, temp: Math.round(data.main.temp), loading: false });
        } else { throw new Error(); }
      } catch (error) {
        setWeather({ status: 'clear', desc: '맑음', temp: 20, loading: false });
      }
    };
    fetchWeather();
  }, []);

  const showLocalToast = (msg) => {
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

  const toggleTopic = (id) => {
    setSelectedTopics(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  // [중요] AI가 보내준 텍스트에서 JSON만 쏙 뽑아내는 안전장치 함수
  const extractJson = (text) => {
    try {
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("JSON 형식을 찾을 수 없음");
      return JSON.parse(text.slice(jsonStart, jsonEnd));
    } catch (e) {
      console.error("JSON 파싱 에러:", e);
      return null;
    }
  };

  const handleGenerate = async () => {
    if (selectedTopics.length === 0) return alert("주제를 하나 이상 선택해주세요.");
    if (userStatus !== 'approved') {
      const go = window.confirm("🔒 AI 마케팅 기능은 '프리미엄 파트너' 전용입니다.\n멤버십 페이지로 이동하여 승인을 요청하시겠습니까?");
      if(go) navigate('/mypage');
      return;
    }

    setLoading(true);
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY; 
    
    if (!apiKey) {
      setLoading(false);
      alert("⚠️ API 키가 설정되지 않았습니다. Vercel 환경 변수를 확인해주세요.");
      return;
    }

    const selectedNames = categories.filter(c => selectedTopics.includes(c.id)).map(c => c.name).join(', ');
    const weatherInfo = isWeatherEnabled ? `상황: 날씨는 ${weather.desc}이고 기온은 ${weather.temp}도입니다.` : "상황: 날씨와 상관없이 일반적인 홍보가 필요합니다.";
    
    const userPrompt = `
      매장명: 글루 디테일링 (GLUNEX)
      시공 항목: ${selectedNames}
      ${weatherInfo}
      요청: 위 조건을 분석하여 블로그 제목 5개와 채널별 원고를 작성해줘.
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { temperature: 0.7 }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error Detail:", errorData);
        throw new Error(errorData.error?.message || "API 호출 실패");
      }

      const resData = await response.json();
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!rawText) throw new Error("AI 응답 내용이 비어있습니다.");

      // 추출 함수 사용 (껍데기 제거)
      const content = extractJson(rawText);
      
      if (!content) {
        throw new Error("AI 응답 형식이 올바르지 않습니다.");
      }
      
      setGeneratedData(content);
      setStep('title');
    } catch (error) {
      console.error("AI 생성 최종 실패:", error);
      alert(`❌ 오류 발생: ${error.message}\n\n잠시 후 '제목 생성하기'를 다시 눌러주세요.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedData) return;
    const text = activeTab === 'blog' ? generatedData.blog_html : (activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form);
    try {
      if (activeTab === 'blog') {
        const blob = new Blob([text], { type: "text/html" });
        await navigator.clipboard.write([new ClipboardItem({ ["text/html"]: blob })]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setIsCopied(true);
      showLocalToast("클립보드에 복사되었습니다!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      alert("복사 실패");
    }
  };

  const getWeatherIcon = (status) => {
    switch(status) {
      case 'rain': return <CloudRain size={20} className="text-blue-500" />;
      case 'snow': return <Snowflake size={20} className="text-blue-300" />;
      case 'cloud': return <Cloud size={20} className="text-slate-400" />;
      default: return <Sun size={20} className="text-orange-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white items-center justify-center animate-fade-in font-noto p-8 text-center">
        <div className="relative mb-10">
          <div className="w-24 h-24 border-[6px] border-slate-100 border-t-blue-600 rounded-full animate-spin mx-auto shadow-inner"></div>
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-pulse" size={28} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">AI 마케팅 원고 집필 중...</h2>
        <div className="space-y-1">
          <p className="text-sm text-slate-500 font-medium leading-relaxed italic">"날씨 데이터를 분석하여 최고의 제목을 추출하고 있습니다."</p>
          <p className="text-[11px] text-slate-400">잠시만 기다려주세요 (약 3~5초 소요)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#F8F9FB] font-noto overflow-hidden relative text-left">
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-bounce">
          <div className="bg-slate-900 text-white px-8 py-4 rounded-3xl text-sm font-bold shadow-2xl flex items-center gap-3 border border-slate-700">
            <CheckCircle2 size={18} className="text-green-400" /> {toastMsg}
          </div>
        </div>
      )}

      <header className="px-6 py-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => step === 'keyword' ? navigate('/dashboard') : setStep('keyword')} className="p-2 hover:bg-slate-100 rounded-xl transition-all group active:scale-90">
            <ArrowLeft size={22} className="text-slate-400 group-hover:text-slate-900" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Glunex <span className="text-blue-600">Ai</span></h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Marketing Agent</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full min-w-[100px] justify-center border border-slate-200 shadow-inner">
          {getWeatherIcon(weather.status)}
          <span className="text-[11px] font-black text-slate-700 uppercase">
            {weather.loading ? 'LOADING' : `${weather.desc} ${weather.temp}°C`}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8 pb-40">
        {step === 'keyword' && (
          <>
            <section className="animate-fade-in text-left">
              <div className={`p-7 rounded-[2.5rem] border-2 transition-all duration-700 shadow-xl ${isWeatherEnabled ? 'bg-blue-600 border-blue-400 shadow-blue-200/50 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Zap size={20} className={isWeatherEnabled ? 'text-blue-200' : 'text-blue-600'} />
                    <h2 className="text-base font-black uppercase tracking-tight">실시간 날씨연동</h2>
                  </div>
                  <button onClick={() => setIsWeatherEnabled(!isWeatherEnabled)}
                    className={`w-14 h-7 rounded-full relative transition-all duration-300 shadow-inner ${isWeatherEnabled ? 'bg-white/30' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-500 shadow-lg ${isWeatherEnabled ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
                <p className="text-xs leading-relaxed opacity-90 font-medium text-left">
                  {isWeatherEnabled 
                    ? `현재 '${weather.desc}' 날씨에 고객이 가장 불안해하거나 필요로 하는 포인트를 분석하여 제목을 생성합니다.` 
                    : "날씨 상황을 배제하고 품목의 장점을 부각하는 마케팅 원고를 생성합니다."}
                </p>
              </div>
            </section>

            <section className="space-y-5 animate-fade-in text-left pb-10">
              <div className="flex items-center justify-between px-2">
                 <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Wand2 size={18} className="text-blue-600" /> 어떤 주제로 글을 쓸까요?
                 </h2>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => toggleTopic(cat.id)}
                    className={`relative py-6 px-2 rounded-2xl border-2 transition-all duration-300 ${
                      selectedTopics.includes(cat.id)
                        ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.05] z-10 font-black'
                        : 'bg-white border-white text-slate-500 hover:border-blue-200 shadow-sm text-[13px] font-bold'
                    }`}
                  >
                    {cat.name}
                    {selectedTopics.includes(cat.id) && (
                      <div className="absolute top-2 right-2 text-blue-400 animate-fade-in">
                        <CheckCircle2 size={14} fill="currentColor" className="text-white shadow-sm" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {step === 'title' && generatedData && (
          <section className="space-y-8 animate-fade-in text-left">
            <div className="px-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">가장 끌리는 제목을<br/>선택해 주세요</h2>
            </div>
            <div className="space-y-4">
              {generatedData.titles.map((title, idx) => (
                <button key={idx} onClick={() => { setGeneratedData(prev => ({ ...prev, currentTitle: title })); setStep('result'); }}
                  className="w-full text-left p-7 rounded-[2.2rem] bg-white border border-slate-100 hover:border-blue-500 hover:shadow-xl transition-all shadow-sm group active:scale-95"
                >
                  <p className="text-base font-black text-slate-800 leading-snug group-hover:text-blue-600 tracking-tight">{title}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setStep('keyword')} className="w-full py-5 text-slate-400 text-xs font-black flex items-center justify-center gap-2 hover:text-slate-900 transition-colors uppercase tracking-widest">
              <RefreshCw size={14} /> 다른 주제 선택
            </button>
          </section>
        )}

        {step === 'result' && generatedData && (
          <section className="space-y-6 animate-fade-in pb-10">
            <div className="flex bg-slate-200/50 p-1.5 rounded-[1.5rem] border border-slate-100 shadow-inner">
              {[
                { id: 'blog', name: '블로그', icon: <Layout size={15}/> },
                { id: 'insta', name: '인스타', icon: <Instagram size={15}/> },
                { id: 'short', name: '숏폼', icon: <Video size={15}/> }
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3.5 rounded-2xl text-[13px] font-black flex items-center justify-center gap-2.5 transition-all ${
                    activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.icon} {tab.name}
                </button>
              ))}
            </div>

            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-2xl min-h-[550px] relative overflow-hidden group">
              <div className="absolute top-8 right-8 z-10">
                <button onClick={handleCopy} className={`p-4 rounded-2xl border transition-all shadow-lg active:scale-90 ${isCopied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-900 border-slate-800 text-white hover:bg-slate-800'}`}>
                  {isCopied ? <Check size={22} /> : <Copy size={22} />}
                </button>
              </div>
              <div className="pt-12 text-left" ref={contentRef}>
                {activeTab === 'blog' ? (
                  <article className="prose prose-slate max-w-none">
                    <div className="mb-10 pb-6 border-b border-slate-50">
                        <h2 className="text-2xl font-black text-slate-900 leading-tight tracking-tighter italic border-l-[6px] border-blue-600 pl-5">{generatedData.currentTitle}</h2>
                    </div>
                    <div className="text-[15px] leading-[1.8] text-slate-700 font-medium space-y-6 font-noto" dangerouslySetInnerHTML={{ __html: generatedData.blog_html }} />
                  </article>
                ) : (
                  <pre className="whitespace-pre-wrap font-noto text-sm text-slate-700 leading-relaxed font-bold bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    {activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form}
                  </pre>
                )}
              </div>
            </div>
            <button onClick={() => setStep('keyword')} className="w-full py-5 bg-white border border-slate-200 text-slate-500 rounded-[1.8rem] font-black text-xs hover:bg-slate-50 transition-all shadow-sm active:scale-[0.98]">
              다시 처음부터 시작하기
            </button>
          </section>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-2xl border-t border-slate-100 max-w-md mx-auto z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
        {step === 'keyword' ? (
          <button onClick={handleGenerate} disabled={selectedTopics.length === 0}
            className={`w-full py-5 rounded-[2.2rem] font-black text-[15px] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${
              selectedTopics.length > 0 ? 'bg-slate-900 text-white shadow-slate-900/30' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}
          >
            <Sparkles size={20} className="text-amber-400" /> 제목 생성하기 <ArrowRight size={18} />
          </button>
        ) : (
          <button onClick={handleCopy} className="w-full py-5 bg-slate-900 text-white rounded-[2.2rem] font-black text-[15px] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-slate-900/20">
            {isCopied ? <CheckCircle2 size={20} className="text-green-400"/> : <Copy size={20}/>} {isCopied ? '복사 완료!' : '전체 내용 복사하기'}
          </button>
        )}
      </footer>
    </div>
  );
};

export default Creator;