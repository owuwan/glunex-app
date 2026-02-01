import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  TrendingUp, 
  CheckCircle, 
  ChevronRight, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ShieldCheck,
  MessageCircle,
  Loader2,
  Eye
} from 'lucide-react';

// 파이어베이스 연동 (상위 폴더 경로 확인 후 임포트)
import { auth, db } from '../../firebase';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';

/**
 * PC 전용 대시보드 (실제 데이터 연동 버전)
 * 더미 데이터를 제거하고 Firestore의 실제 시공 내역을 실시간 반영합니다.
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

    // 1. 이번 달 데이터 필터링
    const thisMonthData = data.filter(w => {
      const date = w.createdAt?.seconds ? new Date(w.createdAt.seconds * 1000) : new Date();
      return date >= startOfMonth;
    });

    // 2. 매출 합계 계산 (문자열 금액에서 숫자만 추출)
    const sales = thisMonthData.reduce((sum, item) => {
      const priceStr = String(item.warrantyPrice || '0').replace(/[^0-9]/g, '');
      return sum + Number(priceStr);
    }, 0);

    // 3. 고유 고객 수 (전화번호 기준 중복 제거)
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
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-slate-400 font-bold">매장 데이터를 불러오고 있습니다...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1. 상단 타이틀 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {userInfo.storeName} <span className="text-indigo-600">통합 대시보드</span>
          </h1>
          <p className="text-slate-500 mt-1">오늘의 매장 데이터와 주요 지표를 실시간으로 확인하세요.</p>
        </div>
        <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border border-emerald-100 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          실시간 연동중
        </div>
      </div>

      {/* 2. 핵심 지표 카드 (평균 작업 시간 제거 및 실제 데이터 연동) */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Users size={24} />
          </div>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">전체 관리 고객</p>
          <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.totalCustomers}명</h3>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <TrendingUp size={24} />
          </div>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">이번 달 매출</p>
          <h3 className="text-3xl font-black text-slate-900 mt-1">₩{formatPrice(stats.monthSales)}</h3>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <CheckCircle size={24} />
          </div>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">누적 보증서 발행</p>
          <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.totalCount}건</h3>
        </div>
      </div>

      {/* 3. 퀵 메뉴 섹션 */}
      <div className="grid grid-cols-3 gap-6">
        <button 
          onClick={() => navigate('/creator')}
          className="p-8 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] text-left text-white shadow-xl shadow-indigo-100 group transition-all hover:-translate-y-1"
        >
          <div className="flex items-center justify-between mb-10">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <Sparkles size={28} className="text-white" />
            </div>
            <ChevronRight size={24} className="text-white/50 group-hover:translate-x-1 transition-transform" />
          </div>
          <h4 className="text-2xl font-black mb-1">AI 마케팅 에이전트</h4>
          <p className="text-indigo-100 text-sm font-medium">블로그 및 SNS 포스팅 10초 완성</p>
        </button>

        <button 
          onClick={() => navigate('/create')}
          className="p-8 bg-white border border-slate-200 rounded-[2.5rem] text-left shadow-sm group transition-all hover:border-indigo-600 hover:-translate-y-1 hover:shadow-xl"
        >
          <div className="flex items-center justify-between mb-10">
            <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
              <ShieldCheck size={28} />
            </div>
            <ChevronRight size={24} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
          </div>
          <h4 className="text-2xl font-black text-slate-900 mb-1">신규 보증서 발행</h4>
          <p className="text-slate-400 text-sm font-medium">공식 시공 보증서 디지털 발급</p>
        </button>

        <button 
          onClick={() => navigate('/marketing')}
          className="p-8 bg-white border border-slate-200 rounded-[2.5rem] text-left shadow-sm group transition-all hover:border-blue-600 hover:-translate-y-1 hover:shadow-xl"
        >
          <div className="flex items-center justify-between mb-10">
            <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
              <MessageCircle size={28} />
            </div>
            <ChevronRight size={24} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
          </div>
          <h4 className="text-2xl font-black text-slate-900 mb-1">고객 관리 센터</h4>
          <p className="text-slate-400 text-sm font-medium">재방문 유도 알림 및 상담 이력</p>
        </button>
      </div>

      {/* 4. 최근 시공 리스트 (실제 데이터 연동) */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h2 className="text-xl font-bold">최근 발행 이력</h2>
          <button onClick={() => navigate('/sales')} className="text-indigo-600 text-sm font-bold flex items-center gap-1 hover:underline">
            전체 보기 <ChevronRight size={16} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[11px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">고객 정보</th>
                <th className="px-8 py-5">차종 및 번호</th>
                <th className="px-8 py-5">시공 항목</th>
                <th className="px-8 py-5">보증 가액</th>
                <th className="px-8 py-5 text-center">조회</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {warranties.length > 0 ? warranties.slice(0, 5).map((item) => (
                <tr 
                  key={item.id} 
                  className="hover:bg-slate-50/50 transition-colors cursor-pointer group" 
                  onClick={() => navigate(`/warranty/view/${item.id}`)}
                >
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-900">{item.customerName}</div>
                    <div className="text-[10px] text-slate-400 font-bold">{item.phone}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-600 text-sm">{item.carModel}</div>
                    <div className="inline-block mt-1 px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-400 font-bold uppercase">{item.plateNumber}</div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black">{item.productName}</span>
                  </td>
                  <td className="px-8 py-5 font-black text-slate-900 text-sm">
                    ₩{formatPrice(item.warrantyPrice)}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex justify-center">
                       <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <Eye size={16} />
                       </div>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center opacity-30">
                      <Layout size={48} className="mb-4" />
                      <p className="font-bold text-slate-900">발행된 보증서 내역이 없습니다.</p>
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