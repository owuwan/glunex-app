import React, { useState } from 'react';
import { 
  Sparkles, 
  Type, 
  Image as ImageIcon, 
  Instagram, 
  Chrome, 
  Send, 
  Copy, 
  RefreshCw,
  Layout,
  FileText,
  Save
} from 'lucide-react';

/**
 * PC 전용 Creator 페이지
 * AI를 활용한 콘텐츠 생성 도구로, 좌측 입력/우측 미리보기 구조를 가집니다.
 */
const Creator = () => {
  const [activeTab, setActiveTab] = useState('instagram'); // 'instagram' | 'blog'
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1. 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">AI 콘텐츠 크리에이터</h1>
          <p className="text-slate-500 mt-1">키워드만 입력하면 AI가 매장 홍보 문구와 포스팅을 자동으로 생성합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
            <Save size={18} /> 임시 저장함
          </button>
        </div>
      </div>

      {/* 2. 메인 워크스페이스 (2컬럼 레이아웃) */}
      <div className="flex-1 grid grid-cols-2 gap-8 min-h-[600px]">
        
        {/* 좌측: 입력 및 설정 영역 */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-2 bg-slate-50 border-b border-slate-100 flex gap-1">
            <button 
              onClick={() => setActiveTab('instagram')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'instagram' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Instagram size={18} /> 인스타그램 피드
            </button>
            <button 
              onClick={() => setActiveTab('blog')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'blog' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Chrome size={18} /> 네이버 블로그
            </button>
          </div>

          <div className="p-8 space-y-6 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider">시공 항목 핵심 키워드</label>
              <input 
                type="text" 
                placeholder="예: 제네시스 GV80, 유리막 코팅, 신차 패키지"
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider">강조하고 싶은 특징 (옵션)</label>
              <textarea 
                rows={4}
                placeholder="예: 5년 보증 서비스, 정품 정량 시공, 당일 출고 가능"
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium resize-none"
              ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">말투(톤앤매너)</label>
                <select className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-sm">
                  <option>전문적이고 신뢰감 있는</option>
                  <option>친근하고 부드러운</option>
                  <option>간결하고 명확한</option>
                  <option>트렌디하고 감성적인</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">포함할 해시태그</label>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold">#유리막코팅</span>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold">#신차패키지</span>
                  <button className="px-3 py-1 border border-dashed border-slate-300 text-slate-400 rounded-full text-[10px] font-bold hover:bg-slate-50">+ 추가</button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 pt-4">
            <button 
              onClick={() => {
                setIsGenerating(true);
                setTimeout(() => setIsGenerating(false), 2000);
              }}
              className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 group disabled:opacity-50"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <RefreshCw size={22} className="animate-spin" />
              ) : (
                <Sparkles size={22} className="group-hover:animate-pulse" />
              )}
              {isGenerating ? 'AI가 콘텐츠를 생성하고 있습니다...' : 'AI 콘텐츠 생성하기'}
            </button>
          </div>
        </div>

        {/* 우측: 미리보기 영역 */}
        <div className="bg-slate-100 rounded-3xl border border-slate-200 flex flex-col overflow-hidden relative">
          <div className="absolute top-6 left-6 flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm z-10">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Real-time Preview</span>
          </div>

          <div className="flex-1 p-10 flex items-center justify-center">
            {/* 시뮬레이션된 모바일/블로그 뷰 */}
            <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl border-[8px] border-slate-900 aspect-[9/16] overflow-hidden flex flex-col relative">
               <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-full bg-slate-200"></div>
                   <span className="text-[10px] font-bold text-slate-900 uppercase">Your_Store</span>
                 </div>
                 <MoreHorizontal size={14} className="text-slate-400" />
               </div>
               <div className="flex-1 bg-slate-50 flex items-center justify-center p-8 text-center">
                 <div className="space-y-3">
                   <ImageIcon size={48} className="mx-auto text-slate-200" />
                   <p className="text-xs text-slate-400 font-medium">콘텐츠를 생성하면<br/>여기에 미리보기가 나타납니다.</p>
                 </div>
               </div>
               <div className="p-4 space-y-2">
                 <div className="flex gap-3 mb-2">
                   <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>
                   <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>
                   <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>
                 </div>
                 <div className="h-2 w-full bg-slate-100 rounded"></div>
                 <div className="h-2 w-2/3 bg-slate-100 rounded"></div>
               </div>
            </div>
          </div>

          <div className="p-6 bg-white border-t border-slate-200 flex items-center justify-between">
            <button className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors">
              <RefreshCw size={18} /> <span className="text-sm font-bold">다시 생성</span>
            </button>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                텍스트만 복사
              </button>
              <button className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100">
                <Send size={18} /> 바로 포스팅하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Creator;