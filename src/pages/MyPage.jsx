import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, User, Crown, Copy, Send, LogOut, FileText, Loader2, RefreshCw, AlertCircle, ToggleLeft, X, Lock, Calendar, Headphones, MessageSquare } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';

const MyPage = ({ userStatus, setUserStatus }) => {
  const navigate = useNavigate();
  const [depositorName, setDepositorName] = useState('');
  
  const [historyList, setHistoryList] = useState([]);
  const [myInquiries, setMyInquiries] = useState([]); // 내 문의 내역
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [storeName, setStoreName] = useState('파트너');
  
  const [expiryInfo, setExpiryInfo] = useState({ date: null, daysLeft: 0 });
  
  // 팝업 상태
  const [selectedWarranty, setSelectedWarranty] = useState(null);
  const [showCustomerCenter, setShowCustomerCenter] = useState(false); // 고객센터 모달
  const [csTab, setCsTab] = useState('write'); // 'write' or 'list'
  const [inquiryText, setInquiryText] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }
      setUserEmail(user.email);

      try {
        // 유저 정보
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setStoreName(userData.storeName || '파트너');
          
          if (userData.membershipExpiry) {
            const expiry = userData.membershipExpiry.toDate();
            const now = new Date();
            const diffTime = expiry - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setExpiryInfo({ date: expiry.toLocaleDateString(), daysLeft: diffDays });
          }
        }

        // 보증서 발행 내역
        const q = query(collection(db, "warranties"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        data.sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
        setHistoryList(data);

        // 내 문의 내역 가져오기
        fetchInquiries(user.uid);

      } catch (error) {
        console.error("데이터 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  // 문의 내역 별도 조회 함수
  const fetchInquiries = async (uid) => {
    try {
      const q = query(collection(db, "inquiries"), where("userId", "==", uid)); // orderBy는 인덱스 필요해서 JS 정렬 사용
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setMyInquiries(list);
    } catch (e) { console.error(e); }
  };

  // 문의하기 제출
  const handleInquirySubmit = async () => {
    if(!inquiryText.trim()) return alert("문의 내용을 입력해주세요.");
    const user = auth.currentUser;
    try {
      await addDoc(collection(db, "inquiries"), {
        userId: user.uid,
        storeName: storeName,
        email: userEmail,
        content: inquiryText,
        createdAt: new Date().toISOString(),
        status: 'pending', // 대기중
        reply: '' // 답변 내용 (초기엔 비어있음)
      });
      alert("문의가 접수되었습니다.");
      setInquiryText("");
      setCsTab('list'); // 리스트 탭으로 이동
      fetchInquiries(user.uid); // 목록 갱신
    } catch (e) {
      console.error(e);
      alert("전송 실패");
    }
  };

  const totalPages = Math.ceil(historyList.length / itemsPerPage);
  const currentHistory = historyList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleResendSMS = (item) => {
    if (!item.phone) return alert("전화번호가 없습니다.");
    const confirmSend = window.confirm(`${item.customerName}님께 재전송하시겠습니까?`);
    if (confirmSend) {
      const viewLink = `${window.location.origin}/warranty/view/${item.id}`;
      const message = `[GLUNEX] 보증서 재발송\n${viewLink}`;
      window.location.href = `sms:${item.phone}?body=${encodeURIComponent(message)}`;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}`;
  };

  const formatPrice = (price) => Number(String(price).replace(/[^0-9]/g, ''))?.toLocaleString() || '0';

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
    const msg = `[GLUNEX 승인요청]\n입금자: ${depositorName}\n상호: ${storeName}\n이메일: ${userEmail}`;
    window.location.href = `sms:01028923334?body=${encodeURIComponent(msg)}`;
  };

  const handleLogout = () => {
    auth.signOut();
    navigate('/login');
  };

  const isExpiring = userStatus === 'approved' && expiryInfo.daysLeft <= 7 && expiryInfo.daysLeft > 0;
  const isExpired = userStatus === 'approved' && expiryInfo.daysLeft <= 0;

  return (
    <div className="flex flex-col h-full bg-[#F8F9FB] font-noto animate-fade-in relative">
      {/* 1. 상단 헤더 */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between pt-8 bg-white sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-slate-900 transition-colors">
            <ChevronRight size={24} className="rotate-180" />
          </button>
          <h2 className="text-lg font-bold text-slate-900">내 계정 / 관리</h2>
        </div>
        {/* [수정] 등급전환 버튼 제거 -> 고객센터 버튼 추가 */}
        <button 
          onClick={() => setShowCustomerCenter(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors"
        >
          <Headphones size={14} />
          고객센터
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-10">
        
        {/* 프로필 카드 */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex items-center justify-between">
           <div>
              <div className="flex items-center gap-2 mb-1">
                 <h3 className="text-xl font-black text-slate-900">{storeName} 사장님</h3>
                 {userStatus === 'approved' && !isExpired ? (
                   <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Crown size={10} /> 프리미엄 (D-{expiryInfo.daysLeft})</span>
                 ) : (
                   <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{isExpired ? '기간 만료' : '무료 체험'}</span>
                 )}
              </div>
              <p className="text-slate-400 text-xs font-medium">{userEmail}</p>
              {userStatus === 'approved' && <p className="text-[10px] text-slate-400 mt-1">만료일: {expiryInfo.date}</p>}
           </div>
           <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 border border-slate-100"><User size={24} /></div>
        </div>

        {/* 유료 전환 안내 (무료/만료/임박 시) */}
        {(userStatus !== 'approved' || isExpiring || isExpired) && (
          <div className={`mb-8 bg-white p-5 rounded-2xl border shadow-sm space-y-4 ${isExpiring || isExpired ? 'border-red-200 ring-4 ring-red-50' : 'border-slate-200'}`}>
              {(isExpiring || isExpired) && (
                <div className="flex items-center gap-2 text-red-500 mb-2 pb-2 border-b border-red-100">
                  <AlertCircle size={16} /><span className="text-xs font-bold">{isExpired ? "멤버십이 만료되었습니다." : `종료 ${expiryInfo.daysLeft}일 전입니다!`}</span>
                </div>
              )}
              {!isExpiring && !isExpired && userStatus !== 'approved' && (
                 <div className="bg-slate-900 text-white p-4 rounded-xl mb-3"><p className="text-sm font-bold text-center">정식 파트너 전환 안내</p></div>
              )}
              <div>
                 <p className="text-xs text-slate-500 mb-2 font-bold">입금 계좌 안내</p>
                 <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-900">우체국 110-0074-44578 (최경식)</span>
                    <button onClick={copyAccount} className="text-blue-600 text-xs font-bold bg-white border border-blue-100 px-3 py-1.5 rounded-lg active:scale-95">복사</button>
                 </div>
              </div>
              <div className="space-y-2">
                <input type="text" placeholder="입금자 성함" value={depositorName} onChange={(e) => setDepositorName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-blue-500" />
                <button onClick={sendApprovalRequest} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95"><Send size={14} /> 입금 확인 요청 문자</button>
              </div>
          </div>
        )}

        {/* 발행 내역 리스트 */}
        <div className="mb-6">
           <div className="flex items-center gap-2 mb-3 px-1"><FileText size={16} className="text-slate-400" /><h3 className="text-sm font-bold text-slate-600">최근 보증서 발행 내역</h3></div>
           <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[100px]">
             {loading ? (
               <div className="p-8 flex justify-center items-center text-slate-400 gap-2"><Loader2 className="animate-spin" size={20} /> 로딩중...</div>
             ) : historyList.length > 0 ? (
               <>
                 <div className="divide-y divide-slate-100">
                   {currentHistory.map((item) => (
                     <div key={item.id} onClick={() => setSelectedWarranty(item)} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold text-xs"><FileText size={18} /></div>
                          <div><p className="text-sm font-bold text-slate-900">{item.customerName} <span className="text-slate-400 font-normal text-xs">| {item.carModel}</span></p><p className="text-[11px] text-slate-500 mt-0.5">{formatDate(item.issuedAt)}</p></div>
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
               <div className="p-8 text-center"><p className="text-xs text-slate-400">발행 내역이 없습니다.</p></div>
             )}
           </div>
        </div>

        <button onClick={handleLogout} className="w-full py-8 text-slate-400 text-xs flex items-center justify-center gap-1 hover:text-red-500 transition-colors"><LogOut size={12} /> 로그아웃</button>
      </div>

      {/* [신규] 고객센터 모달 (1:1 문의) */}
      {showCustomerCenter && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowCustomerCenter(false)}>
            <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl relative flex flex-col h-[70vh]" onClick={e => e.stopPropagation()}>
               <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
                  <div className="flex items-center gap-2">
                     <Headphones size={20} className="text-blue-600" />
                     <h3 className="font-bold text-lg text-slate-900">1:1 고객센터</h3>
                  </div>
                  <button onClick={() => setShowCustomerCenter(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900"><X size={20}/></button>
               </div>
               
               {/* 탭 버튼 */}
               <div className="flex border-b border-slate-100">
                  <button onClick={() => setCsTab('write')} className={`flex-1 py-3 text-sm font-bold ${csTab==='write'?'text-blue-600 border-b-2 border-blue-600':'text-slate-400'}`}>문의 작성</button>
                  <button onClick={() => setCsTab('list')} className={`flex-1 py-3 text-sm font-bold ${csTab==='list'?'text-blue-600 border-b-2 border-blue-600':'text-slate-400'}`}>내 문의 내역</button>
               </div>

               <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                  {csTab === 'write' ? (
                     <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                           <p className="text-xs text-slate-500 mb-2">문의 내용</p>
                           <textarea 
                             className="w-full h-40 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm outline-none resize-none focus:border-blue-500"
                             placeholder="궁금한 점이나 요청사항을 남겨주세요."
                             value={inquiryText}
                             onChange={(e) => setInquiryText(e.target.value)}
                           ></textarea>
                        </div>
                        <button onClick={handleInquirySubmit} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all">문의 등록하기</button>
                     </div>
                  ) : (
                     <div className="space-y-3">
                        {myInquiries.length === 0 ? (
                           <div className="text-center py-20 text-slate-400 text-xs">작성한 문의 내역이 없습니다.</div>
                        ) : (
                           myInquiries.map(inq => (
                              <div key={inq.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                 <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${inq.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                       {inq.status === 'completed' ? '답변완료' : '접수완료'}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{formatDate(inq.createdAt)}</span>
                                 </div>
                                 <p className="text-sm text-slate-800 mb-2">{inq.content}</p>
                                 
                                 {/* 관리자 답변이 있으면 표시 */}
                                 {inq.reply && (
                                    <div className="bg-slate-50 p-3 rounded-lg mt-3 border-t-2 border-green-500">
                                       <div className="flex items-center gap-1 mb-1 text-green-600 font-bold text-xs">
                                          <MessageSquare size={12} /> 관리자 답변
                                       </div>
                                       <p className="text-xs text-slate-600 leading-relaxed">{inq.reply}</p>
                                    </div>
                                 )}
                              </div>
                           ))
                        )}
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}

      {/* 보증서 상세 팝업 (기존 유지) */}
      {selectedWarranty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedWarranty(null)}>
          <div className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
             {/* ... 상세 팝업 내용 ... */}
             <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
               <h3 className="font-bold text-slate-900 text-lg">발행 상세 정보</h3>
               <button onClick={() => setSelectedWarranty(null)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900"><X size={20}/></button>
             </div>
             <div className="p-6 overflow-y-auto">
               <div className="bg-slate-900 rounded-3xl p-6 text-white mb-6 relative overflow-hidden shadow-lg">
                  {selectedWarranty.carImageUrl && (
                     <>
                       <img src={selectedWarranty.carImageUrl} alt="Car" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                       <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
                     </>
                  )}
                  <div className="relative z-10">
                     <div className="flex justify-between items-start mb-4">
                       <div><p className="text-amber-400 text-[10px] font-black tracking-widest mb-1">GLUNEX WARRANTY</p><h2 className="text-2xl font-bold">{selectedWarranty.customerName}님</h2></div>
                       <Crown size={24} className="text-amber-400" />
                     </div>
                     <div className="space-y-3 text-sm border-t border-white/10 pt-4">
                        <div className="flex justify-between"><span className="text-slate-300">차량정보</span><span className="font-medium">{selectedWarranty.carModel} ({selectedWarranty.plateNumber})</span></div>
                        <div className="flex justify-between"><span className="text-slate-300">시공내역</span><span className="font-medium">{selectedWarranty.productName}</span></div>
                        <div className="flex justify-between"><span className="text-slate-300">발행일자</span><span className="font-medium">{formatDate(selectedWarranty.issuedAt)}</span></div>
                     </div>
                  </div>
               </div>
               <div className="bg-blue-50 rounded-3xl p-5 border border-blue-100 mb-2">
                  <div className="flex items-center gap-2 mb-4 text-blue-800 font-black text-xs uppercase tracking-wider"><Lock size={14} /> 관리자 전용 정보</div>
                  <div className="space-y-4 text-sm">
                     <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-blue-100">
                        <span className="text-slate-500 font-bold text-xs">실 시공 금액</span><span className="font-black text-blue-600 text-base">{formatPrice(selectedWarranty.price)}원</span>
                     </div>
                     <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-blue-100">
                        <span className="text-slate-500 font-bold text-xs">보증 금액</span><span className="font-black text-slate-800 text-base">{formatPrice(selectedWarranty.warrantyPrice)}원</span>
                     </div>
                      <div className="flex justify-between items-center px-2"><span className="text-slate-500 text-xs">마케팅 관리 주기</span><span className="font-bold text-slate-900">{selectedWarranty.maintPeriod}개월 마다 알림</span></div>
                  </div>
               </div>
             </div>
             <div className="p-5 border-t border-slate-100 bg-white">
                <button onClick={() => handleResendSMS(selectedWarranty)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><Send size={18} /> 고객에게 보증서 문자 재전송</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPage;