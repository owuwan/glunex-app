import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, CloudRain, Sun, Snowflake, Cloud, 
  CheckCircle2, Zap, Layout, Instagram, Video, 
  Copy, Check, ArrowLeft, ArrowRight, RefreshCw,
  Target, ListOrdered, FileText, MousePointer2,
  Camera, Wand2, Info, Eye, Smartphone, ChevronRight,
  Star, ShieldCheck, Palette, ZapOff, X, FileSearch, CheckCircle,
  Download, AlertTriangle, SmartphoneIcon, Film, Type, Hash, Clock3, Play,
  ChevronDown, MoreHorizontal
} from 'lucide-react';

/**
 * [AI 마스터 프롬프트 설정 - 모바일 앱 버전 100% 복사]
 */
const SYSTEM_PROMPT_TITLES = `
당신은 대한민국 최고의 '자동차 외장관리(Automotive Detailing)' 전문 마케터입니다.
[필수] 피부 관리, 화장품, 뷰티, 에스테틱 등 자동차와 무관한 내용은 절대로 생성하지 마세요. 
오직 자동차 광택, 세차, 유리막 코팅, 썬팅, PPF 등 자동차 전문 시공 서비스의 가치에만 집중하세요.
사용자가 선택한 자동차 시공 항목과 날씨를 분석하여 네이버 블로그 유입을 극대화하는 '자동차 시공 전문' 제목 5개를 제안하세요.
반드시 JSON 구조로만 응답하세요: { "titles": ["제목1", "제목2", "제목3", "제목4", "제목5"] }
`;

const SYSTEM_PROMPT_INDEX = `
사용자가 선택한 '자동차 시공' 제목에 맞춰 네이버 블로그 전문 5단계 목차를 구성하세요. 
모든 내용은 차량 정비 및 외장관리 공정에만 기반해야 하며, 뷰티/피부 관련 용어는 일절 금지합니다.
차량 전문 용어(도장면, 클리어층, 타르 제거, 약재 도포 등)를 반드시 사용하세요.
반드시 JSON 구조로만 응답하세요: { "index": ["1. 목차내용", "2. 목차내용", "3. 목차내용", "4. 목차내용", "5. 목차내용"] }
`;

const SYSTEM_PROMPT_CONTENT = `
당신은 대한민국 자동차 외장관리(디테일링) 전문가입니다. 선정된 5개 목차를 바탕으로 블로그 본문과 실사 이미지 프롬프트를 생성하세요.

[1단계: 본문 작성 지침]
- 자동차와 관련 없는 내용(피부, 에스테틱 등)은 절대 금지합니다. 오직 차량 시공 공정만 다루세요.
- 각 목차별 본문 내용은 공백 제외 450~550자 사이로 아주 상세하게 작성하세요. (전체 최소 2,250자 이상 필수)
- 전문적인 용어와 실제 자동차 시공 공정을 기술하세요. 상호명(GLUNEX 등) 언급 금지.
- 각 섹션 끝에 [[image_1]] ~ [[image_5]] 태그를 배치하세요.
- HTML 태그(h2, p, br, strong)를 사용하세요.

[2단계: 이미지 프롬프트 생성 지침 (장비 고증 로직 대폭 강화)]
- 모든 프롬프트(p1~p5)는 반드시 다음 형식을 준수하세요:
  "Authentic real-life photo, Authentic real-work photo, Work-in-progress (WIP) of [상황 키워드] referencing professional work images from www.naver.com. [구체적인 물리적/장비 묘사]. Raw handheld shot, iPhone 15 Pro, no UI elements, no text, realistic, harsh overhead fluorescent lighting, blurred license plate."
- [장비 및 도구 필수 고증]: 
  1. 철분제거: "Thin, watery, translucent dark-purple streaks bleeding. NO thick paint."
  2. 유리막/코팅: "Hand holding a black rectangular coating block wrapped in a blue suede cloth, applying thin liquid."
  3. 광택/폴리싱: "Technician using a Dual-action polisher machine with a yellow foam pad, visible compound splashes on paint swirl marks."
  4. 썬팅/PPF: "Professional plastic squeegee pushing out soapy water from under the film, handheld heat gun nearby."
  5. 실내크리닝: "Handheld steam cleaner nozzle emitting white steam, vacuum extractor nozzle on carpet, soft detailing brushes for air vents."
  6. 배경: "Modern Korean detailing shop with high-intensity grid LED ceiling lights."

[출력 형식]
JSON 응답: { "blog_html": "...", "insta_text": "...", "short_form": "...", "image_prompts": { "p1": "...", "p2": "...", "p3": "...", "p4": "...", "p5": "..." } }
`;

// [오류 수정] Canvas 환경의 컴파일러 경고를 방지하기 위해 import.meta.env 접근 방식을 안전하게 변경합니다.
// 실제 빌드 환경(Vite)에서는 정상 작동하며, Preview 환경에서의 크래시를 방지합니다.
const getEnvVar = (key) => {
  try {
    // @ts-ignore
    return import.meta.env[key];
  } catch (e) {
    return undefined;
  }
};

const apiKey = ""; // Gemini API 키 (환경에서 제공됨)

const Creator = () => {
  const navigate = useNavigate();
  
  const [step, setStep] = useState('keyword'); 
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState('title'); 
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0); 
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

  const copyBufferRef = useRef(null);

  const loadingMessages = {
    title: [
      "고객의 시선을 사로잡는\n최적의 자동차 시공 제목을 설계 중입니다",
      "검색량 분석을 통해 유입이 가장 잘 되는\n차량 관련 키워드를 추출하고 있습니다",
      "예약 전환율을 높이는\n전략적인 첫 문장을 고민하고 있습니다"
    ],
    index: [
      "차량 전문가의 깊이가 느껴지는\n체계적인 목차를 구성하고 있습니다",
      "글의 논리적인 흐름과\nSEO 최적화 구조를 설계 중입니다",
      "사장님의 전문성을 돋보이게 할\n스토리보드를 완성하고 있습니다"
    ],
    content: [
      "실제 시공 현장의 생생함을 담은 이미지를\n비용 최적화 실사 질감으로 현상하고 있습니다",
      "디테일링 전문가의 관점에서\n정성스럽게 전문 원고를 집필 중입니다",
      "이미지와 글의 완벽한 복사 호환을 위해\n데이터 구조를 정밀하게 가공하고 있습니다",
      "네이버 블로그 알고리즘에 맞춘\n맞춤형 포스팅을 곧 완성합니다"
    ]
  };

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % (loadingMessages[loadingType]?.length || 1));
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [loading, loadingType]);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const WEATHER_KEY = getEnvVar('VITE_WEATHER_API_KEY');
        if (!WEATHER_KEY) throw new Error("No API Key");
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid=${WEATHER_KEY}&units=metric&lang=kr`);
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

  // [오류 수정] 403 오류 해결을 위해 Gemini API 호출 시 지수 백오프와 적절한 키 참조를 적용합니다.
  const callGemini = async (prompt, systemPrompt) => {
    const GEMINI_KEY = getEnvVar('VITE_FIREBASE_API_KEY') || apiKey;
    let delay = 1000;
    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { responseMimeType: "application/json" }
          })
        });
        
        if (response.status === 403) throw new Error("Forbidden: Check API Key and Permissions");
        
        const resData = await response.json();
        if (!resData.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error("Invalid response from Gemini");
        
        return JSON.parse(resData.candidates[0].content.parts[0].text);
      } catch (error) {
        if (i === 4) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  // Fal AI 호출 로직 복구
  const callFalAI = async (prompt) => {
    const FAL_KEY = getEnvVar('VITE_FAL_API_KEY');
    if (!FAL_KEY || FAL_KEY === "undefined") return null;
    try {
      const response = await fetch("https://fal.run/fal-ai/flux-2", {
        method: "POST",
        headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
          image_size: { width: 768, height: 576 } 
        })
      });
      const data = await response.json();
      return data.images[0].url;
    } catch (e) { return null; }
  };

  const handleGenerateTitles = async () => {
    if (selectedTopics.length === 0) return alert("시공 항목을 선택해주세요.");
    setLoadingType('title');
    setLoadingMsgIndex(0);
    setLoading(true);
    try {
      const selectedNames = categories.filter(c => selectedTopics.includes(c.id)).map(c => c.name).join(', ');
      const data = await callGemini(`시공: ${selectedNames}, 날씨: ${weather.desc}`, SYSTEM_PROMPT_TITLES);
      setTitles(data.titles);
      setStep('title');
    } catch (e) { 
      console.error(e);
      alert("AI 연결 오류가 발생했습니다. API 키 설정을 확인해주세요."); 
    }
    finally { setLoading(false); }
  };

  const handleGenerateIndex = async (title) => {
    setSelectedTitle(title);
    setLoadingType('index');
    setLoadingMsgIndex(0);
    setLoading(true);
    try {
      const data = await callGemini(`제목: ${title}`, SYSTEM_PROMPT_INDEX);
      setIndexList(data.index);
      setStep('index');
    } catch (e) { alert("목차 구성 실패"); }
    finally { setLoading(false); }
  };

  const handleGenerateFullContent = async () => {
    setLoadingType('content');
    setLoadingMsgIndex(0);
    setLoading(true);
    try {
      const data = await callGemini(`제목: ${selectedTitle}, 목차: ${indexList.join(', ')}`, SYSTEM_PROMPT_CONTENT);
      const images = await Promise.all([
        callFalAI(data.image_prompts.p1), callFalAI(data.image_prompts.p2),
        callFalAI(data.image_prompts.p3), callFalAI(data.image_prompts.p4),
        callFalAI(data.image_prompts.p5)
      ]);

      let finalHtml = data.blog_html;
      images.forEach((url, i) => {
        const replacement = url ? `
          <p style="text-align: center; margin: 30px 0;">
            <img src="${url}" width="100%" style="display: block; border-radius: 12px; shadow: 0 4px 12px rgba(0,0,0,0.1);" alt="시공 사진" />
          </p>
        ` : `<p>[이미지 처리 중]</p>`;
        finalHtml = finalHtml.replace(`[[image_${i + 1}]]`, replacement);
      });

      setGeneratedData({ ...data, blog_html: finalHtml });
      setStep('result');
    } catch (e) { alert("최종 생성 오류"); }
    finally { setLoading(false); }
  };

  const handleCopy = async () => {
    if (!generatedData) return;
    try {
      if (activeTab === 'blog' && copyBufferRef.current) {
        const buffer = copyBufferRef.current;
        buffer.style.display = 'block';
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(buffer);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('copy');
        selection.removeAllRanges();
        buffer.style.display = 'none';
        setIsCopied(true);
        showToast("이미지와 원고가 복사되었습니다!");
        setTimeout(() => setIsCopied(false), 2000);
      } else {
        const text = activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form;
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        showToast("텍스트가 복사되었습니다!");
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (err) { alert("복사 실패"); }
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans overflow-hidden">
      
      {toastMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-700 font-bold">
            <CheckCircle2 size={18} className="text-emerald-400" /> {toastMsg}
          </div>
        </div>
      )}

      {/* 헤더 섹션 */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="bg-indigo-600 text-white p-1 rounded-lg"><Sparkles size={16} /></div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">GLUNEX <span className="text-indigo-600 not-italic">AI STUDIO</span></h1>
          </div>
          <p className="text-slate-500 text-sm font-medium italic">Professional Detailing Content Studio</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white border border-slate-200 rounded-2xl flex items-center gap-2 shadow-sm">
            {weather.status === 'rain' ? <CloudRain size={16} className="text-blue-500" /> : <Sun size={16} className="text-amber-500" />}
            <span className="text-sm font-bold text-slate-600 uppercase">{weather.desc} {weather.temp}°C</span>
          </div>
          <button 
            onClick={() => {
              if(step === 'keyword') navigate('/dashboard');
              else if(step === 'title') setStep('keyword');
              else if(step === 'index') setStep('title');
              else setStep('index');
            }}
            className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-5 gap-8 min-h-0 overflow-hidden">
        
        {/* 좌측 제어 패널 */}
        <div className="col-span-2 flex flex-col space-y-4 min-h-0 overflow-hidden">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <span className="font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Target size={18} className="text-indigo-600" /> Step Management
              </span>
              <div className="flex gap-1">
                {['keyword', 'title', 'index', 'result'].map((s, idx) => (
                  <div key={idx} className={`w-6 h-1 rounded-full ${step === s ? 'bg-indigo-600' : 'bg-slate-100'}`} />
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-8 py-20">
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <Sparkles size={36} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" />
                  </div>
                  <div className="space-y-3">
                    <p className="font-black text-slate-900 text-xl tracking-tight leading-snug whitespace-pre-line">
                      {loadingMessages[loadingType][loadingMsgIndex]}
                    </p>
                  </div>
                </div>
              ) : step === 'keyword' ? (
                <div className="space-y-8">
                  <div className="p-7 rounded-[2rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-100">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-black tracking-tight flex items-center gap-2"><Zap size={20} /> 날씨 연동 시스템</h4>
                      <button 
                        onClick={() => setIsWeatherEnabled(!isWeatherEnabled)}
                        className={`w-14 h-7 rounded-full relative transition-all ${isWeatherEnabled ? 'bg-white/30' : 'bg-slate-400/50'}`}
                      >
                        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all ${isWeatherEnabled ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                    <p className="mt-5 text-sm font-medium text-indigo-100 leading-relaxed italic border-t border-white/10 pt-5">
                      {isWeatherEnabled ? `현재 서울의 '${weather.desc}' 날씨를 분석하여 예약 전환율을 높이는 시나리오를 설계합니다.` : "기본 마케팅 모드로 작동합니다."}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">시공 품목 선택</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {categories.map((cat) => (
                        <button 
                          key={cat.id} 
                          onClick={() => setSelectedTopics(p => p.includes(cat.id) ? p.filter(t => t !== cat.id) : [...p, cat.id])}
                          className={`py-5 px-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden group ${
                            selectedTopics.includes(cat.id)
                              ? 'bg-slate-900 border-slate-900 text-white shadow-xl'
                              : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'
                          }`}
                        >
                          <span className="text-[14px] font-black">{cat.name}</span>
                          {selectedTopics.includes(cat.id) && <CheckCircle size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : step === 'title' ? (
                <div className="space-y-4">
                   <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest italic">Recommended Headlines</h3>
                   <div className="space-y-3">
                     {titles.map((t, i) => (
                       <button 
                        key={i} 
                        onClick={() => handleGenerateIndex(t)}
                        className="w-full text-left p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-600 hover:bg-white hover:shadow-2xl transition-all group"
                       >
                         <p className="text-base font-bold text-slate-800 group-hover:text-indigo-600 leading-snug">{t}</p>
                       </button>
                     ))}
                   </div>
                </div>
              ) : step === 'index' ? (
                <div className="space-y-6">
                  <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Headline</h4>
                    <p className="text-base font-black text-indigo-900 leading-tight">{selectedTitle}</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">AI 시공 전문 목차</h3>
                    <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-5 shadow-inner">
                      {indexList.map((idx, i) => (
                        <div key={i} className="flex gap-4 items-start">
                          <div className="w-6 h-6 rounded-lg bg-slate-100 text-[10px] font-black flex items-center justify-center text-slate-500 shrink-0">{i+1}</div>
                          <p className="text-sm font-bold text-slate-700 leading-snug">{idx}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center space-y-6 py-20 text-center">
                   <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 animate-bounce mx-auto">
                     <CheckCircle2 size={32} />
                   </div>
                   <div>
                     <h3 className="text-xl font-black text-slate-900">콘텐츠 생성 완료!</h3>
                     <p className="text-sm text-slate-500 mt-2 font-medium">우측 창에서 최종 결과물을 확인하세요.</p>
                   </div>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-100 shrink-0">
              {step === 'keyword' && (
                <button 
                  onClick={handleGenerateTitles}
                  disabled={selectedTopics.length === 0 || loading}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <Sparkles size={22} className="text-amber-300" /> 제목 생성 시작
                </button>
              )}
              {step === 'index' && (
                <button 
                  onClick={handleGenerateFullContent}
                  className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg shadow-xl hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <FileText size={22} className="text-indigo-400" /> 시공 전문 원고 집필
                </button>
              )}
              {step === 'result' && (
                <button 
                  onClick={() => setStep('keyword')}
                  className="w-full py-5 bg-white border border-slate-200 text-slate-500 rounded-[2rem] font-black text-lg hover:bg-slate-50 active:scale-[0.98] transition-all shadow-sm"
                >
                  새로운 콘텐츠 만들기
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 우측 미리보기 패널 */}
        <div className="col-span-3 bg-slate-100 rounded-[3.5rem] border border-slate-200 overflow-hidden flex flex-col relative shadow-inner">
          <div className="absolute top-8 left-8 flex items-center gap-3 bg-white/90 backdrop-blur-xl px-5 py-2.5 rounded-full shadow-lg z-20 border border-white/50">
            <div className={`w-2 h-2 rounded-full ${step === 'result' ? 'bg-emerald-500' : 'bg-amber-400'} animate-pulse`} />
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest italic">
              {step === 'result' ? 'Content Finalized' : 'AI System Ready'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-12 scrollbar-hide flex flex-col items-center">
            {step === 'result' && generatedData ? (
               <div className="w-full max-w-2xl animate-in fade-in slide-in-from-right-10 duration-700">
                  <div className="flex bg-white/60 backdrop-blur p-1.5 rounded-2xl border border-white mb-10 shadow-sm">
                    {[
                      { id: 'blog', name: '블로그', icon: <Layout size={16}/> },
                      { id: 'insta', name: '인스타그램', icon: <Instagram size={16}/> },
                      { id: 'short', name: '숏폼 가이드', icon: <Film size={16}/> }
                    ].map(tab => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-900'}`}
                      >
                        {tab.icon} {tab.name}
                      </button>
                    ))}
                  </div>

                  <div className="bg-white rounded-[4rem] p-12 shadow-2xl border border-white min-h-[600px] text-left overflow-hidden">
                    {activeTab === 'blog' ? (
                      <article className="prose prose-slate max-w-none">
                        <div className="mb-14 pb-8 border-b border-slate-50">
                           <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] mb-4 italic">Automotive Detailing Blog Report</p>
                           <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight !mt-0">{selectedTitle}</h2>
                        </div>
                        <div className="space-y-10 blog-content-view" 
                             style={{ 
                               fontSize: '1rem', 
                               lineHeight: '1.9', 
                               color: '#475569', 
                               textAlign: 'justify', 
                               wordBreak: 'keep-all' 
                             }}
                             dangerouslySetInnerHTML={{ __html: generatedData.blog_html }} />
                      </article>
                    ) : activeTab === 'insta' ? (
                      <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-[2rem]">
                          <div className="w-14 h-14 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg"><Instagram size={28}/></div>
                          <div>
                            <p className="font-black text-slate-900 text-lg tracking-tight italic">Social Engagement Feed</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic leading-none">Algorithm Optimized Content</p>
                          </div>
                        </div>
                        <div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100 font-bold text-slate-700 leading-relaxed whitespace-pre-wrap italic shadow-inner">
                          {generatedData.insta_text}
                        </div>
                        <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 shadow-sm">
                          <p className="text-[11px] font-black text-indigo-600 uppercase mb-3 flex items-center gap-2 tracking-widest italic"><Hash size={14}/> Recommended Hashtags</p>
                          <p className="text-xs text-indigo-400 font-bold tracking-tight leading-relaxed">#GLUNEX #디테일링 #시공후기 #차쟁이 #유리막코팅 #카스타그램 #세차스타그램 #명품시공</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center gap-4 p-5 bg-slate-900 rounded-[2rem] text-white shadow-xl">
                          <Film size={28} className="text-blue-400" />
                          <div>
                            <p className="font-black text-lg tracking-tight italic">Short-form Script</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Video Production Guide</p>
                          </div>
                        </div>
                        <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-white/90 border border-slate-800">
                           <pre className="whitespace-pre-wrap text-base font-bold italic leading-relaxed text-white drop-shadow-md">{generatedData.short_form}</pre>
                        </div>
                      </div>
                    )}
                  </div>
               </div>
            ) : (
               <div className="w-full max-w-lg h-[750px] bg-white rounded-[4rem] shadow-2xl border-[12px] border-slate-900 relative flex flex-col items-center justify-center text-center p-12">
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-900 rounded-full" />
                  <div className="space-y-8 opacity-20">
                    <MousePointer2 size={64} className="mx-auto text-indigo-600 animate-bounce" />
                    <div className="space-y-3">
                       <h5 className="font-black text-slate-900 text-2xl uppercase italic tracking-tighter">Awaiting Logic Input</h5>
                       <p className="text-sm text-slate-400 font-bold uppercase tracking-widest leading-relaxed">좌측 패널에서 시공 항목을 선택하면<br/>이곳에 AI 실시간 미리보기가 생성됩니다.</p>
                    </div>
                  </div>
               </div>
            )}
          </div>

          {step === 'result' && (
            <div className="p-10 bg-white/95 backdrop-blur-2xl border-t border-slate-200 shrink-0 flex items-center justify-between z-30">
               <div className="flex items-center gap-5">
                  <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 shadow-inner"><Download size={24} /></div>
                  <div className="text-left">
                    <p className="text-base font-black text-slate-900 italic uppercase leading-none">Content Verified</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Ready for deployment</p>
                  </div>
               </div>
               <div className="flex gap-4">
                  <button 
                    onClick={handleCopy}
                    className={`px-10 py-5 ${isCopied ? 'bg-emerald-600' : 'bg-slate-900'} text-white rounded-[2rem] font-black text-lg flex items-center gap-4 transition-all hover:scale-[1.03] shadow-2xl active:scale-95`}
                  >
                    {isCopied ? <CheckCircle2 size={24} /> : <Copy size={24} />}
                    {isCopied ? '복사 완료' : '전체 내용 복사'}
                  </button>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* 복사 버퍼 (숨김) */}
      <div 
        ref={copyBufferRef}
        style={{ 
          position: 'absolute', top: '-9999px', left: '-9999px',
          width: '600px', pointerEvents: 'none', userSelect: 'all', display: 'none'
        }}
        dangerouslySetInnerHTML={{ __html: generatedData ? `<h2>${selectedTitle}</h2>` + generatedData.blog_html : '' }}
      />
    </div>
  );
};

export default Creator;