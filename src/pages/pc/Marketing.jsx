import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithCustomToken, 
  signInAnonymously 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Layout, 
  Users, 
  Target, 
  BarChart3, 
  Settings, 
  AlertCircle,
  Loader2,
  TrendingUp,
  Mail,
  MessageSquare
} from 'lucide-react';

// Firebase 설정 및 초기화
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'glunex-marketing-app';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [error, setError] = useState(null);

  // 1. 인증 처리 (Rule 3: Auth Before Queries)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("인증 실패:", err);
        setError("인증 과정에서 오류가 발생했습니다.");
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. 데이터 페칭 (Rule 1, 2 준수)
  useEffect(() => {
    if (!user) return; // 인증 전에는 쿼리 실행 금지

    const campaignsRef = collection(db, 'artifacts', appId, 'public', 'data', 'campaigns');
    
    // 단순 쿼리 사용 (Rule 2: No Complex Queries)
    const unsubscribe = onSnapshot(
      campaignsRef,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCampaigns(data);
      },
      (err) => {
        console.error("데이터 로드 실패:", err);
        setError("데이터를 불러오는 중 권한 문제가 발생했습니다.");
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // 에러 발생 시 UI (백색 화면 방지)
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-xl bg-red-50 p-6 text-center border border-red-100">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-lg font-bold text-red-800">오류가 발생했습니다</h2>
          <p className="mt-2 text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* 사이드바 */}
      <nav className="w-full md:w-64 bg-white border-r border-gray-200 p-4 space-y-2">
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Target className="text-white h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Marketing</span>
        </div>
        
        <NavItem icon={<BarChart3 />} label="대시보드" active />
        <NavItem icon={<Users />} label="고객 분석" />
        <NavItem icon={<Mail />} label="캠페인 관리" />
        <NavItem icon={<MessageSquare />} label="채널 메시지" />
        <NavItem icon={<Settings />} label="설정" />

        <div className="absolute bottom-4 left-4 right-4">
          <div className="p-3 bg-gray-100 rounded-lg overflow-hidden">
            <p className="text-xs text-gray-500 mb-1">접속 계정 (UID)</p>
            <p className="text-[10px] font-mono text-gray-700 truncate">{user?.uid}</p>
          </div>
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">마케팅 센터</h1>
          <p className="text-gray-500">현재 진행 중인 마케팅 캠페인과 성과 지표입니다.</p>
        </header>

        {/* 통계 요약 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="전체 클릭수" value="24.5k" change="+12.5%" icon={<TrendingUp className="text-green-600" />} />
          <StatCard title="전환율" value="3.2%" change="+0.4%" icon={<Target className="text-blue-600" />} />
          <StatCard title="활성 캠페인" value={campaigns.length.toString()} change="0" icon={<BarChart3 className="text-purple-600" />} />
        </div>

        {/* 캠페인 리스트 */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">캠페인 목록</h2>
            <button className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
              신규 생성
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-medium">
                <tr>
                  <th className="px-6 py-3">캠페인명</th>
                  <th className="px-6 py-3">상태</th>
                  <th className="px-6 py-3">성과</th>
                  <th className="px-6 py-3">시작일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {campaigns.length > 0 ? campaigns.map(campaign => (
                  <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{campaign.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        campaign.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {campaign.status === 'active' ? '활성' : '대기'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{campaign.performance || '0%'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {campaign.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500 italic">
                      진행 중인 캠페인이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
      active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
    }`}>
      {React.cloneElement(icon, { size: 20 })}
      <span className="text-sm">{label}</span>
    </div>
  );
}

function StatCard({ title, value, change, icon }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
          {change}
        </span>
      </div>
      <h3 className="text-sm text-gray-500 font-medium">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}