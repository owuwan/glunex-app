import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, CloudRain, Sun, Snowflake, Cloud, 
  CheckCircle2, Zap, Layout, Instagram, Video, 
  Copy, Check, ArrowLeft, ArrowRight, RefreshCw,
  Loader2, AlertCircle, Thermometer, Wand2,
  Info, Smartphone, Monitor, ChevronRight,
  Target, PenTool, Hash, Send
} from 'lucide-react';

/**
 * [글루넥스 AI 마스터 프롬프트]
 * 대한민국 최고의 자동차 디테일링 전문가 페르소나를 주입합니다.
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
3. 인스타그램(insta_text): 해시태그(#)와 이모지를 풍부하게 사용하여 방문을 유도하는 감성 문구 작성.
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
  
  // --- 상태 관리 (홍철님 요청 기능을 위한 모든 상태 유지) ---
  const [step, setStep] = useState('keyword'); // keyword -> title -> result
  const [loading, setLoading] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isWeatherEnabled, setIsWeatherEnabled] = useState(true);
  
  // 실시간 날씨 데이터 상태
  const [weather, setWeather] = useState({ 
    status: 'clear', 
    desc: '맑음', 
    temp: 20, 
    loading: true 
  });
  
  const [generatedData, setGeneratedData] = useState(null);
  const [activeTab, setActiveTab] = useState('blog');
  const [isCopied, setIsCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const contentRef = useRef(null);

  // --- 실시간 날씨 연동 (대시보드 로직 완벽 동기화) ---
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
        if (!API_KEY) {
          setWeather({ status: 'clear', desc: '맑음', temp: 20, loading: false });
          return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

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
          throw new Error("Weather Load Error");
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

  // 12개 시공 카테고리 (홍철님 확정 레이아웃)
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

  // [강력한 데이터 추출] AI 응답에서 순수 JSON만 뽑아내는 함수
  const parseJsonSafe = (text) => {
    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}') + 1;
      if (start === -1 || end === -1) return null;
      return JSON.parse(text.substring(start, end));
    } catch (e) {
      console.error("JSON 파싱 오류:", e);
      return null;
    }
  };

  // --- AI 콘텐츠 생성 핸들러 (Gemini 1.5 Flash 엔진) ---
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
      alert("API KEY 설정이 필요합니다. Vercel 환경 변수를 확인해주세요.");
      return;
    }

    const selectedNames = categories.filter(c => selectedTopics.includes(c.id)).map(c => c.name).join(', ');
    const weatherInfo = isWeatherEnabled ? `현재 날씨: ${weather.desc}, 온도: ${weather.temp}도` : "날씨 무관";
    
    const userPrompt = `매장명: GLUNEX(글루 디테일링), 시공 품목: ${selectedNames}, ${weatherInfo}. 제목 5개와 채널별 홍보 원고 작성 요청.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.8
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "AI 엔진 응답 실패");
      }

      const resData = await response.json();
      const rawText = resData.candidates[0].content.parts[0].text;
      const content = parseJsonSafe(rawText);
      
      if (!content) throw new Error("데이터 파싱 실패");
      
      setGeneratedData(content);
      setStep('title');
    } catch (error) {
      console.error("AI 생성 실패:", error);
      alert(`❌ 오류 발생: ${error.message}\n\n구글 콘솔에서 API 권한(제한사항)을 다시 확인해 주세요.`);
    } finally {
      setLoading(false);
    }
  };

  // --- 클립보드 복사 로직 (HTML/텍스트 구분) ---
  const handleCopy = async () => {
    if (!generatedData) return;
    const text = activeTab === 'blog' ? generatedData.blog_html : (activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form);
    
    try {
      if (activeTab === 'blog') {
        const blob = new Blob([text], { type: "text/html" });
        const data = [new ClipboardItem({ ["text/html"]: blob })];
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

  // --- 로딩 인트로 화면 ---
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white items-center justify-center animate-fade-in font-noto p-8 text-center">
        <div className="relative mb-12">
          <div className="w-24 h-24 border-[6px] border-slate-50 border-t-blue-600 rounded-full animate-spin mx-auto shadow-sm"></div>
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-pulse" size={30} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tighter italic uppercase leading-none">Glunex <span className="text-blue-600">Ai</span> Agent</h2>
        <div className="space-y-2 mt-4">
          <p className="text-base text-slate-600 font-bold leading-relaxed">"사장님의 전문 지식과 실시간 날씨를 조합하여<br/>최고의 마케팅 원고를 작성 중입니다."</p>
          <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">Analyzing keywords & Weather data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#F9FAFB] font-noto overflow-hidden relative text-left">
      
      {/* 플로팅 알림창 */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-bounce">
          <div className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] text-sm font-black shadow-2xl flex items-center gap-3 border border-slate-700 backdrop-blur-lg">
            <CheckCircle2 size={18} className="text-green-400" /> {toastMsg}
          </div>
        </div>
      )}

      {/* 고정 헤더 섹션 */}
      <header className="px-6 py-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (step === 'keyword') navigate('/dashboard');
              else setStep('keyword');
            }} 
            className="p-2.5 hover:bg-slate-50 rounded-2xl transition-all group active:scale-90 border border-transparent hover:border-slate-100"
          >
            <ArrowLeft size={22} className="text-slate-400 group-hover:text-slate-900" />
          </button>
          <div className="text-left">
            <h1 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Glunex <span className="text-blue-600">Ai</span></h1>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1.5">Premium Marketing Agent</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 bg-slate-50 px-4 py-2.5 rounded-3xl min-w-[110px] justify-center border border-slate-100 shadow-inner">
          {getWeatherIcon(weather.status)}
          <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">
            {weather.loading ? 'LOADING' : `${weather.desc} ${weather.temp}°C`}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-10 pb-44">
        
        {/* [단계 1] 키워드 선택 화면 */}
        {step === 'keyword' && (
          <>
            <section className="animate-fade-in text-left">
              <div className={`p-8 rounded-[3rem] border-2 transition-all duration-700 shadow-2xl ${isWeatherEnabled ? 'bg-blue-600 border-blue-400 shadow-blue-200/40 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isWeatherEnabled ? 'bg-white/20' : 'bg-blue-50'}`}>
                       <Zap size={22} className={isWeatherEnabled ? 'text-white' : 'text-blue-600'} />
                    </div>
                    <h2 className="text-lg font-black uppercase tracking-tight">실시간 날씨연동</h2>
                  </div>
                  <button onClick={() => setIsWeatherEnabled(!isWeatherEnabled)}
                    className={`w-14 h-7 rounded-full relative transition-all duration-500 shadow-inner ${isWeatherEnabled ? 'bg-white/30' : 'bg-slate-100'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-500 shadow-xl ${isWeatherEnabled ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
                <p className="text-sm leading-relaxed opacity-95 font-bold text-left tracking-tight">
                  {isWeatherEnabled 
                    ? `현재 '${weather.desc}' 날씨에 고객이 가장 방문하고 싶게 만드는 "클릭 유도형 제목"을 AI가 분석하여 제안합니다.` 
                    : "날씨 상황과 관계없이 선택하신 시공 품목의 장점을 극대화하는 표준 원고를 생성합니다."}
                </p>
              </div>
            </section>

            <section className="space-y-6 animate-fade-in text-left pb-10">
              <div className="flex items-center justify-between px-2">
                 <h2 className="text-xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
                    <Target size={22} className="text-blue-600" /> 시공 품목을 선택하세요
                 </h2>
                 <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Multiple Selection</span>
                 </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {categories.map((cat) => (
                  <button 
                    key={cat.id} 
                    onClick={() => toggleTopic(cat.id)}
                    className={`relative py-7 px-2 rounded-[1.8rem] border-2 transition-all duration-500 text-center ${
                      selectedTopics.includes(cat.id)
                        ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.06] z-10 font-black'
                        : 'bg-white border-white text-slate-500 hover:border-blue-100 shadow-sm text-[14px] font-bold'
                    }`}
                  >
                    {cat.name}
                    {selectedTopics.includes(cat.id) && (
                      <div className="absolute top-2.5 right-2.5 text-blue-400 animate-fade-in">
                        <CheckCircle2 size={16} fill="currentColor" className="text-white shadow-sm" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* [단계 2] AI 제목 제안 화면 */}
        {step === 'title' && generatedData && (
          <section className="space-y-8 animate-fade-in text-left">
            <div className="px-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase shadow-lg tracking-widest">Ai Optimized</div>
              </div>
              <h2 className="text-[1.7rem] font-black text-slate-900 tracking-tighter leading-[1.2]">가장 강력한 제목을<br/>선택해 주세요</h2>
              <p className="text-sm text-slate-400 mt-3 font-bold">빅데이터 분석을 통해 가장 클릭 확률이 높은 제목들입니다.</p>
            </div>
            <div className="space-y-4">
              {generatedData.titles.map((title, idx) => (
                <button 
                  key={idx} 
                  onClick={() => {
                    setGeneratedData(prev => ({ ...prev, currentTitle: title }));
                    setStep('result');
                  }}
                  className="w-full text-left p-8 rounded-[2.5rem] bg-white border border-slate-50 hover:border-blue-500 hover:shadow-2xl transition-all shadow-md group active:scale-95 border-l-[8px] border-l-blue-600/10 hover:border-l-blue-600"
                >
                  <p className="text-base font-black text-slate-800 leading-snug group-hover:text-blue-600 tracking-tight">{title}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setStep('keyword')} className="w-full py-6 text-slate-400 text-xs font-black flex items-center justify-center gap-3 hover:text-slate-900 transition-colors uppercase tracking-[0.3em] mt-6">
              <RefreshCw size={14} /> Re-Generate Topics
            </button>
          </section>
        )}

        {/* [단계 3] 최종 콘텐츠 원고 화면 */}
        {step === 'result' && generatedData && (
          <section className="space-y-7 animate-fade-in pb-16">
            {/* 고기능 탭 바 */}
            <div className="flex bg-slate-200/40 p-1.5 rounded-[2rem] border border-slate-100 shadow-inner">
              {[
                { id: 'blog', name: '블로그', icon: <Layout size={16}/> },
                { id: 'insta', name: '인스타그램', icon: <Instagram size={16}/> },
                { id: 'short', name: '숏폼 대본', icon: <Video size={16}/> }
              ].map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-4 rounded-[1.5rem] text-[13px] font-black flex items-center justify-center gap-3 transition-all duration-300 ${
                    activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl scale-[1.03]' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.icon} {tab.name}
                </button>
              ))}
            </div>

            {/* 메인 콘텐츠 카드 */}
            <div className="bg-white p-9 rounded-[3.5rem] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] min-h-[600px] relative overflow-hidden group border-t-[10px] border-t-blue-600">
              <div className="absolute top-10 right-10 z-10">
                <button 
                  onClick={handleCopy} 
                  className={`p-4.5 rounded-[1.5rem] border-2 transition-all shadow-xl active:scale-90 ${isCopied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-900 border-slate-800 text-white hover:bg-slate-800'}`}
                >
                  {isCopied ? <Check size={24} /> : <Copy size={24} />}
                </button>
              </div>

              <div className="pt-14 text-left" ref={contentRef}>
                {activeTab === 'blog' ? (
                  <article className="prose prose-slate max-w-none font-noto">
                    <div className="mb-12 pb-8 border-b border-slate-50">
                        <div className="flex items-center gap-2 mb-3">
                           <PenTool size={14} className="text-blue-600" />
                           <span className="text-blue-600 font-black text-[10px] uppercase tracking-widest">Recommended Headline</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 leading-tight tracking-tighter italic border-l-[8px] border-blue-600 pl-6">
                          {generatedData.currentTitle}
                        </h2>
                    </div>
                    <div className="text-[15.5px] leading-[1.9] text-slate-700 font-medium space-y-8" dangerouslySetInnerHTML={{ __html: generatedData.blog_html }} />
                  </article>
                ) : (
                  <div className="pt-10">
                    <div className="flex items-center gap-3 mb-8">
                       <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                          {activeTab === 'insta' ? <Hash size={20}/> : <Video size={20}/>}
                       </div>
                       <div className="text-left">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">Social Content</p>
                          <h3 className="text-base font-black text-slate-900 mt-1 uppercase tracking-tight">
                             {activeTab === 'insta' ? 'Instagram Format' : 'Short-form Script'}
                          </h3>
                       </div>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
                      <pre className="whitespace-pre-wrap font-noto text-[14.5px] text-slate-800 leading-relaxed font-bold italic">
                        {activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-16 pt-10 border-t border-slate-50 text-center opacity-40">
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em]">Glunex Intelligence • Marketing v2.1</p>
              </div>
            </div>
            
            <button onClick={() => setStep('keyword')} className="w-full py-6 bg-white border border-slate-200 text-slate-500 rounded-[2rem] font-black text-[13px] hover:bg-slate-50 transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-3">
              <RefreshCw size={16} /> 처음부터 다시 작성하기
            </button>
          </section>
        )}
      </main>

      {/* 하단 고정 인터랙티브 푸터 */}
      <footer className="fixed bottom-0 left-0 right-0 p-8 bg-white/80 backdrop-blur-3xl border-t border-slate-100 max-w-md mx-auto z-40 shadow-[0_-15px_40px_rgba(0,0,0,0.04)]">
        {step === 'keyword' ? (
          <button 
            onClick={handleGenerate} 
            disabled={selectedTopics.length === 0}
            className={`w-full py-6 rounded-[2.5rem] font-black text-[16px] flex items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl ${
              selectedTopics.length > 0 
                ? 'bg-slate-900 text-white shadow-slate-900/40' 
                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}
          >
            <Sparkles size={22} className="text-amber-400 animate-pulse" />
            제목 생성하기
            <ArrowRight size={20} className="ml-1" />
          </button>
        ) : (
          <div className="flex gap-3">
             <button 
                onClick={handleCopy}
                className="flex-[2] py-6 bg-slate-900 text-white rounded-[2.5rem] font-black text-[16px] shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all shadow-slate-900/30"
              >
                {isCopied ? <CheckCircle2 size={22} className="text-green-400"/> : <Copy size={22}/>}
                {isCopied ? '복사 완료!' : '전체 내용 복사하기'}
              </button>
              <button 
                onClick={() => setStep('keyword')}
                className="flex-1 py-6 bg-white border-2 border-slate-900 text-slate-900 rounded-[2.5rem] font-black text-[16px] active:scale-95 transition-all shadow-sm"
              >
                다시쓰기
              </button>
          </div>
        )}
      </footer>
    </div>
  );
};

export default Creator;