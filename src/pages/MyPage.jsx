import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, User, Crown, Copy, Send, LogOut, FileText, Loader2, RefreshCw, AlertCircle, ToggleLeft, X, Lock, Car, Calendar, CreditCard } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const MyPage = ({ userStatus, setUserStatus }) => {
  const navigate = useNavigate();
  const [depositorName, setDepositorName] = useState('');
  
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [storeName, setStoreName] = useState('파트너');
  
  // [신규] 상세 보기 팝업을 위한 상태
  const [selectedWarranty, setSelectedWarranty] = useState(null);

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 5); 
  const daysLeft = Math.ceil((expirationDate - new Date()) / (1000 * 60 * 60 * 24));
  const isExpiring = daysLeft <= 7 && daysLeft > 0;

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }
      setUserEmail(user.email);

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setStoreName(userDocSnap.data().storeName || '파트너');
        }

        const q = query(collection(db, "warranties"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
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

  const totalPages = Math.ceil(historyList.length / itemsPerPage);
  const currentHistory = historyList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleUserStatus = () => {
    const newStatus = userStatus === 'free' ? 'approved' : 'free';
    setUserStatus(newStatus);
    alert(`[테스트 모드] ${newStatus === 'approved' ? '프리미엄' : '무료'} 회원 상태로 변경되었습니다.`);
  };

  const handleResendSMS = (item) => {
    if (!item.phone) return alert("고객 전화번호 정보가 없습니다.");
    
    // 서비스 타입 한글 변환
    const serviceName = {
      'coating': '유리막 코팅',
      'tinting': '썬팅',
      'detailing': '디테일링',
      'wash': '프리미엄 세차',
      'etc': '기타 시공'
    }[item.serviceType] || item.serviceType;

    // 날짜 포맷팅
    const dateObj = new Date(item.issuedAt);
    const dateStr = `${dateObj.getFullYear()}.${String(dateObj.getMonth()+1).padStart(2,'0')}.${String(dateObj.getDate()).padStart(2,'0')}`;

    // 고객 전용 뷰어 링크
    const viewLink = `${window.location.origin}/warranty/view/${item.id}`;

    const confirmSend = window.confirm(`${item.customerName} 고객님께 보증서 링크를 재전송하시겠습니까?`);
    if (confirmSend) {
      const message = `[GLUNEX] ${item.customerName}님, 요청하신 보증서를 재발송해 드립니다.\n\n차종: ${item.carModel}\n시공: ${serviceName}\n발행일: ${dateStr}\n\n전자보증서 확인하기:\n${viewLink}`;
      window.location.href = `sms:${item.phone}?body=${encodeURIComponent(message)}`;
    }
  };

  // 날짜 예쁘게 보여주는 함수 (YYYY년 MM월 DD일)
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  // 금액 콤마 함수
  const formatPrice = (price) => {
    return Number(String(price).replace(/[^0-9]/g, ''))?.toLocaleString() || '0';
  };

  const copyAccount = () => {
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
    <div className="flex flex-col h-full bg-[#F8F9FB] font-noto animate-fade-in relative">
      {/* 상단 헤더 */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between pt-8 bg-white sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-slate-900 transition-colors">
            <ChevronRight size={24} className="rotate-180" />
          </button>
          <h2 className="text-lg font-bold text-slate-900">내 계정 / 관리</h2>
        </div>
        <button 
          onClick={toggleUserStatus}
          className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
        >
          <ToggleLeft size={14} />
          {userStatus === 'free' ? '무료체험 중' : '프리미엄'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-10">
        
        {/* 프로필 카드 */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex items-center justify-between">
           <div>
              <div className="flex items-center gap-2 mb-1">
                 <h3 className="text-xl font-black text-slate-900">{storeName} 사장님</h3>
                 {userStatus === 'approved' ? (
                   <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                     <Crown size={10} /> 프리미엄 회원
                   </span>
                 ) : (
                   <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                     무료 체험 중
                   </span>
                 )}
              </div>
              <p className="text-slate-400 text-xs font-medium">{userEmail}</p>
           </div>
           <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 border border-slate-100">
              <User size={24} />
           </div>
        </div>

        {/* 안내 박스들 (생략 - 기존과 동일) */}
        {userStatus !== 'approved' && (
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
        )}

        {(userStatus !== 'approved' || (userStatus === 'approved' && isExpiring)) && (
          <div className={`bg-white p-5 rounded-2xl border shadow-sm space-y-4 mb-8 ${isExpiring ? 'border-red-200 ring-4 ring-red-50' : 'border-slate-200'}`}>
              {isExpiring && userStatus === 'approved' && (
                <div className="flex items-center gap-2 text-red-500 mb-2 pb-2 border-b border-red-100">
                  <AlertCircle size={16} />
                  <span className="text-xs font-bold">프리미엄 종료 {daysLeft}일 전입니다!</span>
                </div>
              )}
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
              <input type="text" placeholder="입금자 성함 (예: 홍길동)" value={depositorName} onChange={(e) => setDepositorName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-blue-500 transition-colors" />
              <button onClick={sendApprovalRequest} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all">
                <Send size={14} /> 입금 확인 요청 문자 보내기
              </button>
            </div>
        </div>
        )}

        {/* 4. 최근 보증서 발행 내역 (수정됨) */}
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
               <>
                 <div className="divide-y divide-slate-100">
                   {currentHistory.map((item) => (
                     <div 
                        key={item.id} 
                        onClick={() => setSelectedWarranty(item)} // [중요] 클릭 시 상세 팝업 오픈
                        className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer"
                     >
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold text-xs">
                             <FileText size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {item.customerName} <span className="text-slate-400 font-normal text-xs">| {item.carModel}</span>
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                               {/* [수정] 날짜 전체 표기 */}
                               {formatDate(item.issuedAt)}
                            </p>
                          </div>
                       </div>
                       <ChevronRight size={16} className="text-slate-300" />
                     </div>
                   ))}
                 </div>
                 
                 {totalPages > 1 && (
                   <div className="flex justify-center items-center gap-4 py-4 border-t border-slate-50">
                     <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={18} /></button>
                     <span className="text-xs font-bold text-slate-500">{currentPage} / {totalPages}</span>
                     <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={18} /></button>
                   </div>
                 )}
               </>
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

        <button onClick={handleLogout} className="w-full py-8 text-slate-400 text-xs flex items-center justify-center gap-1 hover:text-red-500 transition-colors">
           <LogOut size={12} /> 로그아웃
        </button>
      </div>

      {/* [신규] 상세 보기 모달 (팝업) */}
      {selectedWarranty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedWarranty(null)}>
          <div className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
             {/* 모달 헤더 */}
             <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
               <h3 className="font-bold text-slate-900 text-lg">발행 상세 정보</h3>
               <button onClick={() => setSelectedWarranty(null)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900"><X size={20}/></button>
             </div>
             
             <div className="p-6 overflow-y-auto">
               {/* 1. 보증서 요약 카드 */}
               <div className="bg-slate-900 rounded-3xl p-6 text-white mb-6 relative overflow-hidden shadow-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-amber-400 text-[10px] font-black tracking-widest mb-1">GLUNEX WARRANTY</p>
                      <h2 className="text-2xl font-bold">{selectedWarranty.customerName}님</h2>
                    </div>
                    <Crown size={24} className="text-amber-400" />
                  </div>
                  
                  <div className="space-y-3 text-sm border-t border-white/10 pt-4">
                     <div className="flex justify-between"><span className="text-slate-400">차량정보</span><span className="font-medium">{selectedWarranty.carModel} ({selectedWarranty.plateNumber})</span></div>
                     <div className="flex justify-between"><span className="text-slate-400">시공내역</span><span className="font-medium">
                        {selectedWarranty.serviceType === 'coating' ? '유리막 코팅' : selectedWarranty.serviceType === 'wash' ? '세차' : selectedWarranty.serviceType}
                     </span></div>
                     <div className="flex justify-between"><span className="text-slate-400">발행일자</span><span className="font-medium">{formatDate(selectedWarranty.issuedAt)}</span></div>
                  </div>
               </div>

               {/* 2. 관리자 전용 정보 (매출/주기) */}
               <div className="bg-blue-50 rounded-3xl p-5 border border-blue-100 mb-2">
                  <div className="flex items-center gap-2 mb-4 text-blue-800 font-black text-xs uppercase tracking-wider">
                     <Lock size={14} /> 관리자 전용 정보 (고객 비공개)
                  </div>
                  <div className="space-y-4 text-sm">
                     <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-blue-100">
                        <span className="text-slate-500 font-bold text-xs">실 시공 금액 (매출)</span>
                        <span className="font-black text-blue-600 text-base">{formatPrice(selectedWarranty.price)}원</span>
                     </div>
                     <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-blue-100">
                        <span className="text-slate-500 font-bold text-xs">보증 금액 (고객용)</span>
                        <span className="font-black text-slate-800 text-base">{formatPrice(selectedWarranty.warrantyPrice)}원</span>
                     </div>
                      <div className="flex justify-between items-center px-2">
                        <span className="text-slate-500 text-xs">마케팅 관리 주기</span>
                        <span className="font-bold text-slate-900">{selectedWarranty.maintPeriod}개월 마다 알림</span>
                     </div>
                  </div>
               </div>
             </div>

             {/* 하단 액션 버튼 */}
             <div className="p-5 border-t border-slate-100 bg-white">
                <button 
                  onClick={() => handleResendSMS(selectedWarranty)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                >
                  <Send size={18} /> 고객에게 보증서 문자 재전송
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPage;