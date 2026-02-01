import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Download, 
  Plus, 
  ChevronRight, 
  DollarSign, 
  Eye,
  Database,
  Loader2,
  TrendingUp,
  Calendar,
  BarChart3,
  ArrowUpRight,
  PieChart,
  Activity,
  ArrowRight
} from 'lucide-react';

// 파이어베이스 연동 (경로 오류 수정을 위해 src/firebase.js 위치를 재확인한 상대 경로)
import { auth, db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

/**
 * Sales: PC 전용 매출 현황 분석 스튜디오
 * 앱 버전의 매출 정산 로직과 그래프 시각화를 PC 대화면에 맞춰 구현했습니다.
 */
const Sales = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [warranties, setWarranties] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 매출 분석 통계 상태
  const [stats, setStats] = useState({
    totalSales: 0,
    monthSales: 0,
    todaySales: 0,
    averagePrice: 0,
    count: 0
  });

  // 그래프용 7일 데이터 상태
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }

    // [Rule 2 준수] 전체 데이터를 가져온 후 메모리에서 필터링
    const q = collection(db, "warranties");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 현재 사용자 데이터만 필터링 및 최신순 정렬
      const myData = allData
        .filter(w => w.userId === user.uid)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      setWarranties(myData);
      setFilteredData(myData);
      processSalesData(myData);
      setLoading(false);
    }, (error) => {
      console.error("매출 데이터 로드 실패:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // 매출 정산 및 주간 그래프 데이터 생성 로직
  const processSalesData = (data) => {
    const now = new Date();
    const todayStr = now.toLocaleDateString();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let total = 0;
    let monthTotal = 0;
    let todayTotal = 0;
    
    // 그래프용 최근 7일 데이터 맵 초기화
    const dailyMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toLocaleDateString();
      dailyMap[dateKey] = { 
        label: d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }), 
        dayName: d.toLocaleDateString('ko-KR', { weekday: 'short' }),
        amount: 0 
      };
    }

    data.forEach(item => {
      // 금액 데이터 정제 (문자열에서 숫자만 추출)
      const price = Number(String(item.warrantyPrice || 0).replace(/[^0-9]/g, ''));
      total += price;

      // 타임스탬프 변환 (Firestore seconds 기반)
      const date = item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000) : new Date();
      const itemDateStr = date.toLocaleDateString();
      
      // 1. 최근 7일 그래프 데이터 합산
      if (dailyMap[itemDateStr]) {
        dailyMap[itemDateStr].amount += price;
      }

      // 2. 오늘 매출 합계
      if (itemDateStr === todayStr) {
        todayTotal += price;
      }

      // 3. 이번 달 매출 합계
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        monthTotal += price;
      }
    });

    setStats({
      totalSales: total,
      monthSales: monthTotal,
      todaySales: todayTotal,
      averagePrice: data.length > 0 ? Math.round(total / data.length) : 0,
      count: data.length
    });

    setChartData(Object.values(dailyMap));
  };

  // 통합 검색 필터링
  useEffect(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const result = warranties.filter(w => 
      w.customerName?.toLowerCase().includes(lowerSearch) ||
      w.productName?.toLowerCase().includes(lowerSearch) ||
      w.carModel?.toLowerCase().includes(lowerSearch) ||
      w.plateNumber?.toLowerCase().includes(lowerSearch)
    );
    setFilteredData(result);
  }, [searchTerm, warranties]);

  const formatPrice = (val) => Number(val).toLocaleString();

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[500px] bg-slate-50/50">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <DollarSign size={20} className="absolute text-indigo-600 animate-pulse" />
        </div>
        <p className="mt-4 text-slate-500 text-[11px] font-black uppercase tracking-widest">실시간 매출 정산 중...</p>
      </div>
    );
  }

  // 차트 최대 높이 계산
  const maxAmount = Math.max(...chartData.map(d => d.amount), 1);

  return (
    <div className="space-y-5 animate-in fade-in duration-500 w-full pb-10">
      
      {/* 1. 상단 분석 헤더 (명칭: 매출 현황) */}
      <div className="flex items-center justify-between bg-white px-8 py-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100">
            <BarChart3 size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-none uppercase italic">매출 현황 분석 스튜디오</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Real-time Financial Performance Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/create')}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-black transition-all shadow-md uppercase tracking-tighter"
          >
            <Plus size={14} className="inline mr-1" /> 보증서 추가 발행
          </button>
        </div>
      </div>

      {/* 2. 매출 요약 지표 카드 */}
      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">이번 달 확정 매출</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic leading-none">₩{formatPrice(stats.monthSales)}</h3>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] text-emerald-500 font-black italic">
            <TrendingUp size={12} /> LIVE SYNCING
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">누적 총 매출</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic leading-none">₩{formatPrice(stats.totalSales)}</h3>
          <div className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">All-time Database</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">평균 시공 단가</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic leading-none">₩{formatPrice(stats.averagePrice)}</h3>
          <div className="mt-4 text-[10px] text-indigo-500 font-bold uppercase tracking-widest italic">Efficiency Index</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">오늘 발생 매출</p>
          <h3 className="text-2xl font-black text-emerald-600 tracking-tighter italic leading-none">₩{formatPrice(stats.todaySales)}</h3>
          <div className="mt-4 text-[10px] text-emerald-500 font-bold uppercase tracking-widest italic animate-pulse">Updated Today</div>
        </div>
      </div>

      {/* 3. 매출 추이 그래프 섹션 */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 italic">
              <Activity size={16} className="text-emerald-500" /> 주간 매출 추이 분석 (Recent 7 Days)
            </h2>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Daily Revenue</span>
             </div>
          </div>
        </div>
        
        {/* 커스텀 바 차트 */}
        <div className="flex items-end justify-between h-40 gap-4 px-2">
          {chartData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
              {/* 금액 툴팁 */}
              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded whitespace-nowrap z-20 shadow-xl">
                ₩{formatPrice(d.amount)}
              </div>
              {/* 막대 */}
              <div 
                className="w-full bg-slate-50 border border-slate-100 rounded-t-lg group-hover:bg-emerald-500 group-hover:border-emerald-600 transition-all relative overflow-hidden"
                style={{ height: `${(d.amount / maxAmount) * 100}%`, minHeight: '4px' }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
              </div>
              {/* 날짜 라벨 */}
              <div className="mt-4 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase leading-none">{d.label}</p>
                <p className="text-[10px] font-black text-slate-900 mt-1 uppercase italic">{d.dayName}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. 매출 상세 데이터 리스트 (시공 일자 연동) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="고객명, 시공품목, 차량번호 검색..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 hover:bg-slate-900 hover:text-white transition-all uppercase tracking-tighter shadow-sm">
            <Download size={14} /> 매출 보고서 내보내기
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50/80 text-slate-500 font-black uppercase tracking-widest border-b border-slate-100 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-8 py-3.5">시공 완료일</th>
                <th className="px-8 py-3.5">고객 프로필</th>
                <th className="px-8 py-3.5">시공 항목</th>
                <th className="px-8 py-3.5">차량 데이터</th>
                <th className="px-8 py-3.5 text-right">매출액 (₩)</th>
                <th className="px-8 py-3.5 text-center">전표</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.length > 0 ? filteredData.map((data) => {
                // [수정] Firestore createdAt 타임스탬프 실시간 동기화
                const timestamp = data.createdAt;
                const displayDate = timestamp?.seconds 
                  ? new Date(timestamp.seconds * 1000).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) 
                  : '날짜 미지정';

                return (
                  <tr 
                    key={data.id} 
                    className="hover:bg-indigo-50/30 transition-all cursor-pointer group" 
                    onClick={() => navigate(`/warranty/view/${data.id}`)}
                  >
                    <td className="px-8 py-5 font-black text-slate-400 italic">
                      {displayDate}
                    </td>
                    <td className="px-8 py-5 text-slate-900">
                      <div className="font-black italic uppercase text-base group-hover:text-indigo-600 transition-colors leading-none">{data.customerName}</div>
                      <div className="text-[9px] text-slate-400 font-bold mt-1 tracking-tighter leading-none">{data.phone}</div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-2.5 py-1 bg-white text-indigo-600 rounded-md font-black border border-indigo-100 uppercase text-[9px] tracking-tighter italic">
                        {data.productName}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-slate-700 font-bold">
                      <div className="leading-tight text-[11px] uppercase">{data.carModel}</div>
                      <div className="inline-block mt-1.5 px-2 py-0.5 bg-slate-900 text-white rounded text-[8px] font-black tracking-widest leading-none uppercase">{data.plateNumber}</div>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-slate-900 text-base italic tracking-tighter">
                      ₩{formatPrice(data.warrantyPrice)}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                        <Eye size={16} />
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="6" className="px-8 py-32 text-center text-slate-300 font-black italic uppercase tracking-widest">
                    No Financial Activity Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
          <div>Report Sync: {filteredData.length} entries matching current criteria</div>
          <div className="flex gap-2 text-emerald-600">
             Verified Cloud Sync Active
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sales;