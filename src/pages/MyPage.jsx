import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, User, Crown, Copy, Send, LogOut, FileText, Loader2 } from 'lucide-react';
// [중요] 파이어베이스 도구 가져오기 (src/firebase.js 파일이 있어야 합니다)
import { auth, db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const MyPage = () => {
  const navigate = useNavigate();
  const [depositorName, setDepositorName] = useState('');
  
  // [데이터 상태] 실제 데이터를 담을 그릇
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  // [핵심] 화면이 켜지면 데이터베이스에서 내역을 가져옵니다.
  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      
      // 로그인이 안 되어 있으면 로그인 페이지로 보냄
      if (!user) {
        navigate('/login');
        return;
      }

      setUserEmail(user.email); // 이메일 표시용

      try {
        // 1. 내 아이디(uid)로 저장된 보증서만 찾기
        const q = query(
          collection(db, "warranties"),
          where("userId", "==", user.uid)
        );

        // 2. 데이터 가져오기
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // 3. 최신순으로 정렬 (JS로 처리)
        data.sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));

        setHistoryList(data);
      } catch (error) {
        console.error("데이터 불러오기 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const copyAccount = () => {
    // 모바일 호환성 복사 로직
    const textArea = document.createElement("textarea");
    textArea.value = "110-0074-44578";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("Copy");
    textArea.remove();
    alert('계좌번호가 복사되었습니다.');
  };

  const sendApprovalRequest = () => {
    if (!depositorName) return alert('입금자명을 입력해주세요.');
    window.location.href = `sms:01028923334?body=[GLUNEX 승인요청] 입금자명: ${depositorName}`;
  };

  const handleLogout = () => {
    auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full bg-[#F8F9FB] font-noto animate-fade-in">
      {/* 1. 상단 헤더 */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4 pt-8 bg-white sticky top-0 z-20">
        <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-slate-900 transition-colors">
          <ChevronRight size={24} className="rotate-180" />
        </button>
        <h2 className="text-lg font-bold text-slate-900">내 계정 / 관리</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-10">
        
        {/* 2. 프로필 카드 (실제 이메일 표시) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex items-center justify-between">
           <div>
              <div className="flex items-center gap-2 mb-1">
                 <h3 className="text-xl font-black text-slate-900">파트너 사장님</h3>
                 <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">무료 체험 중</span>
              </div>
              <p className="text-slate-400 text-xs font-medium">{userEmail || '로그인 정보 로딩 중...'}</p>
           </div>
           <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 border border-slate-100">
              <User size={24} />
           </div>
        </div>

        {/* 3. 멤버십 플랜 */}
        <div className="mb-8 relative overflow-hidden rounded-2xl shadow-lg bg-slate-900 text-white p-6">
            <div className="relative z-10 space-y-4">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-[#D4AF37] text-[10px] font-black tracking-widest mb-1">MEMBERSHIP</p>
                        <p className="text-lg font-bold">정식 파트너 전환</p>
                    </div>
                    <Crown size={24} className="text-[#D4AF37]" />
                </div>
                <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-400">가입비 (첫 달 무료)</span>
                        <span className="font-bold">100,000원</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-400">월 구독료</span>
                        <span className="font-bold">20,000원</span>
                    </div>
                </div>
            </div>
            <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-[#D4AF37]/20 rounded-full blur-3xl"></div>
        </div>

        {/* 4. [연동 완료] 최근 발행 내역 리스트 */}
        <div className="mb-8">
           <div className="flex items-center gap-2 mb-3 px-1">
             <FileText size={16} className="text-slate-400" />
             <h3 className="text-sm font-bold text-slate-600">최근 보증서 발행 내역</h3>
           </div>
           
           <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[100px]">
             {loading ? (
               <div className="p-8 flex justify-center items-center text-slate-400 gap-2">
                 <Loader2 className="animate-spin" size={20} /> 불러오는 중...
               </div>
             ) : historyList.length > 0 ? (
               <div className="divide-y divide-slate-100">
                 {historyList.map((item) => (
                   <div key={item.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold text-xs">
                          {/* 날짜 파싱 (YYYY-MM-DD 형식 가정) */}
                          {new Date(item.issuedAt).getDate()}일
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {item.customerName} <span className="text-slate-400 font-normal text-xs">| {item.carModel}</span>
                          </p>
                          <p className="text-xs text-slate-500 font-medium">
                            {item.serviceType === 'coating' ? '유리막 코팅' : 
                             item.serviceType === 'tinting' ? '썬팅' : 
                             item.serviceType === 'wash' ? '세차' : '디테일링'}
                          </p>
                        </div>
                     </div>
                     <span className="text-[10px] font-bold text-slate-400">
                        {new Date(item.issuedAt).toLocaleDateString()}
                     </span>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="p-8 text-center">
                 <p className="text-xs text-slate-400 mb-2">발행된 내역이 없습니다.</p>
                 <button onClick={() => navigate('/create')} className="text-xs font-bold text-blue-600 underline">
                   첫 보증서 발행하러 가기
                 </button>
               </div>
             )}
           </div>
        </div>

        {/* 5. 입금 확인 요청 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
               <p className="text-xs text-slate-500 mb-2 font-bold">입금 계좌 안내</p>
               <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-600">
                        <User size={14} />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-900">우체국 110-0074-44578</p>
                        <p className="text-[10px] text-slate-400">예금주: 최경식</p>
                     </div>
                  </div>
                  <button onClick={copyAccount} className="text-blue-600 text-xs font-bold bg-white border border-blue-100 px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
                     복사
                  </button>
               </div>
            </div>

            <div className="space-y-2">
              <input 
                type="text" 
                placeholder="입금자 성함 (예: 홍길동)"
                value={depositorName}
                onChange={(e) => setDepositorName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-blue-500 transition-colors" 
              />
              <button 
                onClick={sendApprovalRequest}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all"
              >
                <Send size={14} /> 입금 확인 요청 문자 보내기
              </button>
            </div>
        </div>

        {/* 6. 로그아웃 버튼 (기능 연결) */}
        <button onClick={handleLogout} className="w-full py-8 text-slate-400 text-xs flex items-center justify-center gap-1 hover:text-red-500 transition-colors">
           <LogOut size={12} /> 로그아웃
        </button>

      </div>
    </div>
  );
};

export default MyPage;