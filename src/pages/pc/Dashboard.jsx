import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  TrendingUp, 
  CheckCircle, 
  ChevronRight, 
  ArrowUpRight,
  Loader2,
  Eye,
  BarChart3,
  Database,
  Activity,
  Layers
} from 'lucide-react';

// 파이어베이스 연동 (경로 오류 수정을 위해 src 폴더 기준 상대 경로 유지)
import { auth, db } from '../../firebase';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';

/**
 * Dashboard: PC 전용 데이터 분석 스튜디오
 * 스크롤 없이 주요 지표와 최신 로그를 한눈에 파악할 수 있는 고밀도 레이아웃입니다.
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [warranties, setWarranties] = useState([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    monthSales: 0,
    totalCount: 0
  });
  const [userInfo, setUserInfo] = useState({ storeName: '관리자' });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchUserInfo = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserInfo(userDoc.data());
        }
      } catch (error) {
        console.error("사용자 정보 로드 실패:", error);
      }
    };
    fetchUserInfo();

    const q = collection(db, "warranties");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const myData = allData
        .filter(w => w.userId === user.uid)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      setWarranties(myData);
      calculateStats(myData);
      setLoading(false);
    }, (error) => {
      console.error("데이터 로드 실패:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const calculateStats = (data) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonthData = data.filter(w => {
      const date = w.createdAt?.seconds ? new Date(w.createdAt.seconds * 1000) : new Date();
      return date >= startOfMonth;
    });

    const sales = thisMonthData.reduce((sum, item) => {
      const priceStr = String(item.warrantyPrice || '0').replace(/[^0-9]/g, '');
      return sum + Number(priceStr);
    }, 0);

    const uniquePhones = new Set(data.map(item => item.phone)).size;

    setStats({
      totalCustomers: uniquePhones,
      monthSales: sales,
      totalCount: data.length
    });
  };

  const formatPrice = (val) => Number(val).toLocaleString();

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[500px] bg-slate-50/50">
        <div className="relative flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <Activity size={16} className="absolute text-indigo-600 animate-pulse" />
        </div>
        <p className="mt-4 text-slate-500 text-[11px] font-black uppercase tracking-widest">데이터 동기화 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-6">
      
      {/* 1. 상단 인사이트 헤더 */}
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-lg shadow-indigo-100">
            <Layers size={18} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-none">
              {userInfo.storeName} <span className="text-indigo-600 font-bold ml-1 text-sm border-l border-slate-200 pl-2 uppercase italic">Operational Insight</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Real-time Performance Metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 text-[10px] font-black uppercase tracking-tighter">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Cloud Live
        </div>
      </div>

      {/* 2. 핵심 성과 지표 (콤팩트 레이아웃) */}
      <div className="grid grid-cols-3 gap-5">
        <button 
          onClick={() => navigate('/marketing')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-500 hover:shadow-md transition-all text-left group"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Users size={20} />
            </div>
            <ArrowUpRight size={14} className="text-emerald-500 opacity-0 group-hover:opacity-100" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">전체 관리 고객</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic">{stats.totalCustomers}<span className="text-xs not-italic ml-1 text-slate-400 font-bold">명</span></h3>
        </button>

        <button 
          onClick={() => navigate('/sales')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all text-left group"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <TrendingUp size={20} />
            </div>
            <ArrowUpRight size={14} className="text-emerald-500 opacity-0 group-hover:opacity-100" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">이번 달 매출 합계</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic">₩{formatPrice(stats.monthSales)}</h3>
        </button>

        <button 
          onClick={() => navigate('/sales')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-800 hover:shadow-md transition-all text-left group"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <CheckCircle size={20} />
            </div>
            <div className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded uppercase group-hover:bg-indigo-900 group-hover:text-white transition-colors">All-time</div>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">누적 보증서 발행</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic">{stats.totalCount}<span className="text-xs not-italic ml-1 text-slate-400 font-bold">건</span></h3>
        </button>
      </div>

      {/* 3. 최근 시공 기록 (데이터 중심 고밀도 테이블) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-indigo-600" />
            <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Recent Activity Logs</h2>
          </div>
          <button 
            onClick={() => navigate('/sales')} 
            className="text-[10px] font-black text-indigo-600 hover:underline flex items-center gap-1 uppercase tracking-tighter"
          >
            데이터 전체보기 <ChevronRight size={12} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50/80 text-slate-500 font-black uppercase tracking-[0.2em] border-b border-slate-100 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Vehicle Spec</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5 text-right">Valuation</th>
                <th className="px-6 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {warranties.length > 0 ? warranties.slice(0, 20).map((item) => (
                <tr 
                  key={item.id} 
                  className="hover:bg-indigo-50/30 transition-colors cursor-pointer group" 
                  onClick={() => navigate(`/warranty/view/${item.id}`)}
                >
                  <td className="px-6 py-3.5 text-slate-900">
                    <div className="font-black italic uppercase text-sm">{item.customerName}</div>
                    <div className="text-[9px] text-slate-400 font-bold mt-0.5 tracking-tight">{item.phone}</div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-700 font-bold">
                    <div className="leading-tight text-[11px] uppercase">{item.carModel}</div>
                    <div className="inline-block mt-1 px-1.5 py-0.5 bg-slate-900 text-white rounded text-[8px] font-black tracking-widest leading-none uppercase">{item.plateNumber}</div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="px-2 py-0.5 bg-white text-indigo-600 rounded-md font-black border border-indigo-100 uppercase text-[9px] tracking-tighter italic">
                      {item.productName}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right font-black text-slate-900 text-sm italic tracking-tighter">
                    ₩{formatPrice(item.warrantyPrice)}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                      <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                        <Eye size={14} />
                      </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-32 text-center">
                    <div className="flex flex-col items-center opacity-20">
                      <Database size={32} className="mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-widest italic">데이터 없음</p>
                    </div>
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

export default Dashboard;