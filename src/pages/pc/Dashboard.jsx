import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  TrendingUp, 
  CheckCircle, 
  ChevronRight, 
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  MessageCircle,
  Loader2,
  Eye,
  BarChart3,
  ArrowRight,
  Plus,
  ArrowDownRight,
  Layers,
  Database
} from 'lucide-react';

// 파이어베이스 연동 (프로젝트 구조상 src/firebase.js를 참조하는 정확한 경로)
import { auth, db } from '../../firebase';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';

/**
 * PC 전용 통합 대시보드 (SaaS 워크스테이션 스타일)
 * 실제 데이터 연동 및 각 지표별 페이지 이동 기능이 포함되었습니다.
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [warranties, setWarranties] = useState([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    monthSales: 0,
    totalCount: 0,
    salesChange: 12.5, // 데코용 증감률
    customerChange: 8.2
  });
  const [userInfo, setUserInfo] = useState({ storeName: '관리자' });

  useEffect(() => {
    // 1. 인증 상태 확인
    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }

    // 2. 사장님 정보(매장명 등) 가져오기
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

    // 3. 실시간 보증서 데이터 구독 (현재 로그인한 사장님 데이터만 필터링)
    const q = collection(db, "warranties");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 본인의 데이터만 필터링 및 최신순 정렬
      const myData = allData
        .filter(w => w.userId === user.uid)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      setWarranties(myData);
      calculateStats(myData);
      setLoading(false);
    }, (error) => {
      console.error("데이터 로드 중 오류 발생:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // 실시간 통계 계산 로직
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

    setStats(prev => ({
      ...prev,
      totalCustomers: uniquePhones,
      monthSales: sales,
      totalCount: data.length
    }));
  };

  const formatPrice = (val) => Number(val).toLocaleString();

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/30 h-full min-h-[600px]">
        <div className="relative mb-6">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <Database size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" />
        </div>
        <p className="text-slate-400 font-bold tracking-tight uppercase italic text-xs">Synchronizing Enterprise Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-20 max-w-[1600px] mx-auto">
      
      {/* 1. 하이엔드 히어로 섹션 (SaaS 스타일) */}
      <div className="flex items-center justify-between bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none">
          <BarChart3 size={200} className="text-slate-900" />
        </div>
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg">
               <Layers size={20} />
             </div>
             <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">
               {userInfo.storeName} <span className="text-indigo-600 not-italic">Enterprise Dashboard</span>
             </h1>
          </div>
          <p className="text-slate-500 font-medium ml-1">실시간 시공 데이터 통합 분석 및 고객 자산 관리 스튜디오</p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="flex flex-col items-end mr-4">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status</span>
             <div className="flex items-center gap-1.5 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-slate-700">Cloud Connected</span>
             </div>
          </div>
          <button 
            onClick={() => navigate('/create')}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
          >
            <Plus size={18} /> 새 보증서 발행
          </button>
        </div>
      </div>

      {/* 2. 핵심 지표 카드 그리드 (PC 전용 고정 비율) */}
      <div className="grid grid-cols-3 gap-6">
        {/* 전체 관리 고객 -> 마케팅 센터 이동 */}
        <div 
          onClick={() => navigate('/marketing')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
              <Users size={22} />
            </div>
            <div className="flex items-center gap-1 text-emerald-500 font-black text-xs">
              <ArrowUpRight size={14} /> {stats.customerChange}%
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Total CRM Assets</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic">
              {stats.totalCustomers}<span className="text-lg not-italic ml-1">명</span>
            </h3>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between text-slate-400 group-hover:text-indigo-600 transition-colors">
            <span className="text-xs font-bold uppercase">Customer Management Center</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 이번 달 매출 -> 영업 관리 이동 */}
        <div 
          onClick={() => navigate('/sales')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner">
              <TrendingUp size={22} />
            </div>
            <div className="flex items-center gap-1 text-emerald-500 font-black text-xs">
              <ArrowUpRight size={14} /> {stats.salesChange}%
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Monthly Performance</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic">
              ₩{formatPrice(stats.monthSales)}
            </h3>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between text-slate-400 group-hover:text-emerald-600 transition-colors">
            <span className="text-xs font-bold uppercase">Financial Sales Report</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 누적 보증서 발행 -> 영업 관리 이동 */}
        <div 
          onClick={() => navigate('/sales')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
              <CheckCircle size={22} />
            </div>
            <div className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-black">All-Time</div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Cumulative Database</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic">
              {stats.totalCount}<span className="text-lg not-italic ml-1">건</span>
            </h3>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between text-slate-400 group-hover:text-indigo-600 transition-colors">
            <span className="text-xs font-bold uppercase">Operational History Archive</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* 3. 워크플로우 퀵 채널 (전문가 모드) */}
      <div className="grid grid-cols-3 gap-6">
        <button 
          onClick={() => navigate('/creator')}
          className="group p-8 bg-slate-900 rounded-[2.5rem] text-left text-white shadow-2xl transition-all hover:scale-[1.02] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-white">
            <Sparkles size={120} />
          </div>
          <div className="flex items-center justify-between mb-10">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/10 group-hover:bg-indigo-600 transition-colors">
              <Sparkles size={28} className="text-indigo-400 group-hover:text-white" />
            </div>
            <ChevronRight size={24} className="text-slate-600 group-hover:translate-x-2 transition-transform" />
          </div>
          <h4 className="text-xl font-black mb-2 italic tracking-tighter uppercase leading-none">AI Agent Studio</h4>
          <p className="text-slate-400 text-sm font-medium">알고리즘 기반 블로그/SNS 포스팅 자동 생성</p>
        </button>

        <button 
          onClick={() => navigate('/create')}
          className="group p-8 bg-white border-2 border-slate-200 hover:border-slate-900 rounded-[2.5rem] text-left shadow-sm transition-all hover:scale-[1.02] relative"
        >
          <div className="flex items-center justify-between mb-10">
            <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-amber-400 transition-colors shadow-inner">
              <ShieldCheck size={28} />
            </div>
            <ChevronRight size={24} className="text-slate-200 group-hover:text-slate-900 group-hover:translate-x-2 transition-transform" />
          </div>
          <h4 className="text-xl font-black text-slate-900 mb-2 italic tracking-tighter uppercase leading-none">Digital Certificate</h4>
          <p className="text-slate-500 text-sm font-medium">보험사 대응 공식 디지털 시공 보증서 발행</p>
        </button>

        <button 
          onClick={() => navigate('/marketing')}
          className="group p-8 bg-white border-2 border-slate-200 hover:border-indigo-600 rounded-[2.5rem] text-left shadow-sm transition-all hover:scale-[1.02] relative"
        >
          <div className="flex items-center justify-between mb-10">
            <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
              <MessageCircle size={28} />
            </div>
            <ChevronRight size={24} className="text-slate-200 group-hover:text-indigo-600 group-hover:translate-x-2 transition-transform" />
          </div>
          <h4 className="text-xl font-black text-slate-900 mb-2 italic tracking-tighter uppercase leading-none">Marketing Core</h4>
          <p className="text-slate-500 text-sm font-medium">고객 관리 및 재방문 유도 타겟 마케팅</p>
        </button>
      </div>

      {/* 4. 최신 이력 데이터 그리드 (전문적인 데이터 테이블) */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-1.5 h-8 bg-indigo-600 rounded-full" />
             <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none">Operational Logs</h2>
          </div>
          <button 
            onClick={() => navigate('/sales')} 
            className="px-6 py-2.5 bg-slate-50 text-slate-500 rounded-xl font-black text-[11px] flex items-center gap-2 hover:bg-slate-900 hover:text-white transition-all uppercase tracking-widest"
          >
            Full Archive Access <ChevronRight size={14} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] border-b border-slate-100">
              <tr>
                <th className="px-10 py-6">Customer Profile</th>
                <th className="px-10 py-6">Vehicle Intelligence</th>
                <th className="px-10 py-6">Service Category</th>
                <th className="px-10 py-6">Valuation</th>
                <th className="px-10 py-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {warranties.length > 0 ? warranties.slice(0, 8).map((item) => (
                <tr 
                  key={item.id} 
                  className="hover:bg-slate-50/50 transition-all cursor-pointer group" 
                  onClick={() => navigate(`/warranty/view/${item.id}`)}
                >
                  <td className="px-10 py-6">
                    <div className="font-black text-lg text-slate-900 group-hover:text-indigo-600 transition-colors uppercase">{item.customerName}</div>
                    <div className="text-xs text-slate-400 font-bold mt-0.5 tracking-tight">{item.phone}</div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="font-bold text-slate-700 text-base tracking-tight leading-none uppercase">{item.carModel}</div>
                    <div className="inline-block mt-2 px-2.5 py-0.5 bg-slate-900 text-white rounded text-[10px] font-black tracking-widest leading-none uppercase">{item.plateNumber}</div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-2">
                       <span className="text-sm font-black text-indigo-600 italic uppercase tracking-tighter px-3 py-1 bg-indigo-50 rounded-lg">{item.productName}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 font-black text-slate-900 text-xl tracking-tighter italic">
                    ₩{formatPrice(item.warrantyPrice)}
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex justify-center">
                       <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-lg transition-all">
                          <Eye size={20} />
                       </div>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-10 py-32 text-center">
                    <div className="flex flex-col items-center opacity-10">
                      <Database size={64} className="mb-4" />
                      <p className="text-xl font-black uppercase italic tracking-widest leading-none">Awaiting Data Entries</p>
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