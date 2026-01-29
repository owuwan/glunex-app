import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, CloudRain, Sun, Snowflake, Cloud, 
  CheckCircle2, Zap, Layout, Instagram, Video, 
  Copy, Check, ArrowLeft, ArrowRight, RefreshCw
} from 'lucide-react';

/**
 * [글루넥스 AI 마스터 프롬프트]
 * 마케팅 전문가 페르소나를 강화하고 날씨와 키워드의 결합을 강조했습니다.
 */
const SYSTEM_PROMPT = `
당신은 대한민국 최고의 자동차 디테일링 전문 마케터입니다.
사용자가 선택한 [시공 항목]과 [현재 날씨]를 분석하여 고객의 방문을 즉각 유도하는 제목 5개와 콘텐츠를 작성하세요.

[지시사항]
1. 제목(titles): 날씨 상황을 반드시 언급하여 시급함을 강조할 것. (예: "비 예보 있는 이번 주, 유리발수코팅 안 하면 위험한 이유")
2. 블로그(blog_html): HTML 형식을 사용하며, 전문적인 공정 설명과 날씨에 따른 관리 팁을 포함할 것.
3. 인스타그램(insta_text): 이모지와 해시태그를 풍부하게 사용한 감성 마케팅 문구.
4. 숏폼(short_form): 15초 내외의 짧고 강렬한 후킹 멘트 위주의 대본.

반드시 JSON 구조로만 응답하세요:
{
  "titles": ["제목1", "제목2", "제목3", "제목4", "제목5"],
  "blog_html": "HTML 내용",
  "insta_text": "인스타 내용",
  "short_form": "숏폼 대본"
}
`;

const Creator = ({ userStatus }) => {
  const navigate = useNavigate();
  
  // 상태 관리
  const [step, setStep] = useState('keyword'); // keyword -> title -> result
  const [loading, setLoading] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isWeatherEnabled, setIsWeatherEnabled] = useState(true);
  
  // 실시간 날씨 상태
  const [weather, setWeather] = useState({ status: 'clear', desc: '맑음', temp: 20, loading: true });
  
  const [generatedData, setGeneratedData] = useState(null);
  const [activeTab, setActiveTab] = useState('blog');
  const [isCopied, setIsCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // 실시간 날씨 연동 (타임아웃 적용)
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
        if (!API_KEY) {
          setWeather({ status: 'clear', desc: '맑음', temp: 20, loading: false });
          return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

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

          setWeather({
            status,
            desc: data.weather[0].description,
            temp: Math.round(data.main.temp),
            loading: false
          });
        } else {
          throw new Error("Data Error");
        }
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
    { id: 'wash', name: '세차' },
    { id: 'detailing', name: '디테일링' },
    { id: 'coating', name: '유리막코팅' },
    { id: 'undercoating', name: '언더코팅' },
    { id: 'special_wash', name: '실내특수세차' },
    { id: 'interior_clean', name: '실내크리닝' },
    { id: 'iron_remove', name: '철분제거' },
    { id: 'glass_repel', name: '유리발수코팅' },
    { id: 'tinting', name: '썬팅' },
    { id: 'blackbox', name: '블랙박스' },
    { id: 'new_car', name: '신차패키지' },
    { id: 'leather_coating', name: '가죽코팅' }
  ];

  const toggleTopic = (id) => {
    setSelectedTopics(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (selectedTopics.length === 0) return alert("주제를 하나 이상 선택해주세요.");
    
    if (userStatus !== 'approved') {
      const go = window.confirm("🔒 프리미엄 파트너 전용 기능입니다.\n멤버십 페이지로 이동하시겠습니까?");
      if(go) navigate('/mypage');
      return;
    }

    setLoading(true);
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY; 
    const selectedNames = categories.filter(c => selectedTopics.includes(c.id)).map(c => c.name).join(', ');
    
    // AI에게 전달할 상세 프롬프트 구성
    const weatherInfo = isWeatherEnabled 
      ? `현재 날씨는 '${weather.desc}'이며 기온은 ${weather.temp}도입니다.` 
      : "날씨 정보는 고려하지 마세요.";
    
    const userPrompt = `
      매장명: 글루 디테일링 (GLUNEX)
      시공 항목: ${selectedNames}
      날씨 정보: ${weatherInfo}
      요청: 위 조건에 딱 맞는 블로그 제목 5개와 각 채널별 원고를 작성해줘.
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const resData = await response.json();
      const content = JSON.parse(resData.candidates[0].content.parts[0].text);
      setGeneratedData(content);
      setStep('title');
    } catch (error) {
      console.error(error);
      alert("AI 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedData) return;
    const text = activeTab === 'blog' ? generatedData.blog_html : generatedData[activeTab === 'insta' ? 'insta_text' : 'short_form'];
    try {
      if (activeTab === 'blog') {
        const type = "text/html";
        const blob = new Blob([text], { type });
        const data = [new ClipboardItem({ [type]: blob })];
        await navigator.clipboard.write(data);
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
      <div className="flex flex-col h-full bg-white items-center justify-center animate-fade-in font-noto p-6">
        <div className="relative mb-6 text-center">
          <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-pulse" size={20} />
        </div>
        <p className="text-sm font-bold text-slate-900 tracking-tight">AI 에이전트가 원고를 작성 중입니다...</p>
        <p className="text-[10px] text-slate-400 mt-2">날씨와 키워드를 분석하여 제목을 추출하고 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 font-noto overflow-hidden relative text-left">
      
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-bounce">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2">
            <Check size={14} className="text-green-400" /> {toastMsg}
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3 text-left">
          <button 
            onClick={() => {
              if (step === 'keyword') {
                navigate('/dashboard');
              } else {
                setStep('keyword');
              }
            }} 
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors group"
          >
            <ArrowLeft size={20} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
          </button>
          <h1 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase">Glunex <span className="text-blue-600">Ai</span></h1>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full min-w-[80px] justify-center">
          {getWeatherIcon(weather.status)}
          <span className="text-[10px] font-black text-slate-700 uppercase">
            {weather.loading ? '로딩 중' : `${weather.desc} ${weather.temp}°C`}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
        {step === 'keyword' && (
          <>
            <section className="animate-fade-in text-left">
              <div className={`p-6 rounded-[2.5rem] border-2 transition-all duration-500 ${isWeatherEnabled ? 'bg-blue-600 border-blue-400 shadow-xl shadow-blue-100 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                <div className="flex items-center justify-between mb-4 text-left">
                  <div className="flex items-center gap-2">
                    <Zap size={18} className={isWeatherEnabled ? 'text-blue-200' : 'text-blue-600'} />
                    <h2 className="text-sm font-black uppercase tracking-tight text-left">날씨연동 글쓰기</h2>
                  </div>
                  <button onClick={() => setIsWeatherEnabled(!isWeatherEnabled)}
                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isWeatherEnabled ? 'bg-white/30' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${isWeatherEnabled ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed opacity-80 font-medium text-left">
                  {isWeatherEnabled ? `현재 '${weather.desc}' 날씨에 맞춰 고객을 설득하는 제목을 우선적으로 추천합니다.` : "날씨와 관계없이 일반적인 홍보용 원고를 작성합니다."}
                </p>
              </div>
            </section>

            <section className="space-y-4 animate-fade-in text-left">
              <h2 className="text-lg font-black text-slate-900 tracking-tight ml-1 text-left">어떤 주제로 글을 쓸까요?</h2>
              <div className="grid grid-cols-3 gap-2 text-left">
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => toggleTopic(cat.id)}
                    className={`relative py-5 px-2 rounded-2xl border-2 transition-all duration-200 text-left ${
                      selectedTopics.includes(cat.id)
                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-[1.03] z-10 font-bold'
                        : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200 text-xs font-bold'
                    }`}
                  >
                    {cat.name}
                    {selectedTopics.includes(cat.id) && (
                      <div className="absolute top-1.5 right-1.5 text-blue-400 animate-fade-in">
                        <CheckCircle2 size={12} fill="currentColor" className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {step === 'title' && generatedData && (
          <section className="space-y-6 animate-fade-in text-left">
            <div className="px-1">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">가장 끌리는 제목을 선택하세요</h2>
              <p className="text-xs text-slate-400 mt-1">AI가 추천하는 고효율 마케팅 제목입니다.</p>
            </div>
            <div className="space-y-3 text-left">
              {generatedData.titles.map((title, idx) => (
                <button key={idx} onClick={() => {
                  setGeneratedData(prev => ({ ...prev, currentTitle: title }));
                  setStep('result');
                }}
                className="w-full text-left p-6 rounded-[2rem] bg-white border border-slate-200 hover:border-blue-500 transition-all shadow-sm group active:scale-[0.98]"
                >
                  <p className="text-sm font-bold text-slate-800 leading-relaxed group-hover:text-blue-600 text-left">{title}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setStep('keyword')} className="w-full py-4 text-slate-400 text-xs font-bold flex items-center justify-center gap-1 transition-colors hover:text-slate-600">
              <RefreshCw size={14} className="mr-1" /> 다른 주제 선택하기
            </button>
          </section>
        )}

        {step === 'result' && generatedData && (
          <section className="space-y-6 animate-fade-in pb-10 text-left">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 text-left">
              {[
                { id: 'blog', name: '블로그', icon: <Layout size={14}/> },
                { id: 'insta', name: '인스타', icon: <Instagram size={14}/> },
                { id: 'short', name: '숏폼', icon: <Video size={14}/> }
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                    activeTab === tab.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400'
                  }`}
                >
                  {tab.icon} {tab.name}
                </button>
              ))}
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[500px] relative text-left">
              <div className="absolute top-6 right-6 text-left">
                <button onClick={handleCopy} className={`p-3 rounded-2xl border transition-all ${isCopied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white border-slate-200 text-slate-400 hover:text-blue-600'}`}>
                  {isCopied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              <div className="pt-10 text-left">
                {activeTab === 'blog' ? (
                  <div className="prose prose-slate max-w-none text-left">
                    <h2 className="text-xl font-black text-slate-900 mb-6 leading-tight border-l-4 border-blue-600 pl-4 text-left font-noto tracking-tighter italic">
                      {generatedData.currentTitle}
                    </h2>
                    <div className="text-sm leading-relaxed text-slate-700 font-medium text-left font-noto" dangerouslySetInnerHTML={{ __html: generatedData.blog_html }} />
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-noto text-sm text-slate-700 leading-relaxed pt-10 px-2 font-medium text-left">
                    {activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form}
                  </pre>
                )}
              </div>
            </div>
            
            <button onClick={() => setStep('keyword')} className="w-full py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl font-bold text-xs">
              처음부터 다시 작성하기
            </button>
          </section>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 max-w-md mx-auto z-40 text-left">
        {step === 'keyword' ? (
          <button onClick={handleGenerate} disabled={selectedTopics.length === 0}
            className={`w-full py-5 rounded-[1.8rem] font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${
              selectedTopics.length > 0 ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}
          >
            <Sparkles size={18} /> 제목 생성하기 <ArrowRight size={16} />
          </button>
        ) : (
          <button onClick={handleCopy}
            className="w-full py-5 bg-slate-900 text-white rounded-[1.8rem] font-black text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            {isCopied ? <Check size={18}/> : <Copy size={18}/>}
            {isCopied ? '복사 완료' : '전체 내용 복사하기'}
          </button>
        )}
      </footer>
    </div>
  );
};

export default Creator;