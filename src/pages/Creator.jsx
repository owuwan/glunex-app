import React, { useState, useRef } from 'react';
import { 
  Sparkles, CloudRain, Sun, Snowflake, Cloud, 
  CheckCircle2, Zap, Layout, Instagram, Video, 
  Copy, Check, ArrowLeft, ArrowRight, RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * [글루넥스 AI 마스터 프롬프트]
 */
const SYSTEM_PROMPT = `
당신은 대한민국 최고의 자동차 디테일링 전문 마케터입니다.
사용자가 선택한 [시공 항목]과 [현재 날씨]를 분석하여 네이버 블로그, 인스타그램, 숏폼 대본을 작성하세요.
반드시 JSON 구조로만 응답하세요:
{
  "titles": ["제목1", "제목2", "제목3", "제목4", "제목5"],
  "blog_html": "HTML 내용",
  "insta_text": "인스타 내용",
  "short_form": "숏폼 대본"
}
`;

const Creator = () => {
  const { showToast, userStatus } = useApp();
  const [step, setStep] = useState('keyword'); 
  const [loading, setLoading] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isWeatherEnabled, setIsWeatherEnabled] = useState(true);
  const [weather] = useState({ status: 'rain', desc: '비', temp: 18 });
  const [generatedData, setGeneratedData] = useState(null);
  const [activeTab, setActiveTab] = useState('blog');
  const [isCopied, setIsCopied] = useState(false);
  const contentRef = useRef(null);

  // 홍철님이 요청하신 12개 시공 카테고리
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
      if(go) window.location.hash = '/mypage';
      return;
    }

    setLoading(true);
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY; 
    const selectedNames = categories.filter(c => selectedTopics.includes(c.id)).map(c => c.name).join(', ');
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `시공: ${selectedNames}, 날씨: ${isWeatherEnabled ? weather.desc : '맑음'}` }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const resData = await response.json();
      const content = JSON.parse(resData.candidates[0].content.parts[0].text);
      setGeneratedData(content);
      setStep('title');
    } catch (error) {
      alert("생성 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
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
      showToast("클립보드에 복사되었습니다!");
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
      <div className="flex flex-col h-full bg-white items-center justify-center animate-fade-in font-noto">
        <div className="relative mb-6">
          <div className="w-20 h-20 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-pulse" size={24} />
        </div>
        <p className="text-sm font-bold text-slate-900">AI 에이전트가 원고 작성 중...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 font-noto overflow-hidden relative text-left">
      <header className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {step !== 'keyword' && (
            <button onClick={() => setStep('keyword')} className="p-1 hover:bg-slate-100 rounded-lg">
              <ArrowLeft size={20} className="text-slate-400" />
            </button>
          )}
          <h1 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase">Glunex <span className="text-blue-600">Ai</span></h1>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
          {getWeatherIcon(weather.status)}
          <span className="text-[10px] font-black text-slate-700 uppercase">{weather.desc} {weather.temp}°C</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
        {step === 'keyword' && (
          <>
            <section className="animate-fade-in text-left">
              <div className={`p-6 rounded-[2.5rem] border-2 transition-all duration-500 ${isWeatherEnabled ? 'bg-blue-600 border-blue-400 shadow-xl shadow-blue-100 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Zap size={18} className={isWeatherEnabled ? 'text-blue-200' : 'text-blue-600'} />
                    <h2 className="text-sm font-black uppercase tracking-tight">날씨연동 글쓰기</h2>
                  </div>
                  <button onClick={() => setIsWeatherEnabled(!isWeatherEnabled)}
                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isWeatherEnabled ? 'bg-white/30' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full transition-all duration-300 ${isWeatherEnabled ? 'right-1 bg-white' : 'left-1 bg-white shadow-sm'}`}></div>
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed opacity-80 font-medium text-left">
                  {isWeatherEnabled ? `현재 ${weather.desc} 날씨에 맞춰 고객을 설득하는 문구를 추가합니다.` : "날씨와 관계없이 원고를 작성합니다."}
                </p>
              </div>
            </section>

            <section className="space-y-4 animate-fade-in text-left">
              <h2 className="text-lg font-black text-slate-900 tracking-tight ml-1 text-left">어떤 주제로 글을 쓸까요?</h2>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => toggleTopic(cat.id)}
                    className={`relative py-5 px-2 rounded-2xl border-2 transition-all duration-200 ${
                      selectedTopics.includes(cat.id)
                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-[1.03] z-10 font-bold'
                        : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200 text-xs font-bold'
                    }`}
                  >
                    {cat.name}
                    {selectedTopics.includes(cat.id) && (
                      <div className="absolute top-1.5 right-1.5 text-blue-400">
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
            <h2 className="text-lg font-black text-slate-900 ml-1">제목을 선택하세요</h2>
            <div className="space-y-3">
              {generatedData.titles.map((title, idx) => (
                <button key={idx} onClick={() => {
                  setGeneratedData(prev => ({ ...prev, currentTitle: title }));
                  setStep('result');
                }}
                className="w-full text-left p-6 rounded-[2rem] bg-white border border-slate-200 hover:border-blue-500 transition-all shadow-sm group"
                >
                  <p className="text-sm font-bold text-slate-800 leading-relaxed group-hover:text-blue-600">{title}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setStep('keyword')} className="w-full py-4 text-slate-400 text-xs font-bold flex items-center justify-center gap-1">
              <RefreshCw size={14} /> 다른 주제 선택하기
            </button>
          </section>
        )}

        {step === 'result' && generatedData && (
          <section className="space-y-6 animate-fade-in pb-10">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200">
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

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[500px] relative">
              <div className="absolute top-6 right-6">
                <button onClick={handleCopy} className={`p-3 rounded-2xl border transition-all ${isCopied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white border-slate-200 text-slate-400 hover:text-blue-600'}`}>
                  {isCopied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              <div className="pt-10 text-left" ref={contentRef}>
                {activeTab === 'blog' ? (
                  <div className="prose prose-slate max-w-none">
                    <h2 className="text-xl font-black text-slate-900 mb-6 leading-tight border-l-4 border-blue-600 pl-4">{generatedData.currentTitle}</h2>
                    <div className="text-sm leading-relaxed text-slate-700 font-medium" dangerouslySetInnerHTML={{ __html: generatedData.blog_html }} />
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-noto text-sm text-slate-700 leading-relaxed pt-10 px-2 font-medium">
                    {activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form}
                  </pre>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 max-w-md mx-auto z-40">
        {step === 'keyword' ? (
          <button onClick={handleGenerate} disabled={selectedTopics.length === 0}
            className={`w-full py-5 rounded-[1.8rem] font-black text-sm flex items-center justify-center gap-3 transition-all ${
              selectedTopics.length > 0 ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}
          >
            <Sparkles size={18} /> 제목 추천받기 <ArrowRight size={16} />
          </button>
        ) : (
          <button onClick={handleCopy}
            className="w-full py-5 bg-slate-900 text-white rounded-[1.8rem] font-black text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95"
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