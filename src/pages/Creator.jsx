import React, { useState, useEffect } from 'react';
import { 
  Wand2, Layout, Instagram, Video, Copy, Check, 
  ArrowLeft, Sparkles, Image as ImageIcon, AlertCircle,
  CloudRain, Sun, Snowflake, Cloud, Loader2
} from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * ============================================================
 * [글루넥스 마스터 프롬프트 설정]
 * 홍철님, 여기서 "아이폰 15 프로" 실사 감성과 말투를 수정하세요.
 * ============================================================
 */
const SYSTEM_PROMPT = `
당신은 대한민국 최고의 자동차 디테일링 전문 마케터이자 '글루넥스(GLUNEX)'의 수석 카피라이터입니다.
사용자가 선택한 [시공 항목]과 [현재 날씨]를 분석하여 네이버 블로그, 인스타그램, 숏폼 대본을 작성하세요.

[핵심 전략: 실사 및 현장감 강조]
- 블로그 사진 설명(Alt text)은 반드시 "아이폰 15 프로로 매장에서 직접 찍은 듯한 사실적인 스냅샷" 느낌으로 묘사하세요.
- 말투는 사장님이 직접 쓴 것처럼 친근하면서도 전문적이어야 합니다.

[필수 지시사항]
1. 블로그 (HTML): 
   - 전문성과 신뢰감이 느껴지는 어조를 사용하되, 사장님의 친절함이 묻어나야 함.
   - 글 중간에 [[image:CATEGORY_before]], [[image:CATEGORY_process]], [[image:CATEGORY_after]] 태그를 반드시 포함하여 사진 위치를 지정할 것.
   - 각 단계(입고, 시공중, 시공후)에 대한 상세한 설명과 디테일링 샵만의 노하우를 녹여낼 것.
2. 인스타그램: 해시태그(#)와 이모지를 풍부하게 사용하여 방문을 유도하는 감성 문구 작성.
3. 숏폼: 15초 내외의 빠른 템포 편집점과 자막 내용을 포함한 대본.

[출력 형식]
반드시 아래와 같은 순수 JSON 구조로만 응답하세요:
{
  "title": "블로그 제목",
  "blog_html": "HTML 태그가 포함된 블로그 본문",
  "insta_text": "인스타그램 게시글 전문",
  "short_form": "숏폼 영상 제작 대본"
}
`;

const Creator = ({ userStatus }) => {
  const { showToast } = useApp();
  const [step, setStep] = useState('keyword'); // keyword -> generating -> result
  const [selectedKey, setSelectedKey] = useState(null);
  const [weather, setWeather] = useState({ status: 'clear', desc: '맑음', temp: 22, region: '강남구' });
  const [generatedData, setGeneratedData] = useState(null);
  const [activeTab, setActiveTab] = useState('blog');
  const [loading, setLoading] = useState(false);

  // 14개 시공 카테고리
  const categories = [
    { id: 'wash', name: '세차' }, { id: 'detailing', name: '디테일링' },
    { id: 'coating', name: '유리막코팅' }, { id: 'undercoating', name: '언더코팅' },
    { id: 'tinting', name: '썬팅' }, { id: 'blackbox', name: '블랙박스' },
    { id: 'camera', name: '후방카메라' }, { id: 'interior_clean', name: '실내크리닝' },
    { id: 'glass_repel', name: '유리발수코팅' }, { id: 'iron_remove', name: '철분제거' },
    { id: 'wrapping', name: '랩핑' }, { id: 'ppf', name: 'PPF' },
    { id: 'ppf_life', name: '생활보호PPF' }, { id: 'ppf_interior', name: '실내PPF' }
  ];

  const getWeatherIcon = (status) => {
    switch(status) {
      case 'rain': return <CloudRain size={16} />;
      case 'snow': return <Snowflake size={16} />;
      case 'cloud': return <Cloud size={16} />;
      default: return <Sun size={16} />;
    }
  };

  // --- AI 생성 엔진 (Gemini 2.5 Flash) ---
  const generateContent = async () => {
    if (!selectedKey) return;
    setLoading(true);
    setStep('generating');

    const apiKey = ""; // 런타임에서 주입됨
    const userQuery = `
      매장명: 글루 디테일링 (GLUNEX)
      현재 날씨: ${weather.desc}, 온도: ${weather.temp}도, 지역: ${weather.region}
      시공 항목: ${selectedKey.name}
      요청: 이 정보를 바탕으로 블로그, 인스타, 숏폼 세트를 만들어줘. 사진 태그는 [[image:${selectedKey.id}_before]] 식으로 넣어줘.
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userQuery }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { 
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) throw new Error('API Error');
      const result = await response.json();
      const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsedData = JSON.parse(rawJson);
      
      // 이미지 태그 치환 로직
      parsedData.blog_html = processImageTags(parsedData.blog_html, selectedKey.id);
      
      setGeneratedData(parsedData);
      setStep('result');
    } catch (error) {
      console.error(error);
      alert("AI 생성 중 오류가 발생했습니다. 다시 시도해 주세요.");
      setStep('keyword');
    } finally {
      setLoading(false);
    }
  };

  const processImageTags = (html, categoryId) => {
    let newHtml = html;
    ['before', 'process', 'after'].forEach(status => {
      const tag = `[[image:${categoryId}_${status}]]`;
      const placeholderImg = `https://placehold.co/800x500/f8fafc/64748b?text=AI+ASSET:+${categoryId.toUpperCase()}+${status.toUpperCase()}`;
      
      const replacement = `
        <div class="my-6 rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm group relative cursor-pointer">
          <img src="${placeholderImg}" class="w-full h-auto block" alt="${status}" />
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
             <button class="bg-white text-slate-900 px-4 py-2 rounded-full text-xs font-black shadow-lg">📸 사진 교체하기</button>
          </div>
          <div class="p-4 bg-white text-center border-t border-slate-50">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              ${status === 'before' ? '시공 전 오염 상태' : status === 'process' ? '꼼꼼한 시공 과정' : '완벽한 시공 결과'}
            </p>
            <p class="text-[9px] text-blue-500 font-bold mt-1">(사진을 눌러서 실제 시공 사진으로 교체하세요)</p>
          </div>
        </div>
      `;
      newHtml = newHtml.split(tag).join(replacement);
    });
    return newHtml;
  };

  const handleCopy = () => {
    const content = activeTab === 'blog' ? generatedData.blog_html : generatedData[activeTab === 'insta' ? 'insta_text' : 'short_form'];
    
    if (activeTab === 'blog') {
      const blob = new Blob([content], { type: "text/html" });
      const data = [new ClipboardItem({ "text/html": blob })];
      navigator.clipboard.write(data);
    } else {
      navigator.clipboard.writeText(content);
    }
    
    showToast("클립보드에 복사되었습니다!");
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 헤더 */}
      <header className="px-6 py-5 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-40">
        <div className="flex items-center gap-3">
          {step !== 'keyword' && (
            <button onClick={() => setStep('keyword')} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft size={20} className="text-slate-400" />
            </button>
          )}
          <h1 className="text-lg font-black text-slate-900 tracking-tighter italic">GLUNEX <span className="text-blue-600">AI</span></h1>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
          {getWeatherIcon(weather.status)}
          <span className="text-[10px] font-black">{weather.desc} {weather.temp}°C</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 pb-32">
        {step === 'keyword' && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white relative overflow-hidden shadow-xl">
              <div className="relative z-10">
                <p className="text-[10px] font-black text-blue-400 mb-2 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles size={12} /> Today's Recommendation
                </p>
                <h2 className="text-2xl font-black leading-tight mb-2">
                  {weather.desc} 오는 오늘,<br/>
                  <span className="text-blue-400">#유리발수코팅</span> 추천해요!
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">날씨 데이터를 기반으로 분석했습니다.</p>
              </div>
              <Wand2 size={120} className="absolute right-[-20px] bottom-[-20px] text-white/5 rotate-12" />
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2 font-noto">
                <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                무엇을 시공하셨나요?
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedKey(cat)}
                    className={`p-4 rounded-2xl border text-xs font-bold transition-all ${
                      selectedKey?.id === cat.id 
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]' 
                      : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'generating' && (
          <div className="h-full flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="relative mb-8">
              <div className="w-20 h-20 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-pulse" size={24} />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">마케팅 원고 작성 중...</h2>
            <p className="text-xs text-slate-400 text-center leading-relaxed font-noto">
              날씨에 맞는 제목 선정부터 이미지 배치까지<br/>AI 에이전트가 완벽하게 구성하고 있습니다.
            </p>
          </div>
        )}

        {step === 'result' && generatedData && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              {['blog', 'insta', 'short'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                    activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  {tab === 'blog' ? '블로그' : tab === 'insta' ? '인스타' : '숏폼'}
                </button>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 p-5 rounded-[1.5rem] flex items-start gap-4">
              <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-xs font-black text-amber-900 mb-1 font-noto">사진을 교체해 보세요! 📸</p>
                <p className="text-[11px] text-amber-700 leading-relaxed font-noto">
                  생성된 이미지를 클릭하면 사장님의 <b>진짜 시공 사진</b>으로 바꿀 수 있습니다. 실제 사진이 섞여야 블로그 지수가 올라갑니다.
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[500px] relative">
              <div className="absolute top-6 right-6">
                 <button onClick={handleCopy} className="p-3 rounded-2xl border bg-white border-slate-200 text-slate-400 hover:text-blue-600 transition-all">
                  <Copy size={20} />
                 </button>
              </div>

              <div className="pt-10">
                {activeTab === 'blog' ? (
                  <div className="prose prose-slate max-w-none font-noto">
                    <h2 className="text-xl font-black text-slate-900 mb-6 leading-tight border-l-4 border-blue-600 pl-4">{generatedData.title}</h2>
                    <div className="text-sm leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: generatedData.blog_html }} />
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-noto text-sm text-slate-700 leading-relaxed pt-10">
                    {activeTab === 'insta' ? generatedData.insta_text : generatedData.short_form}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 하단 버튼 */}
      <footer className="p-6 bg-white/80 backdrop-blur-md border-t border-slate-50 fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40">
        {step === 'keyword' && (
          <button onClick={generateContent} disabled={loading || !selectedKey} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:bg-slate-300">
            <Sparkles size={18} /> {selectedKey ? `${selectedKey.name} 마케팅 시작` : '시공 항목을 선택하세요'}
          </button>
        )}
        {step === 'result' && (
          <button onClick={handleCopy} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
            <Copy size={18} /> {activeTab === 'blog' ? '블로그 전체 복사 (이미지 포함)' : '텍스트 복사하기'}
          </button>
        )}
      </footer>
    </div>
  );
};

export default Creator;