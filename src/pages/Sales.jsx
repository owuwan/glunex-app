import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, TrendingUp, PieChart, Calendar, ArrowUpRight, Loader2, AlertCircle } from 'lucide-react';
// 파이어베이스 도구
import { auth, db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const Sales = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // [상태] 실제 데이터를 담을 그릇
  const [salesData, setSalesData] = useState({
    totalMonth: 0,    // 이번 달 총 매출
    count: 0,         // 이번 달 건수
    compareLastMonth: 0, // 전월 대비 (데이터 없으면 0)
    categoryStats: [] // 카테고리별 비중
  });

  // [핵심] 이번 달 매출 데이터 가져오기
  useEffect(() => {
    const fetchSales = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        // 1. 내 보증서 데이터 모두 가져오기
        const q = query(
          collection(db, "warranties"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        
        // 2. 날짜 필터링을 위한 준비
        const now = new Date();
        const currentMonth = now.getMonth(); // 0~11 (현재 월)
        const currentYear = now.getFullYear();

        let total = 0;
        let count = 0;
        
        // 카테고리별 합계 저장소
        const catMap = {
          coating: { label: '유리막 코팅', amount: 0, color: 'bg-blue-600' },
          tinting: { label: '썬팅', amount: 0, color: 'bg-indigo-500' },
          wash: { label: '세차/디테일링', amount: 0, color: 'bg-slate-400' },
          detailing: { label: '세차/디테일링', amount: 0, color: 'bg-slate-400' }, // 세차와 합침
          etc: { label: '기타 시공', amount: 0, color: 'bg-amber-500' }
        };

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const issueDate = new Date(data.issuedAt);

          // [조건] "이번 달" 데이터만 계산
          if (issueDate.getMonth() === currentMonth && issueDate.getFullYear() === currentYear) {
            // 문자열 "650,000" -> 숫자 650000 변환
            const price = Number(String(data.price).replace(/[^0-9]/g, '')) || 0;
            
            total += price;
            count += 1;

            // 카테고리별 누적
            const type = data.serviceType || 'etc';
            if (catMap[type]) {
              catMap[type].amount += price;
            } else {
              catMap['etc'].amount += price;
            }
          }
        });

        // 3. 카테고리 데이터 가공 (그래프용)
        const statsArray = Object.keys(catMap).map(key => {
          const item = catMap[key];
          // 전체 대비 비율 계산 (전체 매출이 0이면 0%)
          const width = total === 0 ? '0%' : `${Math.round((item.amount / total) * 100)}%`;
          return { id: key, ...item, width };
        }).filter(item => item.amount > 0 || item.id === 'coating'); // 매출 있는 것만 표시 (코팅은 기본 표시)

        // 상위 3개만 자르거나 정렬
        statsArray.sort((a, b) => b.amount - a.amount);

        setSalesData({
          totalMonth: total,
          count: count,
          compareLastMonth: 0, // 신규 가입자는 전월 데이터가 없으므로 0
          categoryStats: statsArray
        });

      } catch (error) {
        console.error("매출 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, [navigate]);

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
              <span className="text-xs font-bold uppercase tracking-widest">
                {new Date().getFullYear()}년 {new Date().getMonth() + 1}월 실적
              </span>
            </div>
            <p className="text-slate-400 text-xs font-bold mb-1">이번 달 총 매출 (실 시공가)</p>
            
            {loading ? (
               <div className="h-10 flex items-center gap-2 text-slate-500">
                 <Loader2 className="animate-spin" size={24} /> 불러오는 중...
               </div>
            ) : (
               <div className="flex items-baseline gap-1 mb-6">
                 <span className="text-4xl font-black text-white">
                   {salesData.totalMonth.toLocaleString()}
                 </span>
                 <span className="text-lg font-bold">원</span>
               </div>
            )}
            
            <div className="flex gap-4">
              <div className="bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-md border border-white/5">
                <p className="text-[10px] text-slate-400 mb-1 font-bold">발행 건수</p>
                <p className="text-sm font-bold font-sans">{salesData.count}건</p>
              </div>
              <div className="bg-green-500/20 px-4 py-2 rounded-2xl backdrop-blur-md border border-green-500/20">
                <p className="text-[10px] text-green-400 mb-1 font-bold flex items-center gap-1">
                  지난달 대비 <ArrowUpRight size={10} />
                </p>
                <p className="text-sm font-bold text-green-400">신규 시작</p>
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
            {salesData.categoryStats.length > 0 && salesData.totalMonth > 0 ? (
              salesData.categoryStats.map((item) => (
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
              ))
            ) : (
              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <AlertCircle className="mx-auto text-slate-300 mb-2" size={24} />
                <p className="text-xs text-slate-400 font-bold">아직 이번 달 매출 데이터가 없습니다.</p>
                <button onClick={() => navigate('/create')} className="text-[10px] text-blue-600 font-bold mt-1 underline">
                  첫 보증서 발행하러 가기
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. AI 분석 및 마케팅 제안 */}
        <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-100 relative overflow-hidden">
          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">AI Analysis</span>
            </div>
            <p className="text-[13px] leading-relaxed font-medium">
              {salesData.totalMonth === 0 ? (
                "아직 데이터가 충분하지 않습니다. \n보증서를 발행하고 AI의 매출 분석을 받아보세요!"
              ) : (
                <>
                  현재 <strong className="text-white border-b border-white/50">{salesData.categoryStats[0]?.label}</strong> 매출 비중이 가장 높습니다. <br/>
                  추가 수익을 위해 <strong className="text-blue-100">마케팅 관리</strong>를 시작해 보세요!
                </>
              )}
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