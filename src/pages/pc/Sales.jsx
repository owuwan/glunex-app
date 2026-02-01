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
  Activity
} from 'lucide-react';

// 파이어베이스 연동
import { auth, db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

/**
 * Sales: 매출 현황 분석 스튜디오
 * 앱 버전과 동일하게 '시공예약일(reservationDate)'을 기준으로 모든 데이터를 집계합니다.
 */
const Sales = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [warranties, setWarranties] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [stats, setStats] = useState({
    totalSales: 0,
    monthSales: 0,
    todaySales: 0,
    averagePrice: 0,
    count: 0
  });

  const [chartData, setChartData] = useState([]);

  // [유틸리티] reservationDate(문자열 혹은 객체)를 안전하게 처리
  const getReservationDate = (item) => {
    if (!item.reservationDate) return null;
    // 보통 "2024-05-20" 형태의 문자열로 저장되므로 이를 Date 객체로 변환
    const d = new Date(item.reservationDate);
    return isNaN(d.getTime()) ? null : d;
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }

    const q = collection(db, "warranties");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 본인 데이터 필터링 및 시공예약일 기준 내림차순 정렬
      const myData = allData
        .filter(w => w.userId === user.uid)
        .sort((a, b) => {
          const dateA = a.reservationDate || "";
          const dateB = b.reservationDate || "";
          return dateB.localeCompare(dateA); // 최신 날짜가 위로
        });

      setWarranties(myData);
      setFilteredData(myData);
      analyzeByReservationDate(myData);
      setLoading(false);
    }, (error) => {
      console.error("데이터 동기화 실패:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // 매출 및 그래프 분석 (시공예약일 기준)
  const analyzeByReservationDate = (data) => {
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    let total = 0;
    let month = 0;
    let today = 0;
    
    // 그래프용 최근 7일 맵
    const dailyMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = { 
        label: `${d.getMonth() + 1}/${d.getDate()}`, 
        dayName: d.toLocaleDateString('ko-KR', { weekday: 'short' }),
        amount: 0 
      };
    }

    data.forEach(item => {
      const price = Number(String(item.warrantyPrice || 0).replace(/[^0-9]/g, ''));
      total += price;

      // 시공예약일(reservationDate) 기준 처리
      const resDateStr = item.reservationDate; // "YYYY-MM-DD"
      if (!resDateStr) return;

      const itemDate = new Date(resDateStr);
      
      // 1. 주간 그래프 합산
      if (dailyMap[resDateStr]) {
        dailyMap[resDateStr].amount += price;
      }

      // 2. 오늘 매출
      if (resDateStr === todayKey) {
        today += price;
      }

      // 3. 이번 달 매출
      if (itemDate.getMonth() === curMonth && itemDate.getFullYear() === curYear) {
        month += price;
      }
    });

    setStats({
      totalSales: total,
      monthSales: month,
      todaySales: today,
      averagePrice: data.length > 0 ? Math.round(total / data.length) : 0,
      count: data.length
    });

    setChartData(Object.values(dailyMap));
  };

  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    const result = warranties.filter(w => 
      w.customerName?.toLowerCase().includes(lower) ||
      w.productName?.toLowerCase().includes(lower) ||
      w.carModel?.toLowerCase().includes(lower) ||
      w.plateNumber?.toLowerCase().includes(lower)
    );
    setFilteredData(result);
  }, [searchTerm, warranties]);

  const fmt = (v) => Number(v).toLocaleString();

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[500px]">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
        <p className="text-slate-500 text-xs font-bold">시공예약일 데이터 동기화 중...</p>
      </div>
    );
  }

  const maxAmt = Math.max(...chartData.map(d => d.amount), 1);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full pb-10">
      
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between bg-white px-8 py-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg">
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-none italic">매출 현황 분석</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">시공예약일 기준 실시간 데이터</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/create')}
          className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-black transition-all"
        >
          <Plus size={14} className="inline mr-1" /> 보증서 발행
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-5">
        {[
          { label: '이번 달 매출', val: stats.monthSales, color: 'text-indigo-600' },
          { label: '누적 총 매출', val: stats.totalSales, color: 'text-slate-900' },
          { label: '평균 단가', val: stats.averagePrice, color: 'text-blue-600' },
          { label: '오늘 매출', val: stats.todaySales, color: 'text-emerald-600' }
        ].map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{s.label}</p>
            <h3 className={`text-2xl font-black ${s.color} tracking-tighter italic leading-none`}>₩{fmt(s.val)}</h3>
          </div>
        ))}
      </div>

      {/* 매출 그래프 (시공예약일 기준) */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 italic mb-10">
          <TrendingUp size={16} className="text-emerald-500" /> 주간 매출 추이 (예약일 기준)
        </h2>
        <div className="flex items-end justify-between h-40 gap-4 px-2">
          {chartData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded whitespace-nowrap z-20">
                ₩{fmt(d.amount)}
              </div>
              <div 
                className="w-full bg-slate-50 border border-slate-100 rounded-t-lg group-hover:bg-emerald-500 transition-all relative overflow-hidden"
                style={{ height: `${(d.amount / maxAmt) * 100}%`, minHeight: '6px' }}
              />
              <div className="mt-4 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase leading-none">{d.label}</p>
                <p className="text-[10px] font-black text-slate-900 mt-1 uppercase italic leading-none">{d.dayName}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 상세 테이블 (시공예약일 표시) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="고객명, 품목 검색..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50/80 text-slate-500 font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-4 text-indigo-600">시공예약일</th>
                <th className="px-8 py-4">고객 프로필</th>
                <th className="px-8 py-4">시공 품목</th>
                <th className="px-8 py-4">차량 정보</th>
                <th className="px-8 py-4 text-right">매출액</th>
                <th className="px-8 py-4 text-center">조회</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.length > 0 ? filteredData.map((data) => (
                <tr 
                  key={data.id} 
                  className="hover:bg-indigo-50/30 transition-all cursor-pointer group" 
                  onClick={() => navigate(`/warranty/view/${data.id}`)}
                >
                  <td className="px-8 py-5 font-black text-slate-400 italic">
                    {data.reservationDate ? data.reservationDate.replace(/-/g, '. ') : '날짜 미지정'}
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
                  <td className="px-8 py-5 text-slate-700 font-bold leading-tight">
                    <div className="text-[11px] uppercase">{data.carModel}</div>
                    <div className="inline-block mt-1.5 px-2 py-0.5 bg-slate-900 text-white rounded text-[8px] font-black tracking-widest leading-none uppercase">{data.plateNumber}</div>
                  </td>
                  <td className="px-8 py-5 text-right font-black text-slate-900 text-base italic tracking-tighter">
                    ₩{fmt(data.warrantyPrice)}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                      <Eye size={16} />
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-8 py-32 text-center text-slate-300 font-black italic uppercase tracking-widest">
                    분석 가능한 데이터가 존재하지 않습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Sales;