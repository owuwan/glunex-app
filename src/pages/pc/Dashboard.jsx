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
  Layers,
  Database,
  Calendar,
  Clock,
  ExternalLink,
  Activity
} from 'lucide-react';

// 파이어베이스 연동 (프로젝트 구조에 맞춘 상대 경로 수정)
import { auth, db } from '../../firebase';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';

/**
 * Dashboard: PC 전용 프로페셔널 매니지먼트 스튜디오
 * 넓은 화면을 활용한 고밀도 레이아웃으로 스크롤을 최소화하고 업무 효율을 극대화했습니다.
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

    // 사용자 정보 로드
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

    // 실시간 데이터 구독
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
      calculateStats(myData);
      setLoading(false);
    }, (error) => {
      console.error("데이터 로드 실패:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // 통계 데이터 계산
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
          <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <Activity size={20} className="absolute text-indigo-600 animate-pulse" />
        </div>
        <p className="mt-4 text-slate-500 text-xs font-bold uppercase tracking-widest">데이터 동기화 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-6">
      
      {/* 1. 컴팩트 헤더 섹션 */}
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-indigo-100 shadow-lg">
            <Layers size={18} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-none">
              {userInfo.storeName} <span className="text-indigo-600 font-bold ml-1 text-sm border-l border-slate-200 pl-2">통합 관리 대시보드</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Enterprise Resource Planning Center</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 text-[10px] font-black uppercase tracking-tighter">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Cloud Connected
          </div>
          <button 
            onClick={() => navigate('/create')}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-black transition-all shadow-md"
          >
            <Plus size={14} /> 보증서 신규 발행
          </button>
        </div>
      </div>

      {/* 2. 핵심 지표 카드 - 전문가용 콤팩트 스타일 */}
      <div className="grid grid-cols-3 gap-5">
        <button 
          onClick={() => navigate('/marketing')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-500 hover:shadow-md transition-all text-left group relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Users size={20} />
            </div>
            <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase italic group-hover:bg-indigo-100">CRM Data</div>
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">전체 관리 고객</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic">{stats.totalCustomers}<span className="text-xs not-italic ml-1 text-slate-400">명</span></h3>
          <div className="mt-4 flex items-center text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
            고객 관리 센터 이동 <ChevronRight size={12} />
          </div>
        </button>

        <button 
          onClick={() => navigate('/sales')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all text-left group relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <TrendingUp size={20} />
            </div>
            <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase italic group-hover:bg-emerald-100">Sales Report</div>
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">이번 달 매출 합계</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic">₩{formatPrice(stats.monthSales)}</h3>
          <div className="mt-4 flex items-center text-[10px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
            매출 관리 페이지 이동 <ChevronRight size={12} />
          </div>
        </button>

        <button 
          onClick={() => navigate('/sales')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-800 hover:shadow-md transition-all text-left group relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <CheckCircle size={20} />
            </div>
            <div className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase italic group-hover:bg-slate-200">History</div>
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">누적 보증서 발행</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic">{stats.totalCount}<span className="text-xs not-italic ml-1 text-slate-400">건</span></h3>
          <div className="mt-4 flex items-center text-[10px] font-bold text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity">
            시공 이력 전체 보기 <ChevronRight size={12} />
          </div>
        </button>
      </div>

      <div className="grid grid-cols-12 gap-5 items-start">
        {/* 3. 최근 시공 이력 테이블 - 고밀도 모드 */}
        <div className="col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[480px]">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-indigo-600" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">최근 시공 기록</h2>
            </div>
            <button 
              onClick={() => navigate('/sales')} 
              className="text-[10px] font-black text-indigo-600 hover:underline flex items-center gap-1 uppercase tracking-tighter"
            >
              전체 데이터 아카이브 <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50/80 text-slate-500 font-black uppercase tracking-widest border-b border-slate-100 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-5 py-3">고객 프로필</th>
                  <th className="px-5 py-3">차량 데이터</th>
                  <th className="px-5 py-3">시공 카테고리</th>
                  <th className="px-5 py-3 text-right">보증 가액</th>
                  <th className="px-5 py-3 text-center">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {warranties.length > 0 ? warranties.slice(0, 10).map((item) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-indigo-50/30 transition-colors cursor-pointer group" 
                    onClick={() => navigate(`/warranty/view/${item.id}`)}
                  >
                    <td className="px-5 py-3 text-slate-900">
                      <div className="font-black italic uppercase text-sm">{item.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-0.5">{item.phone}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-700 font-bold">
                      <div className="leading-tight">{item.carModel}</div>
                      <div className="inline-block mt-1 px-1.5 py-0.5 bg-slate-900 text-white rounded text-[9px] font-black tracking-widest leading-none">{item.plateNumber}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md font-black border border-indigo-100 uppercase text-[9px]">
                        {item.productName}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-black text-slate-900 text-sm italic">
                      ₩{formatPrice(item.warrantyPrice)}
                    </td>
                    <td className="px-5 py-3 text-center">
                        <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                          <Eye size={14} />
                        </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="px-5 py-24 text-center">
                      <div className="flex flex-col items-center opacity-20">
                        <Database size={40} className="mb-3" />
                        <p className="text-xs font-black uppercase tracking-widest italic">No Data Entries Found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. 사이드 퀵 액션 패널 - 고밀도 레이아웃 */}
        <div className="col-span-4 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-5">
              <Activity size={16} className="text-indigo-600" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">주요 서비스 스위치</h2>
            </div>
            <div className="space-y-2.5">
              <button 
                onClick={() => navigate('/creator')}
                className="w-full group p-4 bg-slate-950 rounded-xl text-left hover:bg-indigo-600 transition-all flex items-center justify-between border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center text-indigo-400 group-hover:bg-white group-hover:text-indigo-600 transition-colors">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white leading-tight italic uppercase tracking-tight">AI Agent Studio</h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5 group-hover:text-white/80 transition-colors">콘텐츠 자동 생성 엔진</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>

              <button 
                onClick={() => navigate('/create')}
                className="w-full group p-4 bg-white border border-slate-200 rounded-xl text-left hover:border-indigo-500 hover:shadow-md transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors border border-amber-100">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 leading-tight italic uppercase tracking-tight">Digital Warranty</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">신규 보증서 발급 시스템</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </button>

              <button 
                onClick={() => navigate('/marketing')}
                className="w-full group p-4 bg-white border border-slate-200 rounded-xl text-left hover:border-indigo-500 hover:shadow-md transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors border border-blue-100">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 leading-tight italic uppercase tracking-tight">CRM Hub Center</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">고객 마케팅 및 이력 관리</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>

          {/* 파트너십 안내 섹션 */}
          <div className="bg-indigo-600 rounded-xl p-5 text-white shadow-lg relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform">
              <Database size={80} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                 <ExternalLink size={14} />
                 <h4 className="text-[11px] font-black uppercase tracking-widest">System Notice</h4>
              </div>
              <p className="text-[10px] text-indigo-100 font-bold leading-relaxed">
                GLUNEX 파트너 전용 고해상도 리소스 및 마케팅 가이드북이 2.0 버전으로 업데이트 되었습니다. 설정 탭에서 확인해 주세요.
              </p>
              <button className="mt-4 w-full py-2 text-[9px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/20">
                업데이트 이력 확인
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;