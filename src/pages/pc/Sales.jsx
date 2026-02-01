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

// 파이어베이스 연동 (경로 해석 오류 방지를 위해 상대 경로 재설정)
import { auth, db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

/**
 * Sales: PC 전용 매출 현황 분석 스튜디오
 * 앱 버전의 매출 통계 기능을 PC 대화면에 맞춰 고도화하고 시공 일자를 실시간 동기화합니다.
 */
const Sales = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [warranties, setWarranties] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 매출 통계 데이터 상태
  const [stats, setStats] = useState({
    totalSales: 0,
    monthSales: 0,
    todaySales: 0,
    averagePrice: 0,
    count: 0
  });

  // 주간 그래프 데이터 상태
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    // 1. 사용자 인증 확인
    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }

    // 2. 실시간 데이터 구독 (Rule 2: 전체 데이터 수신 후 메모리 필터링)
    const q = collection(db, "warranties");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 현재 로그인한 사용자의 데이터만 필터링 및 시공일자 내림차순 정렬
      const myData = allData
        .filter(w => w.userId === user.uid)
        .sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });

      setWarranties(myData);
      setFilteredData(myData);
      processSalesData(myData);
      setLoading(false);
    }, (error) => {
      console.error("데이터 동기화 실패:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // 매출 정산 및 주간 그래프 생성 로직
  const processSalesData = (data) => {
    const now = new Date();
    const todayStr = now.toLocaleDateString();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalRevenue = 0;
    let monthRevenue = 0;
    let todayRevenue = 0;
    
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
      // 보증 가액에서 숫자만 추출하여 합계 계산
      const price = Number(String(item.warrantyPrice || 0).replace(/[^0-9]/g, ''));
      totalRevenue += price;

      // 타임스탬프 파싱 (Firestore Timestamp 대응)
      let itemDate;
      if (item.createdAt?.toDate) {
        itemDate = item.createdAt.toDate();
      } else if (item.createdAt?.seconds) {
        itemDate = new Date(item.createdAt.seconds * 1000);
      } else {
        itemDate = new Date(item.createdAt || Date.now());
      }
      
      const dateKey = itemDate.toLocaleDateString();
      
      // 1. 최근 7일 그래프 데이터 합산
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].amount += price;
      }

      // 2. 오늘 매출 합계
      if (dateKey === todayStr) {
        todayRevenue += price;
      }

      // 3. 이번 달 매출 합계
      if (itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear) {
        monthRevenue += price;
      }
    });

    setStats({
      totalSales: totalRevenue,
      monthSales: monthRevenue,
      todaySales: todayRevenue,
      averagePrice: data.length > 0 ? Math.round(totalRevenue / data.length) : 0,
      count: data.length
    });

    setChartData(Object.values(dailyMap));
  };

  // 검색 필터링 (이름, 품목, 차종, 번호 통합)
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
          <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
          <Activity size={20} className="absolute text-emerald-600 animate-pulse" />
        </div>
        <p className="mt-4 text-slate-500 text-[11px] font-black uppercase tracking-widest">실시간 매출 정산 중...</p>
      </div>
    );
  }

  // 그래프 최대값 기준 계산
  const maxAmount = Math.max(...chartData.map(d => d.amount), 1);

  return (
    <div className="space-y-5 animate-in fade-in duration-500 w-full pb-10">
      
      {/* 1. 상단 매출 분석 헤더 */}
      <div className="flex items-center justify-between bg-white px-8 py-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100">
            <BarChart3 size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-none uppercase italic">매출 현황 분석 스튜디오</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 leading-none">Real-time Financial Revenue Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/create')}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-black transition-all shadow-md uppercase tracking-tighter"
          >
            <Plus size={14} className="inline mr-1" /> 보증서 신규 발행
          </button>
        </div>
      </div>

      {/* 2. 매출 요약 지표 카드 */}
      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">이번 달 확정 매출</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic leading-none">₩{formatPrice(stats.monthSales)}</h3>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] text-emerald-500 font-black italic">
            <TrendingUp size={12} /> 실시간 동기화 활성
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">누적 총 매출액</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic leading-none">₩{formatPrice(stats.totalSales)}</h3>
          <div className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest italic leading-none">Total Performance</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">평균 시공 객단가</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic leading-none">₩{formatPrice(stats.averagePrice)}</h3>
          <div className="mt-4 text-[10px] text-indigo-500 font-bold uppercase tracking-widest italic leading-none">Efficiency Score</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">오늘 확정 매출</p>
          <h3 className="text-2xl font-black text-emerald-600 tracking-tighter italic leading-none">₩{formatPrice(stats.todaySales)}</h3>
          <div className="mt-4 text-[10px] text-emerald-500 font-bold uppercase tracking-widest italic animate-pulse leading-none">Daily Updates</div>
        </div>
      </div>

      {/* 3. 주간 매출 추이 그래프 (앱 버전 이식) */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 italic">
              <Activity size={16} className="text-emerald-500" /> 주간 매출 변동 추이 (최근 7일)
            </h2>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase">
             Weekly Revenue Performance
          </div>
        </div>
        
        {/* 고해상도 바 차트 UI */}
        <div className="flex items-end justify-between h-40 gap-4 px-2">
          {chartData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
              {/* 툴팁 */}
              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded whitespace-nowrap z-20 shadow-xl border border-slate-700">
                ₩{formatPrice(d.amount)}
              </div>
              {/* 바 막대 */}
              <div 
                className="w-full bg-slate-50 border border-slate-100 rounded-t-lg group-hover:bg-emerald-500 group-hover:border-emerald-600 transition-all relative overflow-hidden"
                style={{ height: `${(d.amount / maxAmount) * 100}%`, minHeight: '6px' }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
              </div>
              {/* 축 라벨 */}
              <div className="mt-4 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase leading-none">{d.label}</p>
                <p className="text-[10px] font-black text-slate-900 mt-1 uppercase italic leading-none">{d.dayName}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. 매출 상세 내역 리스트 (시공 일자 연동) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* 검색 및 필터 바 */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="고객명, 품목, 차량번호 검색..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 hover:bg-slate-900 hover:text-white transition-all uppercase tracking-tighter shadow-sm">
            <Download size={14} /> 매출 데이터 내보내기
          </button>
        </div>

        {/* 메인 데이터 테이블 */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50/80 text-slate-500 font-black uppercase tracking-widest border-b border-slate-100 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-8 py-3.5">시공 일자</th>
                <th className="px-8 py-3.5">고객명 / 연락처</th>
                <th className="px-8 py-3.5">시공 항목</th>
                <th className="px-8 py-3.5">차량 모델 / 번호</th>
                <th className="px-8 py-3.5 text-right">매출액 (₩)</th>
                <th className="px-8 py-3.5 text-center">전표</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.length > 0 ? filteredData.map((data) => {
                // 시공 일자 실시간 동기화 파싱
                const timestamp = data.createdAt;
                let displayDate = '날짜 정보 없음';
                
                if (timestamp) {
                  const dateObj = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000 || timestamp);
                  if (!isNaN(dateObj)) {
                    displayDate = dateObj.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
                  }
                }

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
                    정산된 매출 데이터가 존재하지 않습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 하단 리포트 요약 */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
          <div>Report Syncing: Total {filteredData.length} 시공 데이터 분석 완료</div>
          <div className="flex gap-2 text-emerald-600">
             Financial System v2.0 Ready
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sales;