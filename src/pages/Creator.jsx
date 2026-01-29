import React, { useState, useEffect } from 'react';
import { 
  Sparkles, CloudRain, Sun, Snowflake, Cloud, 
  CheckCircle2, Zap, Layout, Instagram, Video, 
  Copy, Check, ArrowLeft, ArrowRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * ============================================================
 * [긴급 업데이트 버전] 
 * v1.0.7-LIVE-UPDATE: 보라색 테마로 변경 (반영 확인용)
 * ============================================================
 */
const DEPLOY_VERSION = "v1.0.7-LIVE-UPDATE";

const IPHONE_PHOTO_STYLE = "A raw, unfiltered smartphone photo shot on iPhone 15 Pro, handheld, natural indoor lighting, authentic car detailing shop in Korea, slightly messy background, no filters, photorealistic, orange peel paint texture.";

const SYSTEM_PROMPT = `
당신은 대한민국 최고의 자동차 디테일링 마케팅 전문가입니다.
사용자가 선택한 [시공 항목]과 [현재 날씨]를 분석하여 네이버 블로그, 인스타그램, 숏폼 대본을 작성하세요.

[이미지 생성 규칙]
1. 블로그 본문 중간에 반드시 [[image:before]], [[image:process]], [[image:after]] 태그를 넣으세요.
2. 각 태그에 어울리는 실사 느낌의 '영어 프롬프트'를 JSON의 image_prompts 필드에 각각 작성하세요. 

반드시 JSON 구조로만 응답하세요:
{
  "titles": ["제목1", "제목2", "제목3", "제목4", "제목5"],
  "blog_html": "HTML 내용",
  "insta_text": "인스타 내용",
  "short_form": "숏폼 대본",
  "image_prompts": {
    "before": "영어 프롬프트",
    "process": "영어 프롬프트",
    "after": "영어 프롬프트"
  }
}
`;

const Creator = () => {
  const { showToast, userStatus } = useApp();
  const [step, setStep] = useState('keyword'); 
  const [loadingMsg, setLoadingMsg] = useState('');
  
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isWeatherEnabled, setIsWeatherEnabled] = useState(true);
  const [weather] = useState({ status: 'rain', desc: '비', temp: 18 });
  
  const [generatedData, setGeneratedData] = useState(null);
  const [imageUrls, setImageUrls] = useState({ before: '', process: '', after: '' });
  const [activeTab, setActiveTab] = useState('blog');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    console.log(`%c GLUNEX FORCE UPDATE: ${DEPLOY_VERSION}`, 'background: #6366f1; color: #fff; font-weight: bold; padding: 10px;');
  }, []);

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

  const toggleTopic = (topicId) => {
    setSelectedTopics(prev => 
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    );
  };

  const generateFalImage = async (prompt) => {
    const FAL_KEY = import.meta.env.VITE_FAL_API_KEY;
    if (!FAL_KEY) return "https://placehold.co/800x500?text=API+KEY+MISSING";

    try {
      const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
        method: "POST",
        headers: {
          "Authorization": `Key ${FAL_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: `${prompt}, ${IPHONE_PHOTO_STYLE}`,
          image_size: "landscape_4_3",
          num_inference_steps: 4
        })
      });
      const data = await response.json();
      return data.images[0].url;
    } catch (e) {
      console.error(e);
      return "https://placehold.co/800x500?text=Image+Error";
    }
  };

  const handleGenerate = async () => {
    if (selectedTopics.length === 0) return alert("주제를 선택해주세요.");
    if (userStatus !== 'approved') {
      const go = window.confirm("🔒 프리미엄 전용 기능입니다.\n멤버십 페이지로 이동하시겠습니까?");
      if(go) window.location.hash = '/mypage';
      return;
    }

    setStep('generating');
    setLoadingMsg('AI가 마케팅 시나리오를 집필 중입니다...');

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
      
      setLoadingMsg('포스팅에 맞는 실사 사진을 촬영 중입니다...');
      const [imgBefore, imgProcess, imgAfter] = await Promise.all([
        generateFalImage(content.image_prompts.before),
        generateFalImage(content.image_prompts.process),
        generateFalImage(content.image_prompts.after)
      ]);

      setImageUrls({ before: imgBefore, process: imgProcess, after: imgAfter });
      setGeneratedData(content);
      setStep('title');
    } catch (error) {
      alert("생성 오류: 환경설정 또는 API 키를 확인하세요.");
      setStep('keyword');
    }
  };

  const getFinalBlogHtml = () => {
    if (!generatedData) return "";
    let html = generatedData.blog_html;
    
    const imageBox = (url, label) => `
      <div class="my-6 rounded-[2rem] overflow-hidden border border-slate-100 shadow-xl">
        <img src="${url}" class="w-full h-auto block" alt="${label}" />
        <div class="p-4 bg-white text-center border-t border-slate-50">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">📸 ${label} 실사 에셋</p>
        </div>
      </div>
    `;

    html = html.replace("[[image:before]]", imageBox(imageUrls.before, "시공 전"));
    html = html.replace("[[image:process]]", imageBox(imageUrls.process, "시공 중"));
    html = html.replace("[[image:after]]", imageBox(imageUrls.after, "시공 후"));
    
    return html;
  };

  const handleCopy = () => {
    const text = activeTab === 'blog' ? getFinalBlogHtml() : generatedData[activeTab === 'insta' ? 'insta_text' : 'short_form'];
    if (activeTab === 'blog') {
      const blob = new Blob([text], { type: "text/html" });
      const data = [new ClipboardItem({ "text/html": blob })];
      navigator.clipboard.write(data);
    } else {
      navigator.clipboard.writeText(text);
    }
    setIsCopied(true);
    showToast("클립보드에 복사되었습니다!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getWeatherIcon = (status) => {
    switch(status) {
      case 'rain': return <CloudRain size={20} className="text-white" />;
      case 'snow': return <Snowflake size={20} className="text-white" />;
      case 'cloud': return <Cloud size={20} className="text-white" />;
      default: return <Sun size={20} className="text-white" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-indigo-50 font-noto overflow-hidden relative">
      
      {/* 초강력 배포 확인용 워터마크 */}
      <div className="absolute top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none">
          <span className="bg-indigo-600 text-[10px] text-white px-4 py-1 rounded-b-xl font-black shadow-lg animate-bounce">
            FORCE UPDATED: {DEPLOY_VERSION}
          </span>
      </div>

      <header className="px-6 py-5 bg-white border-b border-indigo-100 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {step !== 'keyword' && (
            <button onClick={() => setStep('keyword')} className="p-1 hover:bg-indigo-50 rounded-lg">
              <ArrowLeft size={20} className="text-indigo-400" />
            </button>
          )}
          <h1 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase">Glunex <span className="text-indigo-600">Ai</span></h1>
        </div>
        <div className="flex items-center gap-2 bg-indigo-600 px-3 py-1.5 rounded-full shadow-md shadow-indigo-100">
          {getWeatherIcon(weather.status)}
          <span className="text-[10px] font-black text-white uppercase">{weather.desc} {weather.temp}°C</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
        {step === 'keyword' && (
          <>
            <section className="animate-fade-in">
              <div className={`p-6 rounded-[2.5rem] border-2 transition-all duration-500 ${isWeatherEnabled ? 'bg-indigo-600 border-indigo-400 shadow-xl shadow-indigo-100 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Zap size={18} className={isWeatherEnabled ? 'text-indigo-200' : 'text-indigo-600'} />
                    <h2 className="text-sm font-black uppercase tracking-tight">실시간 날씨연동</h2>
                  </div>
                  <button 
                    onClick={() => setIsWeatherEnabled(!isWeatherEnabled)}
                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isWeatherEnabled ? 'bg-indigo-400' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full transition-all duration-300 ${isWeatherEnabled ? 'right-1 bg-white' : 'left-1 bg-white shadow-sm'}`}></div>
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90 font-medium">
                  {isWeatherEnabled 
                    ? `현재 ${weather.desc} 날씨를 분석하여 고객을 설득하는 맞춤형 문구를 자동으로 추가합니다.` 
                    : "날씨와 관계없이 일반적인 홍보용 원고를 작성합니다."}
                </p>
              </div>
            </section>

            <section className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">어떤 주제로 글을 쓸까요?</h2>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">복수 선택 가능</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => toggleTopic(cat.id)}
                    className={`relative py-5 px-2 rounded-2xl border-2 transition-all duration-200 ${
                      selectedTopics.includes(cat.id)
                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-[1.03] z-10 font-bold'
                        : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200 text-xs font-bold'
                    }`}
                  >
                    {cat.name}
                    {selectedTopics.includes(cat.id) && (
                      <div className="absolute top-1.5 right-1.5 text-indigo-400 animate-fade-in">
                        <CheckCircle2 size={12} fill="currentColor" className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {step === 'generating' && (
          <div className="h-full flex flex-col items-center justify-center py-20 animate-fade-in text-center">
            <div className="relative mb-8">
              <div className="w-20 h-20 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" size={24} />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2 tracking-tight">글루넥스 AI 에이전트 가동 중</h2>
            <p className="text-xs text-slate-400 leading-relaxed px-10 font-medium">{loadingMsg}</p>
          </div>
        )}

        {step === 'title' && generatedData && (
          <section className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-black text-slate-900 tracking-tight ml-1">가장 끌리는 제목을 선택하세요</h2>
            <div className="space-y-3">
              {generatedData.titles.map((title, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setGeneratedData(prev => ({ ...prev, currentTitle: title }));
                    setStep('result');
                  }}
                  className="w-full text-left p-6 rounded-[2.2rem] bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all group"
                >
                  <p className="text-sm font-bold text-slate-800 leading-relaxed group-hover:text-indigo-600 tracking-tight">{title}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 'result' && generatedData && (
          <section className="space-y-6 animate-fade-in pb-10">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200">
              {[{id:'blog',name:'블로그'},{id:'insta',name:'인스타'},{id:'short',name:'숏폼'}].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${
                    activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[500px] relative overflow-hidden">
              <div className="absolute top-6 right-6">
                <button onClick={handleCopy} className={`p-3 rounded-2xl border transition-all ${isCopied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white border-slate-200 text-slate-400 hover:text-indigo-600'}`}>
                  {isCopied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              <div className="pt-10">
                {activeTab === 'blog' ? (
                  <div className="prose prose-slate max-w-none">
                    <h2 className="text-xl font-black text-slate-900 mb-6 leading-tight border-l-4 border-indigo-600 pl-4">{generatedData.currentTitle || generatedData.titles[0]}</h2>
                    <div className="text-sm leading-relaxed text-slate-700 font-medium" dangerouslySetInnerHTML={{ __html: getFinalBlogHtml() }} />
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

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-indigo-100 max-w-md mx-auto z-40">
        {step === 'keyword' && (
          <button 
            onClick={handleGenerate}
            disabled={selectedTopics.length === 0}
            className={`w-full py-5 rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${
              selectedTopics.length > 0 ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}
          >
            <Sparkles size={18} />
            제목 추천받기
            <ArrowRight size={16} />
          </button>
        )}
        {(step === 'result' || step === 'title') && (
          <button 
            onClick={step === 'title' ? () => setStep('keyword') : handleCopy}
            className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            {step === 'title' ? <ArrowLeft size={18}/> : isCopied ? <Check size={18}/> : <Copy size={18}/>}
            {step === 'title' ? '주제 다시 고르기' : isCopied ? '복사 완료' : '전체 내용 복사하기'}
          </button>
        )}
      </footer>
    </div>
  );
};

export default Creator;