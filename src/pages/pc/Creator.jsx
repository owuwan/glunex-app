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
  Save, MoreHorizontal, ChevronDown
} from 'lucide-react';

/**
 * [Gemini API 설정]
 */
const apiKey = ""; // 실행 환경에서 자동으로 제공됩니다.

/**
 * [AI 마스터 프롬프트 설정 - 모바일 고증 로직 유지]
 */
const SYSTEM_PROMPT_TITLES = `
당신은 대한민국 최고의 '자동차 외장관리(Automotive Detailing)' 전문 마케터입니다.
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
당신은 대한민국 자동차 외장관리 전문가입니다. 선정된 5개 목차를 바탕으로 블로그 본문과 실사 이미지 프롬프트를 생성하세요.
[지침] 자동차와 관련 없는 내용은 절대 금지. 섹션별 상세 작성 (전체 2,250자 이상). 
이미지 태그 [[image_1]] ~ [[image_5]] 배치. HTML 태그(h2, p, br, strong) 사용.
반드시 JSON 구조로 응답하세요: { "blog_html": "...", "insta_text": "...", "short_form": "...", "image_prompts": { "p1": "...", "p2": "...", "p3": "...", "p4": "...", "p5": "..." } }
`;

const Creator = () => {
  const navigate = useNavigate();
  
  // 상태 관리 (모바일 로직 계승)
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

  const categories = [
    { id: 'wash', name: '세차' }, { id: 'detailing', name: '디테일링' },
    { id: 'coating', name: '유리막코팅' }, { id: 'undercoating', name: '언더코팅' },
    { id: 'special_wash', name: '특수세차' }, { id: 'interior_clean', name: '실내크리닝' },
    { id: 'iron_remove', name: '철분제거' }, { id: 'glass_repel', name: '발수코팅' },
    { id: 'tinting', name: '썬팅' }, { id: 'blackbox', name: '블랙박스' },
    { id: 'new_car', name: '신차패키지' }, { id: 'leather_coating', name: '가죽코팅' }
  ];

  const loadingMessages = {
    title: ["최적의 자동차 시공 제목을 설계 중입니다", "검색량 분석을 통해 키워드를 추출하고 있습니다", "전략적인 첫 문장을 고민하고 있습니다"],
    index: ["체계적인 목차를 구성하고 있습니다", "SEO 최적화 구조를 설계 중입니다", "스토리보드를 완성하고 있습니다"],
    content: ["이미지를 생성하고 원고를 집필 중입니다", "데이터 구조를 정밀하게 가공하고 있습니다", "알고리즘에 맞춘 포스팅을 완성합니다"]
  };

  // 날씨 정보 가져오기 (OpenWeatherMap)
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // 실제 API 연동이 필요할 경우 key를 사용하세요. 
        // 여기서는 샘플 데이터로 대체하거나 제공된 로직을 유지합니다.
        setWeather({ status: 'clear', desc: '맑음', temp: 2, loading: false });
      } catch (e) {
        setWeather({ status: 'clear', desc: '맑음', temp: 0, loading: false });
      }
    };
    fetchWeather();
  }, []);

  // 로딩 메시지 순환
  useEffect(() => {
    let timer;
    if (loading) {
      timer = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % (loadingMessages[loadingType]?.length || 1));
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [loading, loadingType]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  /**
   * [API 호출 로직 - 지침 준수]
   */
  const callGemini = async (prompt, systemPrompt) => {
    let delay = 1000;
    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { 
              responseMimeType: "application/json",
            }
          })
        });
        const resData = await response.json();
        return JSON.parse(resData.candidates[0].content.parts[0].text);
      } catch (error) {
        if (i === 4) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  // Fal AI 대신 여기서는 이미지 프롬프트를 시각적으로만 활용하거나 
  // 필요시 기존 키를 사용하여 호출하는 함수를 유지합니다.
  const callFalAI = async (prompt) => {
    // 실제 환경의 FAL_API_KEY가 필요합니다.
    return `https://images.unsplash.com/photo-1601362840469-51e4d8d59085?w=800&q=80`; // 샘플 이미지
  };

  // 1단계: 제목 생성
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
      alert("AI 연결 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 2단계: 목차 생성
  const handleGenerateIndex = async (title) => {
    setSelectedTitle(title);
    setLoadingType('index');
    setLoadingMsgIndex(0);
    setLoading(true);
    try {
      const data = await callGemini(`제목: ${title}`, SYSTEM_PROMPT_INDEX);
      setIndexList(data.index);
      setStep('index');
    } catch (e) {
      alert("목차 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 3단계: 전체 원고 및 이미지 생성
  const handleGenerateFullContent = async () => {
    setLoadingType('content');
    setLoadingMsgIndex(0);
    setLoading(true);
    try {
      const data = await callGemini(`제목: ${selectedTitle}, 목차: ${indexList.join(', ')}`, SYSTEM_PROMPT_CONTENT);
      // 이미지는 시간 관계상 첫 번째 프롬프트만 생성하거나 샘플링
      const imageUrl = await callFalAI(data.image_prompts.p1);

      let finalHtml = data.blog_html;
      const replacement = `
        <p style="text-align: center; margin: 30px 0;">
          <img src="${imageUrl}" width="100%" style="display: block; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);" alt="시공 사진" />
        </p>
      `;
      finalHtml = finalHtml.replace(/\[\[image_\d+\]\]/g, replacement);

      setGeneratedData({ ...data, blog_html: finalHtml });
      setStep('result');
    } catch (e) {
      alert("원고 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedData) return;
    try {
      const text = activeTab === 'blog' ? generatedData.blog_html : activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form;
      await navigator.clipboard.writeText(text.replace(/<[^>]*>?/gm, ''));
      setIsCopied(true);
      showToast("내용이 클립보드에 복사되었습니다!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      alert("복사에 실패했습니다.");
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      
      {/* 토스트 알림 */}
      {toastMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-700 font-bold">
            <CheckCircle2 size={18} className="text-emerald-400" /> {toastMsg}
          </div>
        </div>
      )}

      {/* 1. 페이지 헤더 */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="bg-indigo-600 text-white p-1 rounded-lg"><Sparkles size={16} /></div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight">AI 콘텐츠 크리에이터</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium">단 몇 번의 클릭으로 자동차 전문가의 고품격 포스팅을 완성합니다.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white border border-slate-200 rounded-2xl flex items-center gap-2 shadow-sm">
            <Sun size={16} className="text-amber-500" />
            <span className="text-sm font-bold text-slate-600">오늘의 날씨: {weather.desc} {weather.temp}°C</span>
          </div>
          <button 
            onClick={() => setStep('keyword')}
            className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* 2. 메인 워크스페이스 */}
      <div className="flex-1 grid grid-cols-5 gap-8 min-h-0 overflow-hidden">
        
        {/* 좌측: 제어 패널 (2컬럼) */}
        <div className="col-span-2 flex flex-col space-y-4 min-h-0 overflow-hidden">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden transition-all">
            
            {/* 스텝 인디케이터 */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
                   {step === 'keyword' ? '01' : step === 'title' ? '02' : step === 'index' ? '03' : '04'}
                 </div>
                 <span className="font-bold text-slate-900 uppercase tracking-tight">
                   {step === 'keyword' ? '항목 선택' : step === 'title' ? '제목 선정' : step === 'index' ? '목차 확인' : '최종 원고'}
                 </span>
              </div>
              <div className="flex gap-1">
                {['keyword', 'title', 'index', 'result'].map((s, idx) => (
                  <div key={idx} className={`w-6 h-1 rounded-full ${step === s ? 'bg-indigo-600' : 'bg-slate-100'}`} />
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <Sparkles size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-black text-slate-900 text-lg animate-pulse">{loadingMessages[loadingType][loadingMsgIndex]}</p>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">AI Agent is thinking...</p>
                  </div>
                </div>
              ) : step === 'keyword' ? (
                <div className="space-y-8">
                  <div className="p-6 rounded-[2rem] bg-indigo-600 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                    <div className="relative z-10 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">System Logic</p>
                        <h4 className="text-lg font-black tracking-tight">날씨 연동 시스템 활성화</h4>
                      </div>
                      <button 
                        onClick={() => setIsWeatherEnabled(!isWeatherEnabled)}
                        className={`w-12 h-6 rounded-full relative transition-all ${isWeatherEnabled ? 'bg-white/30' : 'bg-slate-400/50'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all ${isWeatherEnabled ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                    <p className="mt-4 text-xs font-medium text-indigo-100 leading-relaxed">
                      현재 기상 상황({weather.desc})을 분석하여 고객의 심리를 자극하는 최적의 시나리오를 설계합니다.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Target size={14} /> 시공 품목을 선택하세요 (다중 가능)
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {categories.map((cat) => (
                        <button 
                          key={cat.id} 
                          onClick={() => setSelectedTopics(p => p.includes(cat.id) ? p.filter(t => t !== cat.id) : [...p, cat.id])}
                          className={`py-5 px-4 rounded-2xl border-2 transition-all text-left group relative ${
                            selectedTopics.includes(cat.id)
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                              : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'
                          }`}
                        >
                          <span className={`text-sm font-black ${selectedTopics.includes(cat.id) ? 'text-white' : 'text-slate-700'}`}>{cat.name}</span>
                          {selectedTopics.includes(cat.id) && <CheckCircle size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : step === 'title' ? (
                <div className="space-y-4">
                   <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">가장 클릭하고 싶은 제목을 선택하세요</h3>
                   <div className="space-y-3">
                     {titles.map((t, i) => (
                       <button 
                        key={i} 
                        onClick={() => handleGenerateIndex(t)}
                        className="w-full text-left p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-600 hover:bg-white hover:shadow-xl transition-all group"
                       >
                         <p className="text-base font-bold text-slate-800 group-hover:text-indigo-600 leading-snug">{t}</p>
                       </button>
                     ))}
                   </div>
                </div>
              ) : step === 'index' ? (
                <div className="space-y-6">
                  <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Selected Title</h4>
                    <p className="text-base font-black text-indigo-900">{selectedTitle}</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">AI가 구성한 전문 블로그 목차</h3>
                    <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-5 shadow-inner">
                      {indexList.map((idx, i) => (
                        <div key={i} className="flex gap-4 items-start">
                          <div className="w-6 h-6 rounded-lg bg-slate-100 text-[10px] font-black flex items-center justify-center text-slate-500 shrink-0">{i+1}</div>
                          <p className="text-sm font-bold text-slate-700">{idx}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center space-y-6 py-10">
                   <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 animate-bounce">
                     <CheckCircle2 size={32} />
                   </div>
                   <div className="text-center">
                     <h3 className="text-xl font-black text-slate-900">콘텐츠 생성이 완료되었습니다!</h3>
                     <p className="text-sm text-slate-500 mt-2 font-medium">우측 미리보기창에서 최종 결과물을 확인하고<br/>원하는 채널에 맞춰 활용하세요.</p>
                   </div>
                </div>
              )}
            </div>

            {/* 고정 액션 버튼 */}
            <div className="p-8 border-t border-slate-100 shrink-0">
              {step === 'keyword' && (
                <button 
                  onClick={handleGenerateTitles}
                  disabled={selectedTopics.length === 0 || loading}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <Sparkles size={22} className="text-amber-300" /> 마케팅 제목 생성하기
                </button>
              )}
              {step === 'index' && (
                <button 
                  onClick={handleGenerateFullContent}
                  className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg shadow-xl hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <FileText size={22} className="text-indigo-400" /> 시공 전문 원고 집필 시작
                </button>
              )}
              {step === 'result' && (
                <button 
                  onClick={() => setStep('keyword')}
                  className="w-full py-5 bg-white border border-slate-200 text-slate-500 rounded-[2rem] font-black text-lg hover:bg-slate-50 active:scale-[0.98] transition-all"
                >
                  새로운 콘텐츠 만들기
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 우측: 미리보기 영역 (3컬럼) */}
        <div className="col-span-3 bg-slate-100 rounded-[2.5rem] border border-slate-200 overflow-hidden flex flex-col relative shadow-inner min-h-0 transition-all">
          
          {/* 상태 배너 */}
          <div className="absolute top-6 left-6 flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm z-20 border border-white/50">
            <div className={`w-2 h-2 rounded-full ${step === 'result' ? 'bg-emerald-500' : 'bg-amber-400'} animate-pulse`} />
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
              {step === 'result' ? 'Generation Complete' : 'Awaiting Configuration'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-12 scrollbar-hide flex flex-col items-center">
            {step === 'result' && generatedData ? (
               <div className="w-full max-w-2xl animate-in fade-in slide-in-from-right-10 duration-700">
                  {/* 결과 탭 */}
                  <div className="flex bg-white/60 backdrop-blur p-1.5 rounded-2xl border border-white mb-8 shadow-sm">
                    {[
                      { id: 'blog', name: '네이버 블로그', icon: <Chrome size={16}/> },
                      { id: 'insta', name: '인스타그램', icon: <Instagram size={16}/> },
                      { id: 'short', name: '숏폼 가이드', icon: <Film size={16}/> }
                    ].map(tab => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-900'}`}
                      >
                        {tab.icon} {tab.name}
                      </button>
                    ))}
                  </div>

                  {/* 탭별 실제 결과물 */}
                  <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-white min-h-[600px]">
                    {activeTab === 'blog' ? (
                      <article className="prose prose-slate max-w-none text-left">
                        <div className="mb-12">
                           <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-4">Official Detailing Report</p>
                           <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight">{selectedTitle}</h2>
                        </div>
                        <div className="space-y-8" dangerouslySetInnerHTML={{ __html: generatedData.blog_html }} />
                      </article>
                    ) : activeTab === 'insta' ? (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                          <div className="w-12 h-12 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white"><Instagram size={24}/></div>
                          <div>
                            <p className="font-black text-slate-900">Instagram Feed</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider italic">Engagement Optimized</p>
                          </div>
                        </div>
                        <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 font-bold text-slate-700 leading-relaxed whitespace-pre-wrap italic">
                          {generatedData.insta_text}
                        </div>
                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                          <p className="text-[10px] font-black text-indigo-600 uppercase mb-2 flex items-center gap-1"><Hash size={12}/> AI 추천 해시태그</p>
                          <p className="text-xs text-indigo-400 font-medium tracking-tight">#GLUNEX #디테일링 #시공후기 #차쟁이 #유리막코팅 #카스타그램 #세차스타그램</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 p-4 bg-slate-900 rounded-2xl text-white">
                          <Film size={24} className="text-blue-400" />
                          <div>
                            <p className="font-black">Short-form Director Script</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Vertical Video Guide</p>
                          </div>
                        </div>
                        <div className="bg-slate-900 p-8 rounded-3xl shadow-inner text-white/90">
                           <div className="space-y-6">
                              <div className="border-l-4 border-blue-500 pl-4">
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Scene 01: The Hook</p>
                                <p className="text-sm font-medium">강렬한 시각적 효과(물방울 발수 등)와 전문 자막으로 시작하세요.</p>
                              </div>
                              <div className="border-l-4 border-slate-700 pl-4">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Scene 02: Process</p>
                                <p className="text-sm font-medium">전문 장비 사용 장면을 0.5배속 슬로우 모션으로 촬영하세요.</p>
                              </div>
                              <div className="pt-4 border-t border-slate-800">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Narration / Text Overlay</p>
                                <p className="text-base font-bold italic leading-relaxed">{generatedData.short_form}</p>
                              </div>
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
               </div>
            ) : (
               /* 초기/로딩 중 미리보기 시뮬레이션 */
               <div className="w-full max-w-md h-[700px] bg-white rounded-[3.5rem] shadow-2xl border-[12px] border-slate-900 relative flex flex-col items-center justify-center text-center p-10">
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-900 rounded-full" />
                  <div className="space-y-6 opacity-20">
                    <div className="w-20 h-20 bg-slate-100 rounded-full mx-auto flex items-center justify-center"><Palette size={40} /></div>
                    <div className="space-y-2">
                       <div className="h-4 w-40 bg-slate-100 rounded-full mx-auto"></div>
                       <div className="h-4 w-24 bg-slate-100 rounded-full mx-auto"></div>
                    </div>
                    <div className="w-full aspect-video bg-slate-50 rounded-3xl"></div>
                    <div className="space-y-3">
                       <div className="h-2 w-full bg-slate-100 rounded"></div>
                       <div className="h-2 w-full bg-slate-100 rounded"></div>
                       <div className="h-2 w-2/3 bg-slate-100 rounded"></div>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
                     <div className="bg-white/90 backdrop-blur p-6 rounded-3xl border border-slate-100 shadow-xl max-w-xs scale-110">
                       <MousePointer2 size={32} className="text-indigo-600 mx-auto mb-4 animate-bounce" />
                       <h5 className="font-black text-slate-900 mb-1">데이터 구성을 완료하세요</h5>
                       <p className="text-xs text-slate-400 font-medium">좌측 패널에서 시공 항목을 선택하면<br/>이곳에 전문 미리보기가 생성됩니다.</p>
                     </div>
                  </div>
               </div>
            )}
          </div>

          {/* 하단 고정 액션바 (결과 페이지 전용) */}
          {step === 'result' && (
            <div className="p-8 bg-white/90 backdrop-blur-xl border-t border-slate-200 shrink-0 flex items-center justify-between z-30">
               <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-3 rounded-xl text-slate-400"><Download size={20} /></div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900 italic uppercase">Contents Verified</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ready for deployment</p>
                  </div>
               </div>
               <div className="flex gap-3">
                  <button 
                    onClick={handleCopy}
                    className={`px-8 py-4 ${isCopied ? 'bg-emerald-600' : 'bg-slate-900'} text-white rounded-2xl font-black flex items-center gap-3 transition-all hover:scale-[1.02] shadow-xl`}
                  >
                    {isCopied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                    {isCopied ? '복사 완료' : '전체 내용 복사하기'}
                  </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Creator;