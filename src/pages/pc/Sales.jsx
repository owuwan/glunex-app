import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  ChevronRight, 
  FileText, 
  DollarSign, 
  UserPlus, 
  Eye,
  Database,
  Loader2,
  Car
} from 'lucide-react';

// 파이어베이스 연동 (경로 오류 수정을 위해 src 폴더 기준 상대 경로 재확인)
import { auth, db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

/**
 * PC 전용 Sales(영업 관리 / 고객리스트) 페이지
 * Firestore의 'warranties' 컬렉션에서 사장님의 실제 데이터를 실시간으로 가져옵니다.
 */
const Sales = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [warranties, setWarranties] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalSales: 0,
    totalCustomers: 0,
    totalCount: 0
  });

  useEffect(() => {
    // 1. 인증 상태 확인
    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }

    // 2. 실시간 데이터 구독 (Rule 2 준수: 전체 데이터를 가져온 후 메모리에서 필터링)
    const q = collection(db, "warranties");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 현재 로그인한 사장님의 데이터만 필터링 및 최신순 정렬
      const myData = allData
        .filter(w => w.userId === user.uid)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      setWarranties(myData);
      setFilteredData(myData);
      calculateStats(myData);
      setLoading(false);
    }, (error) => {
      console.error("데이터 로드 실패:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // 3. 검색 기능 구현 (이름, 차종, 차량번호 통합 검색)
  useEffect(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const result = warranties.filter(w => 
      w.customerName?.toLowerCase().includes(lowerSearch) ||
      w.carModel?.toLowerCase().includes(lowerSearch) ||
      w.plateNumber?.toLowerCase().includes(lowerSearch)
    );
    setFilteredData(result);
  }, [searchTerm, warranties]);

  // 실시간 성과 통계 계산
  const calculateStats = (data) => {
    // 매출 합계 (금액 문자열에서 숫자만 추출하여 계산)
    const sales = data.reduce((sum, item) => {
      const price = Number(String(item.warrantyPrice || 0).replace(/[^0-9]/g, ''));
      return sum + price;
    }, 0);

    // 중복 제외 실고객 수 (전화번호 기준)
    const uniquePhones = new Set(data.map(item => item.phone)).size;

    setStats({
      totalSales: sales,
      totalCustomers: uniquePhones,
      totalCount: data.length
    });
  };

  const formatPrice = (val) => Number(val).toLocaleString();

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[600px] bg-slate-50/30">
        <div className="relative mb-6">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <Database size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" />
        </div>
        <p className="text-slate-500 font-black uppercase tracking-widest text-[11px]">실시간 고객 데이터 동기화 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-10 w-full">
      
      {/* 1. 상단 통계 헤더 (실제 데이터 반영) */}
      <div className="flex items-center justify-between bg-white px-8 py-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
            <Database size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase italic">고객 데이터 아카이브</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 leading-none">우리매장 전체 시공 및 고객 자산 관리 시스템</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/create')}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl font-bold text-xs hover:bg-black transition-all shadow-md uppercase tracking-tighter"
          >
            <Plus size={16} /> 보증서 신규 발행
          </button>
        </div>
      </div>

      {/* 2. 성과 지표 대시보드 */}
      <div className="grid grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <UserPlus size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">관리 고객 수</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 italic leading-none">{stats.totalCustomers}<span className="text-sm not-italic ml-1 text-slate-400 font-bold">명</span></h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">전체 시공 매출</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 italic leading-none">₩{formatPrice(stats.totalSales)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">발행 보증서</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 italic leading-none">{stats.totalCount}<span className="text-sm not-italic ml-1 text-slate-400 font-bold">건</span></h3>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 데이터 리스트 테이블 (고밀도 전문가용) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* 리스트 헤더 및 검색 */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="이름, 차종, 차량번호 검색..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 hover:bg-slate-900 hover:text-white transition-all uppercase tracking-tighter shadow-sm">
              <Download size={14} /> Excel 내보내기
            </button>
          </div>
        </div>

        {/* 메인 데이터 그리드 */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b border-slate-100 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-3.5">고객 정보</th>
                <th className="px-6 py-3.5">차량 데이터</th>
                <th className="px-6 py-3.5">시공 카테고리</th>
                <th className="px-6 py-3.5 text-right">보증 가액</th>
                <th className="px-6 py-3.5 text-center">조회</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.length > 0 ? filteredData.map((data) => (
                <tr 
                  key={data.id} 
                  className="hover:bg-indigo-50/30 transition-all cursor-pointer group" 
                  onClick={() => navigate(`/warranty/view/${data.id}`)}
                >
                  <td className="px-6 py-4 text-slate-900">
                    <div className="font-black italic uppercase text-base group-hover:text-indigo-600 transition-colors leading-none">{data.customerName}</div>
                    <div className="text-[9px] text-slate-400 font-bold mt-1 tracking-tighter leading-none">{data.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-bold">
                    <div className="leading-tight text-[11px] uppercase">{data.carModel}</div>
                    <div className="inline-block mt-1.5 px-2 py-0.5 bg-slate-900 text-white rounded text-[8px] font-black tracking-widest leading-none uppercase">{data.plateNumber}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-white text-indigo-600 rounded-md font-black border border-indigo-100 uppercase text-[9px] tracking-tighter italic">
                      {data.productName}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-900 text-base italic tracking-tighter">
                    ₩{formatPrice(data.warrantyPrice)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                      <Eye size={16} />
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-32 text-center">
                    <div className="flex flex-col items-center opacity-20">
                      <Car size={40} className="mb-3" />
                      <p className="text-xs font-black uppercase tracking-widest italic">검색 결과가 존재하지 않습니다.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 하단 요약 정보 */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
          <div>DB Status: Total {filteredData.length} records matched</div>
          <div className="flex gap-2">
             <div className="bg-white border border-slate-200 px-3 py-1 rounded-md">Archive Sync v2.0</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sales;