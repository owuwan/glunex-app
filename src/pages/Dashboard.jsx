import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 실제 라우팅 훅 사용
import { User, Crown, MessageSquare, CloudRain, Sparkles, ArrowUpRight, TrendingUp, Wallet, Bell } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  
  // [데이터 상태 관리]
  // 기상 데이터 및 타겟 고객 수 (기존 로직 유지)
  const [weather] = useState({ 
    temp: 24, 
    rain: 12.5, 
    status: 'rainy', 
    region: '강남구',
    targetCustomers: 42 // 기존 데이터 연결
  });

  // 매출 데이터 (화면 바인딩용 데이터 객체)
  const salesData = {
    total: 45200000,
    totalGrowth: 8.5,
    today: 1250000,
    todayGrowth: 12
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#F8F9FB] text-slate-800 font-sans overflow-hidden max-w-md mx-auto shadow-2xl relative animate-fade-in">
      
      {/* 배경 그래픽 효과 */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-blue-100/40 rounded-full blur-[80px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-slate-200/50 rounded-full blur-[80px]" />
      </div>

      {/* [헤더 영역] 상호명 및 마이페이지 */}
      <div className="relative px-6 pt-10 pb-4 z-10 flex justify-between items-center shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full" />
            <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
              GLUNEX PARTNER
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            글루 디테일링
          </h2>
        </div>

        <button 
          onClick={() => navigate('/mypage')}
          className="p-2.5 bg-white rounded-full border border-slate-200 shadow-sm active:scale-95 transition-all hover:bg-slate-50"
        >
          <User size={18} className="text-slate-600" />
        </button>
      </div>

      {/* [메인 컨텐츠 영역] */}
      <div className="flex-1 flex flex-col px-5 pb-6 gap-3 z-10 min-h-0">
        
        {/* 상단 블록: 매출(Left) + 날씨(Right) */}
        <div className="flex gap-3 h-[32%] shrink-0">
          
          {/* 매출 카드 (Total & Today) -> 클릭 시 /sales 이동 */}
          <button 
            onClick={() => navigate('/sales')}
            className="flex-[1.8] bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group active:scale-[0.98] transition-all flex flex-col justify-between text-left"
          >
            {/* 1. Total Sales (월 매출) */}
            <div className="relative z-10 w-full">
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="p-1 rounded bg-slate-100 text-slate-500">
                  <Wallet size={12} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Total Sales (Month)
                </span>
              </div>
              
              <div className="flex items-baseline gap-1 mb-0.5">
                <span className="text-2xl font-black text-slate-900 tracking-tighter leading-none">
                  {salesData.total.toLocaleString()}
                </span>
                <span className="text-sm font-bold text-slate-400">원</span>
              </div>

              {/* 전월대비 */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-slate-400">전월대비</span>
                <div className="bg-red-50 text-red-500 text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                   <TrendingUp size={10} /> {salesData.totalGrowth}%
                </div>
              </div>
            </div>

            {/* 구분선 */}
            <div className="w-full h-px bg-slate-100 my-1" />

            {/* 2. Today Sales (일 매출) */}
            <div className="relative z-10 w-full">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide flex items-center gap-1 mb-0.5">
                 Today
              </span>
              
              <div className="flex items-baseline gap-1 mb-0.5">
                <span className="text-xl font-black text-slate-800 tracking-tighter">
                  {salesData.today.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-400">원</span>
              </div>

              {/* 전일대비 */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-slate-400">전일대비</span>
                <div className="bg-red-50 text-red-500 text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                   <TrendingUp size={10} /> {salesData.todayGrowth}%
                </div>
              </div>
            </div>
            
            {/* 호버 효과 아이콘 */}
            <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300">
               <ArrowUpRight size={16} />
            </div>
          </button>

          {/* 날씨 카드 (비소식 알림 연동) */}
          <div className="flex-1 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col items-center justify-between gap-1 group hover:border-blue-200 transition-colors">
             <CloudRain size={80} className="absolute -right-6 -bottom-6 text-blue-50 opacity-50 rotate-12 group-hover:scale-110 transition-transform" />
             
             <div className="w-full flex flex-col items-center z-10 mt-1">
                <div className="text-[10px] font-medium text-slate-400 mb-1">{weather.region}</div>
                <div className="flex items-center gap-2">
                   <div className="text-3xl font-black text-slate-800 leading-none tracking-tight">{weather.temp}°</div>
                   {weather.status === 'rainy' && <CloudRain size={20} className="text-blue-500" />}
                </div>
             </div>

             {/* 비소식 관리 대상 알림 (데이터 바인딩) */}
             <div className="z-10 w-full">
               <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 flex flex-col items-center text-center">
                 <div className="flex items-center gap-1 mb-0.5">
                   <Bell size={8} className="text-blue-600 fill-blue-600" />
                   <span className="text-[9px] font-bold text-blue-600">비소식 알림</span>
                 </div>
                 <span className="text-[10px] font-black text-slate-700 tracking-tight">
                   관리 대상 <span className="text-blue-600 underline decoration-2">{weather.targetCustomers}명</span>
                 </span>
               </div>
             </div>
          </div>
        </div>

        {/* 하단 액션 버튼 3개 */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          
          {/* AI 마케팅 에이전트 -> /creator 이동 */}
          <button 
             onClick={() => navigate('/creator')}
             className="flex-1 bg-gradient-to-r from-indigo-50 to-white rounded-2xl border border-indigo-100 p-5 flex items-center justify-between relative overflow-hidden group active:scale-[0.98] transition-all shadow-sm hover:shadow-md"
          >
             <div className="absolute left-0 top-0 w-1 h-full bg-indigo-500" />
             <div className="flex flex-col items-start z-10 pl-2">
                <div className="flex items-center gap-2 mb-1">
                   <div className="p-1 rounded bg-indigo-100 text-indigo-600">
                     <Sparkles size={12} className="fill-indigo-600" />
                   </div>
                   <span className="text-base font-black text-indigo-900">AI 마케팅 에이전트</span>
                </div>
                <span className="text-[14px] text-slate-500 text-left font-medium">
                   "상위노출 최적화" 홍보글 10초 완성
                </span>
             </div>
             <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-100 text-slate-300 shadow-sm group-hover:text-indigo-500 transition-colors">
                <ArrowUpRight size={16} />
             </div>
          </button>

          {/* 보증서 발행 -> /create 이동 */}
          <button 
             onClick={() => navigate('/create')}
             className="flex-1 bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm hover:shadow-md hover:border-amber-200"
          >
             <div className="absolute left-0 top-0 w-1 h-full bg-amber-400" />
             <div className="flex flex-col items-start z-10 pl-2">
                <div className="flex items-center gap-2 mb-1">
                   <div className="p-1 rounded bg-amber-50 text-amber-500">
                     <Crown size={12} className="fill-amber-500" />
                   </div>
                   <span className="text-base font-black text-slate-800">보증서 발행</span>
                </div>
                <span className="text-[14px] text-slate-500 font-medium">
                   시공 보증서 및 내역 발급
                </span>
             </div>
             <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-300 shadow-sm group-hover:text-amber-500 transition-colors">
                <ArrowUpRight size={16} />
             </div>
          </button>

          {/* 마케팅 관리 -> /marketing 이동 */}
          <button 
             onClick={() => navigate('/marketing')}
             className="flex-1 bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm hover:shadow-md hover:border-blue-200"
          >
             <div className="absolute left-0 top-0 w-1 h-full bg-blue-500" />
             <div className="flex flex-col items-start z-10 pl-2">
                <div className="flex items-center gap-2 mb-1">
                   <div className="p-1 rounded bg-blue-50 text-blue-500">
                     <MessageSquare size={12} className="fill-blue-500" />
                   </div>
                   <span className="text-base font-black text-slate-800">마케팅 관리</span>
                </div>
                <span className="text-[14px] text-slate-500 font-medium">
                   문자 발송 및 고객 관리
                </span>
             </div>
             <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-300 shadow-sm group-hover:text-blue-500 transition-colors">
                <ArrowUpRight size={16} />
             </div>
          </button>
          
        </div>

        {/* 하단 카피라이트 */}
        <div className="text-center pt-1 shrink-0">
           <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">
              Powered by GLUNEX AI
           </p>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;