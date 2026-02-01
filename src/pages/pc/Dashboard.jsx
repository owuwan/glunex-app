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
  Layers,
  Crown,
  User
} from 'lucide-react';

// 파이어베이스 연동 (경로 오류 수정을 위해 src 폴더 기준 상대 경로 유지)
import { auth, db } from '../../firebase';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';

/**
 * Dashboard: PC 전용 데이터 분석 스튜디오
 * 좌우 여백을 제거하고 한글화 및 회원 등급 표시가 적용된 전문가용 레이아웃입니다.
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
  const [userInfo, setUserInfo] = useState({ storeName: '관리자', userStatus: 'free' });

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
    <div className="space-y-6 animate-in fade-in duration-500 w-full pb-6 px-4">
      
      {/* 1. 상단 인사이트 헤더 */}
      <div className="flex items-center justify-between bg-white px-8 py-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
            <Layers size={22} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black text-slate-900 leading-none">
                {userInfo.storeName} <span className="text-indigo-600 font-bold ml-1 text-sm border-l border-slate-200 pl-3">운영 분석 인사이트</span>
              </h1>
              {/* 회원 등급 배지 */}
              <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 border text-[10px] font-black tracking-tighter ${
                userInfo.userStatus === 'premium' 
                ? 'bg-amber-50 text-amber-600 border-amber-100' 
                : 'bg-slate-50 text-slate-400 border-slate-100'
              }`}>
                {userInfo.userStatus === 'premium' ? <Crown size={12} fill="currentColor" /> : <User size={12} />}
                {userInfo.userStatus === 'premium' ? '프리미엄 회원' : '무료 회원'}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">실시간 비즈니스 성과 지표 분석</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 text-[11px] font-black uppercase tracking-tighter">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          서버 연결됨
        </div>
      </div>

      {/* 2. 핵심 성과 지표 */}
      <div className="grid grid-cols-3 gap-6">
        <button 
          onClick={() => navigate('/marketing')}
          className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-500 hover:shadow-md transition-all text-left group"
        >
          <div className="flex justify-between items-start mb-5">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Users size={24} />
            </div>
            <ArrowUpRight size={18} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" />
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">전체 관리 고객</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">{stats.totalCustomers}<span className="text-sm not-italic ml-1.5 text-slate-400 font-bold">명</span></h3>
        </button>

        <button 
          onClick={() => navigate('/sales')}
          className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all text-left group"
        >
          <div className="flex justify-between items-start mb-5">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <TrendingUp size={24} />
            </div>
            <ArrowUpRight size={18} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" />
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">이번 달 매출 합계</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">₩{formatPrice(stats.monthSales)}</h3>
        </button>

        <button 
          onClick={() => navigate('/sales')}
          className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-800 hover:shadow-md transition-all text-left group"
        >
          <div className="flex justify-between items-start mb-5">
            <div className="p-3 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <CheckCircle size={24} />
            </div>
            <div className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg uppercase group-hover:bg-indigo-900 group-hover:text-white transition-colors">누적 데이터</div>
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">누적 보증서 발행</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">{stats.totalCount}<span className="text-sm not-italic ml-1.5 text-slate-400 font-bold">건</span></h3>
        </button>
      </div>

      {/* 3. 최근 시공 기록 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[550px]">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <Database size={18} className="text-indigo-600" />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">최근 시공 활동 기록</h2>
          </div>
          <button 
            onClick={() => navigate('/sales')} 
            className="text-[10px] font-black text-indigo-600 hover:underline flex items-center gap-2 uppercase tracking-tighter"
          >
            데이터 아카이브 전체보기 <ChevronRight size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50/80 text-slate-500 font-black uppercase tracking-widest border-b border-slate-100 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-8 py-4">고객 정보</th>
                <th className="px-8 py-4">차량 모델 및 번호</th>
                <th className="px-8 py-4">시공 카테고리</th>
                <th className="px-8 py-4 text-right">보증 가액</th>
                <th className="px-8 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {warranties.length > 0 ? warranties.slice(0, 20).map((item) => (
                <tr 
                  key={item.id} 
                  className="hover:bg-indigo-50/30 transition-colors cursor-pointer group" 
                  onClick={() => navigate(`/warranty/view/${item.id}`)}
                >
                  <td className="px-8 py-5 text-slate-900">
                    <div className="font-black italic uppercase text-base group-hover:text-indigo-600 transition-colors">{item.customerName}</div>
                    <div className="text-[10px] text-slate-400 font-bold mt-1 tracking-tight">{item.phone}</div>
                  </td>
                  <td className="px-8 py-5 text-slate-700 font-bold">
                    <div className="leading-tight text-sm uppercase">{item.carModel}</div>
                    <div className="inline-block mt-2 px-2 py-0.5 bg-slate-900 text-white rounded text-[9px] font-black tracking-widest leading-none uppercase">{item.plateNumber}</div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-white text-indigo-600 rounded-lg font-black border border-indigo-100 uppercase text-[10px] tracking-tighter italic">
                      {item.productName}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right font-black text-slate-900 text-base italic tracking-tighter">
                    ₩{formatPrice(item.warrantyPrice)}
                  </td>
                  <td className="px-8 py-5 text-center">
                      <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                        <Eye size={18} />
                      </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center opacity-20">
                      <Database size={48} className="mb-4" />
                      <p className="text-sm font-black uppercase tracking-widest italic">기록된 시공 데이터가 없습니다.</p>
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