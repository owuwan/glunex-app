import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles, Layout, Instagram, Video, Copy, Check, Search, RefreshCw, Wand2, ArrowLeft, Image as ImageIcon } from 'lucide-react';

const Creator = () => {
  const navigate = useNavigate();
  
  // Step Control
  const [step, setStep] = useState('url'); 
  const [loading, setLoading] = useState(false);

  // Data States
  const [blogUrl, setBlogUrl] = useState('');
  const [blogAnalysis, setBlogAnalysis] = useState(null);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [tocList, setTocList] = useState([]);
  const [generatedContent, setGeneratedContent] = useState({ blog: '', insta: '', short: '' });
  const [activeResultTab, setActiveResultTab] = useState('blog');
  const [isCopied, setIsCopied] = useState(false);
  
  // 복사할 콘텐츠 영역 참조
  const contentRef = useRef(null);

  const categories = ["세차", "디테일링", "유리막코팅", "언더코팅", "실내특수세차", "실내크리닝", "철분제거", "유리발수코팅"];

  // --- Logic Functions ---

  const analyzeBlog = () => {
    if (!blogUrl) return alert("블로그 주소를 입력해주세요.");
    setLoading(true);
    setTimeout(() => {
      setBlogAnalysis({
        totalPosts: 124,
        topKeywords: ["광택", "유리막"],
        weakKeywords: ["실내크리닝", "에어컨냄새"],
        suggestion: "사장님, 현재 '광택' 관련 글은 많지만 '실내 관리' 관련 글이 부족합니다. 틈새 시장을 공략해 볼까요?"
      });
      setLoading(false);
      setStep('keyword');
    }, 1500);
  };

  const generateTitles = () => {
    if (selectedKeywords.length === 0) return alert("키워드를 하나 이상 선택해주세요.");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('title');
    }, 1500);
  };

  const suggestedTitles = [
    `[${selectedKeywords.join('/')}] 돈 낭비 안 하는 업체 선정 기준 3가지`,
    `여름철 ${selectedKeywords[0]} 관리, 이대로만 하면 새 차 됩니다`,
    `현직 사장님이 알려주는 ${selectedKeywords[0]}의 진실 (호구 탈출)`,
    `내 차 망치는 잘못된 상식! ${selectedKeywords[0]} 편`,
    `${selectedKeywords[0]} 시공 전 반드시 확인해야 할 체크리스트`
  ];

  const generateToc = (title) => {
    setSelectedTitle(title);
    setLoading(true);
    setTimeout(() => {
      setTocList([
        `1. 왜 ${selectedKeywords[0]} 시공이 필요한가? (문제 제기)`,
        "2. 시공 과정 상세 공개 (Before & After)",
        "3. 사용되는 약재와 장비 소개 (전문성)",
        "4. 시공 후 유지 관리 꿀팁 (정보 제공)",
        "5. 예상 비용 및 예약 방법 (마무리)"
      ]);
      setLoading(false);
      setStep('toc');
    }, 1500);
  };

  const generateFinalContent = () => {
    setLoading(true);
    setTimeout(() => {
      // 블로그용 HTML 콘텐츠 생성 (이미지 포함)
      // 실제로는 AI가 생성한 이미지나 사장님이 업로드한 이미지를 넣을 수 있습니다.
      // 현재는 데모용 고화질 이미지를 사용합니다.
      const blogHtml = `
        <h2 style="font-size: 1.5em; font-weight: bold; margin-bottom: 1em;">${selectedTitle}</h2>
        <p>안녕하세요! 글루 디테일링입니다. 오늘은 <strong>'${selectedTitle}'</strong>에 대해 이야기해보려 합니다.</p>
        <br/>
        <img src="https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=800&auto=format&fit=crop" alt="차량 입고 사진" style="width: 100%; border-radius: 8px; margin: 10px 0;" />
        <br/>
        <h3 style="font-size: 1.2em; font-weight: bold; margin-top: 1em;">${tocList[0]}</h3>
        <p>최근 날씨 변화로 인해 차량 관리에 어려움을 겪는 고객님들의 문의가 급증하고 있습니다. 특히 ${selectedKeywords[0]} 시공은 차량 수명 연장에 필수적입니다.</p>
        <p>(AI가 작성한 전문적인 내용 약 200자...)</p>
        <br/>
        <img src="https://images.unsplash.com/photo-1552930294-6b595f4c2974?w=800&auto=format&fit=crop" alt="시공 과정 사진" style="width: 100%; border-radius: 8px; margin: 10px 0;" />
        <br/>
        <h3 style="font-size: 1.2em; font-weight: bold; margin-top: 1em;">${tocList[1]}</h3>
        <p>저희 매장의 실제 시공 사례를 보여드릴게요. 입고 당시 상태와 시공 후의 차이를 직접 확인해 보세요. 꼼꼼한 전처리 과정이 퀄리티를 결정합니다.</p>
        <p>(시공 과정에 대한 상세 설명 약 300자...)</p>
        <br/>
        <img src="https://images.unsplash.com/photo-1507136566006-cfc505b114fc?w=800&auto=format&fit=crop" alt="시공 완료 사진" style="width: 100%; border-radius: 8px; margin: 10px 0;" />
        <br/>
        <h3 style="font-size: 1.2em; font-weight: bold; margin-top: 1em;">${tocList[3]}</h3>
        <p>시공보다 중요한 건 관리입니다. 한 달에 한 번만 이렇게 해주시면 새 차 컨디션을 1년 넘게 유지하실 수 있습니다.</p>
        <br/>
        <p style="color: #666;">#${selectedKeywords.join(' #')} #글루디테일링 #차량관리</p>
      `;

      setGeneratedContent({
        blog: blogHtml,
        insta: `✨ ${selectedTitle} ✨\n\n내 차가 달라지는 기적! 👀\n오늘 입고된 차량, 비포 애프터가 확실하죠?\n\n장마철 대비 ${selectedKeywords[0]} 지금이 기회입니다!\n\n📍 강남구 글루디테일링\n📞 예약 문의: DM 주세요!\n\n#차스타그램 #카스타그램 #${selectedKeywords.join(' #')}`,
        short: `[Scene 1] (0-3초) 꼬질꼬질한 차 상태 클로즈업\n(자막: "이 차가 어떻게 변할까요?")\n\n[Scene 2] (3-10초) 고압수 뿌리는 시원한 영상 + 거품질 ASMR\n(자막: "${selectedKeywords[0]} 들어갑니다!")\n\n[Scene 3] (10-15초) 시공 후 물방울 튕겨나가는 모습\n(내레이션: "와, 발수력 보이시나요?")\n\n[Scene 4] (15-20초) 사장님 따봉 + 매장 위치\n(자막: "문의는 프로필 링크!")`
      });
      setLoading(false);
      setStep('result');
    }, 2000);
  };

  // 통합 복사 기능 (이미지 포함)
  const handleCopy = async () => {
    if (activeResultTab === 'blog') {
      try {
        // 블로그용: HTML 형태로 클립보드에 복사 (이미지 태그 포함)
        const type = "text/html";
        const blob = new Blob([generatedContent.blog], { type });
        const data = [new ClipboardItem({ [type]: blob })];
        await navigator.clipboard.write(data);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('이미지 복사 실패 (보안 환경 필요):', err);
        // 실패 시 텍스트만 복사 시도
        // navigator.clipboard.writeText(...)
        alert("이미지 복사는 보안 프로토콜(HTTPS) 환경에서만 동작합니다. 텍스트만 복사하시겠습니까?");
      }
    } else {
      // 인스타/숏폼용: 단순 텍스트 복사
      navigator.clipboard.writeText(generatedContent[activeResultTab]);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white items-center justify-center animate-fade-in font-noto">
        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-slate-600 animate-pulse">AI가 마케팅 전략을 분석 중입니다...</p>
        <p className="text-xs text-slate-400 mt-2">잠시만 기다려주세요.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in font-noto">
      {/* 상단 헤더 */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4 bg-white sticky top-0 z-20">
        <button onClick={() => {
          if(step === 'url') navigate('/dashboard');
          else if(step === 'keyword') setStep('url');
          else if(step === 'title') setStep('keyword');
          else if(step === 'toc') setStep('title');
          else if(step === 'result') setStep('toc');
        }} className="text-slate-400">
          {step === 'url' ? <ChevronRight size={24} className="rotate-180" /> : <ArrowLeft size={24} />}
        </button>
        <h2 className="text-lg font-bold text-slate-900">AI 홍보글 작성</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-32">
        
        {/* Step 0: 블로그 분석 */}
        {step === 'url' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                <Search size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">블로그 분석 & 진단</h3>
              <p className="text-sm text-slate-500">운영 중인 네이버 블로그 주소를 입력하시면<br/>부족한 키워드를 찾아 전략을 제안해 드립니다.</p>
            </div>
            <div className="bg-white p-2 rounded-2xl border border-slate-200 flex shadow-sm">
              <input 
                type="text" 
                placeholder="예: https://blog.naver.com/myid" 
                className="flex-1 p-3 text-sm outline-none rounded-xl"
                value={blogUrl}
                onChange={(e) => setBlogUrl(e.target.value)}
              />
              <button onClick={analyzeBlog} className="bg-slate-900 text-white px-6 rounded-xl text-sm font-bold active:scale-95 transition-all">
                분석
              </button>
            </div>
            <div className="text-center">
              <button onClick={() => setStep('keyword')} className="text-xs text-slate-400 underline">
                블로그가 없으신가요? 건너뛰기
              </button>
            </div>
          </div>
        )}

        {/* Step 1: 키워드 선택 */}
        {step === 'keyword' && (
          <div className="space-y-6">
            {blogAnalysis && (
              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 mb-6">
                <div className="flex items-start gap-3">
                  <Sparkles size={20} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-slate-900 mb-1">AI 분석 결과</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{blogAnalysis.suggestion}</p>
                  </div>
                </div>
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">어떤 주제로 글을 쓸까요?</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedKeywords(prev => prev.includes(cat) ? prev.filter(k => k !== cat) : [...prev, cat]);
                    }}
                    className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all ${selectedKeywords.includes(cat) ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: 제목 선택 */}
        {step === 'title' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">가장 끌리는 제목을 선택하세요</h3>
            <div className="space-y-3">
              {suggestedTitles.map((title, idx) => (
                <button
                  key={idx}
                  onClick={() => generateToc(title)}
                  className="w-full text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all group"
                >
                  <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 leading-relaxed">{title}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setStep('keyword')} className="w-full py-4 text-slate-400 text-xs font-bold flex items-center justify-center gap-1">
              <RefreshCw size={14} /> 다른 키워드 선택하기
            </button>
          </div>
        )}

        {/* Step 3: 목차 컨펌 */}
        {step === 'toc' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">이렇게 글을 써볼까요?</h3>
              <p className="text-xs text-slate-500">AI가 설계한 목차입니다. 마음에 드시면 진행하세요.</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-sm font-black text-blue-600 mb-4 pb-4 border-b border-slate-100">{selectedTitle}</p>
              <div className="space-y-3">
                {tocList.map((item, idx) => (
                  <div key={idx} className="flex gap-3 text-sm text-slate-700">
                    <span className="font-bold text-slate-300">0{idx+1}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => alert('목차 재생성 기능 준비중')} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm">
                다시 생성
              </button>
              <button onClick={generateFinalContent} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-lg">
                이대로 글 작성하기
              </button>
            </div>
          </div>
        )}

        {/* Step 4: 최종 결과 (블로그/인스타/숏폼) */}
        {step === 'result' && (
          <div className="space-y-6">
            <div className="flex bg-white p-1 rounded-xl border border-slate-100">
              {['blog', 'insta', 'short'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveResultTab(tab)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${activeResultTab === tab ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}
                >
                  {tab === 'blog' && <Layout size={14} />}
                  {tab === 'insta' && <Instagram size={14} />}
                  {tab === 'short' && <Video size={14} />}
                  {tab === 'blog' ? '블로그 (사진포함)' : tab === 'insta' ? '인스타' : '숏폼'}
                </button>
              ))}
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative min-h-[400px]">
              <div className="absolute top-4 right-4 z-10">
                <button 
                  onClick={handleCopy}
                  className={`p-2 rounded-lg transition-all ${isCopied ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400 hover:text-blue-600'}`} 
                  title="전체 복사하기"
                >
                  {isCopied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              
              {/* 블로그는 HTML 미리보기, 나머지는 텍스트 */}
              {activeResultTab === 'blog' ? (
                <div 
                  ref={contentRef}
                  className="prose prose-sm max-w-none text-slate-700 leading-relaxed pt-8"
                  dangerouslySetInnerHTML={{ __html: generatedContent.blog }}
                />
              ) : (
                <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-noto pt-8">
                  {generatedContent[activeResultTab]}
                </pre>
              )}
            </div>
            
            <button onClick={() => setStep('keyword')} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200">
              다른 주제로 또 쓰기
            </button>
          </div>
        )}

      </div>

      {/* 키워드 선택 단계의 하단 고정 버튼 */}
      {step === 'keyword' && selectedKeywords.length > 0 && (
        <div className="p-6 bg-white border-t border-slate-100 fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30">
          <button onClick={generateTitles} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
            <Wand2 size={18} /> 제목 추천받기
          </button>
        </div>
      )}
    </div>
  );
};

export default Creator;