import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, CloudRain, Sun, Snowflake, Cloud, 
  CheckCircle2, Zap, Layout, Instagram, Video, 
  Copy, Check, ArrowLeft, ArrowRight, RefreshCw,
  Loader2, AlertCircle, Thermometer
} from 'lucide-react';

/**
 * [글루넥스 AI 마스터 프롬프트]
 * 제미니 엔진이 마케팅 전문가로서 응답하도록 설정합니다.
 */
const SYSTEM_PROMPT = `
당신은 대한민국 최고의 자동차 디테일링 전문 마케터이자 '글루넥스(GLUNEX)'의 수석 카피라이터입니다.
사용자가 선택한 [시공 항목]과 [현재 날씨]를 분석하여 네이버 블로그, 인스타그램, 숏폼 대본을 작성하세요.

[필수 지시사항]
1. 제목(titles): 고객의 클릭을 유도하는 강력한 헤드라인 5개를 작성하세요. 날씨 상황을 언급하여 시급함을 강조할 것.
2. 블로그(blog_html): 
   - 전문성과 신뢰감이 느껴지는 어조를 사용하되, 사장님의 친절함이 묻어나야 함.
   - HTML 태그(h2, p, br, strong 등)를 사용하여 가독성 있게 작성.
   - 시공 전, 시공 중, 시공 후의 과정을 상세히 설명.
3. 인스타그램(insta_text): 해시태그(#)와 이모지를 풍부하게 사용하여 방문을 유도하는 감성 문구 작성.
4. 숏폼(short_form): 15초 내외의 빠른 템포 편집점과 자막 내용을 포함한 대본.

반드시 아래와 같은 JSON 구조로만 응답하세요:
{
  "titles": ["제목1", "제목2", "제목3", "제목4", "제목5"],
  "blog_html": "HTML 내용",
  "insta_text": "인스타 내용",
  "short_form": "숏폼 대본"
}
`;

const Creator = ({ userStatus }) => {
  const navigate = useNavigate();
  
  // --- 상태 관리 (모든 기능 복구) ---
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

  // --- 실시간 날씨 연동 (대시보드와 동기화) ---
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
          throw new Error("Weather API Error");
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

  // 12개 시공 카테고리
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

  // --- AI 콘텐츠 생성 핸들러 (Gemini 연동) ---
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
    const weatherInfo = isWeatherEnabled ? `현재 날씨: ${weather.desc}, 온도: ${weather.temp}도` : "날씨 정보 무시";
    
    const userPrompt = `
      매장명: 글루 디테일링 (GLUNEX)
      시공 품목: ${selectedNames}
      상황 정보: ${weatherInfo}
      요청: 위 정보를 바탕으로 제목 5개와 각 채널별 홍보 원고를 작성해줘.
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

      if (!response.ok) throw new Error("API 호출 실패");

      const resData = await response.json();
      const content = JSON.parse(resData.candidates[0].content.parts[0].text);
      
      setGeneratedData(content);
      setStep('title');
    } catch (error) {
      console.error(error);
      alert("AI 원고 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  // --- 복사 핸들러 ---
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
      console.error(err);
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

  // --- 로딩 화면 ---
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white items-center justify-center animate-fade-in font-noto p-6 text-center">
        <div className="relative mb-8">
          <div className="w-20 h-20 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-pulse" size={24} />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">마케팅 원고 집필 중...</h2>
        <p className="text-sm text-slate-400 leading-relaxed font-medium">
          사장님의 노하우와 실시간 날씨를 결합하여<br/>
          가장 설득력 있는 글을 만들고 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 font-noto overflow-hidden relative text-left">
      
      {/* 토스트 알림 */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-bounce">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 border border-slate-700">
            <Check size={14} className="text-green-400" /> {toastMsg}
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (step === 'keyword') navigate('/dashboard');
              else setStep('keyword');
            }} 
            className="p-1.5 hover:bg-slate-100 rounded-xl transition-all group"
          >
            <ArrowLeft size={22} className="text-slate-400 group-hover:text-slate-900" />
          </button>
          <h1 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase">Glunex <span className="text-blue-600">Ai</span></h1>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full min-w-[90px] justify-center border border-slate-200 shadow-inner">
          {getWeatherIcon(weather.status)}
          <span className="text-[10px] font-black text-slate-700 uppercase">
            {weather.loading ? '...' : `${weather.desc} ${weather.temp}°C`}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
        
        {/* 단계 1: 키워드 및 날씨 선택 */}
        {step === 'keyword' && (
          <>
            <section className="animate-fade-in text-left">
              <div className={`p-6 rounded-[2.5rem] border-2 transition-all duration-500 shadow-sm ${isWeatherEnabled ? 'bg-blue-600 border-blue-400 shadow-blue-100 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Zap size={18} className={isWeatherEnabled ? 'text-blue-200' : 'text-blue-600'} />
                    <h2 className="text-sm font-black uppercase tracking-tight">날씨연동 글쓰기</h2>
                  </div>
                  <button onClick={() => setIsWeatherEnabled(!isWeatherEnabled)}
                    className={`w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner ${isWeatherEnabled ? 'bg-white/30' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-md ${isWeatherEnabled ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90 font-medium text-left">
                  {isWeatherEnabled 
                    ? `현재 ${weather.desc} 날씨를 분석하여 방문율을 높이는 맞춤형 제목을 생성합니다.` 
                    : "날씨와 관계없이 표준화된 마케팅용 원고를 생성합니다."}
                </p>
              </div>
            </section>

            <section className="space-y-4 animate-fade-in text-left">
              <div className="flex items-center justify-between px-1">
                 <h2 className="text-lg font-black text-slate-900 tracking-tight">어떤 주제로 글을 쓸까요?</h2>
                 <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">중복 선택 가능</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <button 
                    key={cat.id} 
                    onClick={() => toggleTopic(cat.id)}
                    className={`relative py-5 px-2 rounded-2xl border-2 transition-all duration-200 ${
                      selectedTopics.includes(cat.id)
                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-[1.03] z-10 font-bold'
                        : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200 text-xs font-bold'
                    }`}
                  >
                    {cat.name}
                    {selectedTopics.includes(cat.id) && (
                      <div className="absolute top-1.5 right-1.5 text-blue-400 animate-fade-in">
                        <CheckCircle2 size={12} fill="currentColor" className="text-white shadow-sm" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* 단계 2: 제목 선택 */}
        {step === 'title' && generatedData && (
          <section className="space-y-6 animate-fade-in text-left">
            <div className="px-1">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">가장 끌리는 제목을 선택하세요</h2>
              <p className="text-xs text-slate-400 mt-1 font-medium italic">AI가 제안하는 고효율 블로그 헤드라인입니다.</p>
            </div>
            <div className="space-y-3">
              {generatedData.titles.map((title, idx) => (
                <button 
                  key={idx} 
                  onClick={() => {
                    setGeneratedData(prev => ({ ...prev, currentTitle: title }));
                    setStep('result');
                  }}
                  className="w-full text-left p-6 rounded-[2rem] bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all shadow-sm group"
                >
                  <p className="text-sm font-bold text-slate-800 leading-relaxed group-hover:text-blue-600 tracking-tight">{title}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setStep('keyword')} className="w-full py-4 text-slate-400 text-xs font-bold flex items-center justify-center gap-1 hover:text-slate-600">
              <RefreshCw size={14} className="mr-1" /> 주제 다시 고르기
            </button>
          </section>
        )}

        {/* 단계 3: 최종 결과 확인 */}
        {step === 'result' && generatedData && (
          <section className="space-y-6 animate-fade-in pb-10">
            {/* 상단 탭 메뉴 */}
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
              {[
                { id: 'blog', name: '블로그', icon: <Layout size={14}/> },
                { id: 'insta', name: '인스타', icon: <Instagram size={14}/> },
                { id: 'short', name: '숏폼', icon: <Video size={14}/> }
              ].map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                    activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.icon} {tab.name}
                </button>
              ))}
            </div>

            {/* 본문 콘텐츠 카드 */}
            <div className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-md min-h-[500px] relative overflow-hidden">
              <div className="absolute top-6 right-6 z-10">
                <button 
                  onClick={handleCopy} 
                  className={`p-3.5 rounded-2xl border transition-all shadow-sm ${isCopied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-slate-50'}`}
                >
                  {isCopied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>

              <div className="pt-10 text-left">
                {activeTab === 'blog' ? (
                  <div className="prose prose-slate max-w-none">
                    <h2 className="text-xl font-black text-slate-900 mb-8 leading-tight border-l-4 border-blue-600 pl-4 tracking-tighter">
                      {generatedData.currentTitle}
                    </h2>
                    <div className="text-sm leading-relaxed text-slate-700 font-medium space-y-4 font-noto" dangerouslySetInnerHTML={{ __html: generatedData.blog_html }} />
                  </div>
                ) : (
                  <div className="pt-8 px-1">
                    <div className="flex items-center gap-2 mb-4">
                       <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-blue-100">
                          {activeTab === 'insta' ? 'Instagram Post' : 'Short-form Script'}
                       </span>
                    </div>
                    <pre className="whitespace-pre-wrap font-noto text-sm text-slate-700 leading-relaxed font-medium">
                      {activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form}
                    </pre>
                  </div>
                )}
              </div>
            </div>
            
            <button onClick={() => setStep('keyword')} className="w-full py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl font-bold text-xs hover:bg-slate-50 transition-colors">
              처음부터 다시 작성하기
            </button>
          </section>
        )}
      </main>

      {/* 하단 고정 버튼 */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 max-w-md mx-auto z-40">
        {step === 'keyword' ? (
          <button 
            onClick={handleGenerate} 
            disabled={selectedTopics.length === 0}
            className={`w-full py-5 rounded-[1.8rem] font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${
              selectedTopics.length > 0 
                ? 'bg-slate-900 text-white shadow-slate-900/20' 
                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}
          >
            <Sparkles size={18} />
            제목 생성하기
            <ArrowRight size={16} />
          </button>
        ) : (
          <button 
            onClick={handleCopy}
            className="w-full py-5 bg-slate-900 text-white rounded-[1.8rem] font-black text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-slate-900/10"
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