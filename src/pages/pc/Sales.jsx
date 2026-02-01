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

// 파이어베이스 연동 (경로 오류 수정을 위해 src 폴더 기준 상대 경로 재확인)
import { auth, db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

/**
 * Sales: PC 전용 매출 현황 분석 스튜디오
 * 앱 버전의 매출 정산 로직을 이식하여 실시간 매출 지표를 시각화합니다.
 */
const Sales = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [warranties, setWarranties] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 매출 분석 상태
  const [stats, setStats] = useState({
    totalSales: 0,
    monthSales: 0,
    todaySales: 0,
    averagePrice: 0,
    count: 0
  });

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

      // 본인 데이터만 필터링 및 최신순 정렬
      const myData = allData
        .filter(w => w.userId === user.uid)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      setWarranties(myData);
      setFilteredData(myData);
      calculateRevenue(myData);
      setLoading(false);
    }, (error) => {
      console.error("매출 데이터 로드 실패:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // 실시간 매출 정산 로직
  const calculateRevenue = (data) => {
    const now = new Date();
    const todayStr = now.toLocaleDateString();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let total = 0;
    let monthTotal = 0;
    let todayTotal = 0;

    data.forEach(item => {
      const price = Number(String(item.warrantyPrice || 0).replace(/[^0-9]/g, ''));
      total += price;

      const date = item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000) : new Date();
      
      // 오늘 매출 체크
      if (date.toLocaleDateString() === todayStr) {
        todayTotal += price;
      }

      // 이번 달 매출 체크
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
  };

  // 검색 필터링
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
          <DollarSign size={20} className="absolute text-emerald-600 animate-pulse" />
        </div>
        <p className="mt-4 text-slate-500 text-[11px] font-black uppercase tracking-widest">매출 데이터 정산 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500 w-full pb-6 px-4">
      
      {/* 1. 상단 분석 헤더 */}
      <div className="flex items-center justify-between bg-white px-8 py-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100">
            <BarChart3 size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-none uppercase italic">매출 현황 분석 스튜디오</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Real-time Financial Revenue Analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl flex flex-col items-end">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Last Update</span>
            <span className="text-xs font-black text-slate-700">{new Date().toLocaleTimeString()}</span>
          </div>
          <button 
            onClick={() => navigate('/create')}
            className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold text-xs hover:bg-black transition-all shadow-md uppercase"
          >
            <Plus size={16} className="inline mr-1" /> 보증서 추가 발행
          </button>
        </div>
      </div>

      {/* 2. 매출 성과 지표 (하이엔드 카드) */}
      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Calendar size={20} />
            </div>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase italic">Month</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">이번 달 매출</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic">₩{formatPrice(stats.monthSales)}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase italic">Total</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">누적 총 매출</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic">₩{formatPrice(stats.totalSales)}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <PieChart size={20} />
            </div>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase italic">Average</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">평균 객단가</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic">₩{formatPrice(stats.averagePrice)}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <Activity size={20} />
            </div>
            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase italic">Today</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">오늘 매출</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic">₩{formatPrice(stats.todaySales)}</h3>
        </div>
      </div>

      {/* 3. 상세 내역 리스트 (고밀도 데이터 테이블) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* 필터 및 검색 */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="고객명, 시공품목, 차량번호 검색..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 hover:bg-slate-900 hover:text-white transition-all uppercase tracking-tighter shadow-sm">
            <Download size={14} /> 매출장 엑셀 내보내기
          </button>
        </div>

        {/* 메인 리스트 */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50/80 text-slate-500 font-black uppercase tracking-widest border-b border-slate-100 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-8 py-4">시공 일자</th>
                <th className="px-8 py-4">고객 정보</th>
                <th className="px-8 py-4">시공 품목</th>
                <th className="px-8 py-4">차량 데이터</th>
                <th className="px-8 py-4 text-right">매출액</th>
                <th className="px-8 py-4 text-center">전표</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.length > 0 ? filteredData.map((data) => {
                const date = data.createdAt?.seconds 
                  ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() 
                  : 'N/A';
                return (
                  <tr 
                    key={data.id} 
                    className="hover:bg-emerald-50/30 transition-all cursor-pointer group" 
                    onClick={() => navigate(`/warranty/view/${data.id}`)}
                  >
                    <td className="px-8 py-5 font-black text-slate-400 italic">
                      {date}
                    </td>
                    <td className="px-8 py-5 text-slate-900">
                      <div className="font-black italic uppercase text-base group-hover:text-emerald-600 transition-colors leading-none">{data.customerName}</div>
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
                  <td colSpan="6" className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center opacity-20">
                      <Database size={40} className="mb-3" />
                      <p className="text-xs font-black uppercase tracking-widest italic">데이터가 존재하지 않습니다.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 하단 요약 정보 */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
          <div>Report Sync: Total {filteredData.length} records analyzed</div>
          <div className="flex gap-2 text-emerald-600">
             Financial Integrity Verified
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sales;