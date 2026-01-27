import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, TrendingUp, PieChart, Calendar, ArrowUpRight } from 'lucide-react';

const Sales = () => {
  const navigate = useNavigate();

  // 테스트용 데이터
  const salesData = {
    totalMonth: 12500000,
    compareLastMonth: 12,
    count: 42,
    categoryStats: [
      { id: 'coating', label: '유리막 코팅', amount: 5200000, color: 'bg-blue-600', width: '42%' },
      { id: 'tinting', label: '썬팅', amount: 3800000, color: 'bg-indigo-500', width: '30%' },
      { id: 'wash', label: '세차/디테일링', amount: 3500000, color: 'bg-slate-400', width: '28%' },
    ]
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in font-noto">
      {/* 상단 헤더 */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4 bg-white sticky top-0 z-20">
        <button onClick={() => navigate('/dashboard')} className="text-slate-400">
          <ChevronRight size={24} className="rotate-180" />
        </button>
        <h2 className="text-lg font-bold text-slate-900">이달의 매출 현황</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-24">
        {/* 1. 총 매출 요약 카드 */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4 opacity-60">
              <Calendar size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">2026년 1월 실적</span>
            </div>
            <p className="text-slate-400 text-xs font-bold mb-1">이번 달 총 매출 (실 시공가 기준)</p>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-black text-white">{salesData.totalMonth.toLocaleString()}</span>
              <span className="text-lg font-bold">원</span>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-md border border-white/5">
                <p className="text-[10px] text-slate-400 mb-1 font-bold">발행 건수</p>
                <p className="text-sm font-bold font-sans">{salesData.count}건</p>
              </div>
              <div className="bg-green-500/20 px-4 py-2 rounded-2xl backdrop-blur-md border border-green-500/20">
                <p className="text-[10px] text-green-400 mb-1 font-bold flex items-center gap-1">
                  지난달 대비 <ArrowUpRight size={10} />
                </p>
                <p className="text-sm font-bold text-green-400">+{salesData.compareLastMonth}%</p>
              </div>
            </div>
          </div>
          <TrendingUp size={150} className="absolute right-[-20px] bottom-[-30px] text-white/5" />
        </div>

        {/* 2. 시공 품목별 매출 비중 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 mb-6">
          <div className="flex items-center gap-2 mb-6 px-1">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
              <PieChart size={18} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">시공 품목별 매출 비중</h3>
          </div>

          <div className="space-y-6 px-1">
            {salesData.categoryStats.map((item) => (
              <div key={item.id}>
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900">{item.label}</span>
                    <p className="text-[10px] text-slate-400 font-medium">{item.amount.toLocaleString()}원</p>
                  </div>
                  <span className="text-xs font-black text-blue-600 font-sans">{item.width}</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full transition-all duration-1000 shadow-sm`} 
                    style={{ width: item.width }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. AI 분석 및 마케팅 제안 */}
        <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-100 relative overflow-hidden">
          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">AI Analysis</span>
            </div>
            <p className="text-[13px] leading-relaxed font-medium">
              이번 달은 <strong className="text-white border-b border-white/50">유리막 코팅</strong> 매출이 42%로 가장 높습니다. <br/>
              상대적으로 낮은 <strong className="text-blue-100">세차</strong> 매출을 올리기 위해 비 소식 알림 문자를 준비해 보세요!
            </p>
            <button 
              onClick={() => navigate('/marketing')}
              className="mt-2 w-full py-3.5 bg-white text-blue-600 rounded-2xl text-xs font-black shadow-md active:scale-95 transition-all"
            >
              부족한 매출 채우러 가기 &rarr;
            </button>
          </div>
          <TrendingUp className="absolute right-[-20px] top-[-20px] text-white/10" size={100} />
        </div>
      </div>
    </div>
  );
};

export default Sales;