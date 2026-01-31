import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, ChevronLeft, User, Crown, Copy, Send, LogOut, 
  FileText, Loader2, RefreshCw, AlertCircle, X, Lock, 
  Calendar, Headphones, MessageSquare, CreditCard, Zap, ArrowRight, 
  ShieldCheck, Store, Mail, CheckCircle2, Bell, Search
} from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc } from 'firebase/firestore';

const MyPage = ({ userStatus, setUserStatus }) => {
  const navigate = useNavigate();
  
  // --- [1] 상태 관리 (기존 모든 비즈니스 로직 유지) ---
  const [historyList, setHistoryList] = useState([]);
  const [myInquiries, setMyInquiries] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [storeName, setStoreName] = useState('파트너');
  const [expiryInfo, setExpiryInfo] = useState({ date: null, daysLeft: 0 });
  
  // UI/검색 상태
  const [searchKeyword, setSearchKeyword] = useState(""); 
  const [selectedWarranty, setSelectedWarranty] = useState(null);
  const [showCustomerCenter, setShowCustomerCenter] = useState(false); 
  const [csTab, setCsTab] = useState('write'); 
  const [inquiryText, setInquiryText] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // 리스트가 더 많이 보이도록 조정

  // --- [2] 계산 로직 (오류 방지를 위해 렌더링 전 계산) ---

  // 보증서 검색 및 페이징 필터
  const filteredHistory = useMemo(() => {
    return historyList.filter(item => 
      item.customerName.toLowerCase().includes(searchKeyword.toLowerCase())
    );
  }, [historyList, searchKeyword]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const currentHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 본사 답변 알림 점(Red Dot) 로직
  const hasNewReply = useMemo(() => {
    return myInquiries.some(inq => inq.status === 'completed' && inq.userReadStatus !== 'read');
  }, [myInquiries]);

  // 요금제 정보
  const plans = [
    { id: '1m', name: '1개월 베이직', price: 25000, label: '기본', desc: '월 25,000원 / 매장 관리의 시작' },
    { id: '6m', name: '6개월 스타터', price: 125000, label: '추천', desc: '약 17% 할인 / 1개월 무료 효과', isBest: true },
    { id: '12m', name: '12개월 프로', price: 230000, label: '베스트', desc: '약 23% 할인 / 2개월 무료 효과', isPremium: true }
  ];

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // --- [3] 데이터 페칭 (인증 세션 유지 로직) ---
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

        const q = query(collection(db, "warranties"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        data.sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
        setHistoryList(data);

        fetchInquiries(user.uid);
      } catch (error) {
        console.error("데이터 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const fetchInquiries = async (uid) => {
    try {
      const q = query(collection(db, "inquiries"), where("userId", "==", uid));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setMyInquiries(list);
    } catch (e) { console.error(e); }
  };

  // --- [4] 핸들러 함수 ---
  const handleMarkAsRead = async (inqId) => {
    try {
      const docRef = doc(db, "inquiries", inqId);
      await updateDoc(docRef, { userReadStatus: 'read' });
      setMyInquiries(prev => prev.map(inq => inq.id === inqId ? { ...inq, userReadStatus: 'read' } : inq));
      showToast("답변 확인 처리가 완료되었습니다.");
    } catch (e) { console.error(e); }
  };

  const handleInquirySubmit = async () => {
    if(!inquiryText.trim()) return alert("내용을 입력해주세요.");
    const user = auth.currentUser;
    try {
      await addDoc(collection(db, "inquiries"), {
        userId: user.uid,
        storeName: storeName,
        email: userEmail,
        content: inquiryText,
        createdAt: new Date().toISOString(),
        status: 'pending',
        userReadStatus: 'unread',
        reply: ''
      });
      alert("문의가 접수되었습니다.");
      setInquiryText("");
      setCsTab('list');
      fetchInquiries(user.uid);
    } catch (e) { alert("전송 실패"); }
  };

  const handleResendSMS = (item) => {
    if (!item.phone) return alert("번호가 없습니다.");
    const confirmSend = window.confirm(`${item.customerName}님께 보증서를 재전송하시겠습니까?`);
    if (confirmSend) {
      const viewLink = `${window.location.origin}/warranty/view/${item.id}`;
      const message = `[GLUNEX] 안녕하세요, 발행된 정식 시공 보증서입니다.\n${viewLink}`;
      window.location.href = `sms:${item.phone}?body=${encodeURIComponent(message)}`;
    }
  };

  const copyAccount = () => {
    const el = document.createElement('textarea');
    el.value = "110-0074-44578";
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast("계좌번호가 복사되었습니다.");
  };

  const sendApprovalRequest = () => {
    if (!selectedPlan) return alert('요금제를 선택해주세요.');
    const msg = `[Glunex 결제확인요청]\n- 상호: ${storeName}\n- 이메일: ${userEmail}\n- 요금제: ${selectedPlan.name}\n- 금액: ${selectedPlan.price.toLocaleString()}원\n\n입금 완료했습니다. 연장 부탁드립니다.`;
    window.location.href = `sms:01028923334?body=${encodeURIComponent(msg)}`;
    setShowPaymentModal(false);
  };

  const handleLogout = () => {
    auth.signOut();
    navigate('/login');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}`;
  };

  const formatPrice = (price) => Number(String(price).replace(/[^0-9]/g, ''))?.toLocaleString() || '0';

  const isExpired = userStatus === 'approved' && expiryInfo.daysLeft <= 0;

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FB] font-sans animate-fade-in relative text-left select-none overflow-x-hidden w-full">
      
      {/* 글로벌 토스트 */}
      {toastMsg && (
        <div className="fixed top-12 inset-x-0 z-[200] flex justify-center px-4 animate-bounce-in pointer-events-none">
          <div className="bg-slate-900 text-white px-5 py-3.5 rounded-xl text-[12px] font-bold shadow-2xl flex items-center gap-2.5 border border-slate-700 backdrop-blur-md">
            <CheckCircle2 size={16} className="text-blue-400" /> {toastMsg}
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="w-full px-6 py-4 border-b border-slate-100 flex items-center justify-between pt-14 bg-white sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors">
            <ChevronLeft size={24} className="text-slate-400" />
          </button>
          <h2 className="text-[18px] font-black text-slate-900 tracking-tight italic uppercase">GLUNEX <span className="text-blue-600 not-italic">MY</span></h2>
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowCustomerCenter(true)}
            className="flex items-center gap-1.5 text-[12px] font-black text-white bg-blue-600 px-5 py-2.5 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
          >
            <Headphones size={14} strokeWidth={3} /> 고객센터
          </button>
          {hasNewReply && (
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </div>
      </header>

      <div className="flex-1 w-full p-5 space-y-6 scrollbar-hide pb-24">
        
        {/* [수정] 슬림 프로필 카드: 크기 축소 및 레이아웃 최적화 */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between relative group">
           <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                 <h3 className="text-[17px] font-black text-slate-900 tracking-tight break-all">{storeName}</h3>
                 <div className={`px-2 py-0.5 rounded-md font-black text-[9px] uppercase border ${
                    userStatus === 'approved' && !isExpired 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                    {userStatus === 'approved' && !isExpired ? 'Premium' : 'General'}
                 </div>
              </div>
              <p className="text-slate-400 text-[11px] font-medium tracking-tight">{userEmail}</p>
              {userStatus === 'approved' && (
                <p className="text-[10px] text-blue-600 font-bold mt-1 uppercase tracking-tighter">
                  EXP: {expiryInfo.date}
                </p>
              )}
           </div>

           <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 border border-slate-100">
              <Store size={20} />
           </div>
        </section>

        {/* 요금제 섹션 */}
        <section className="space-y-4">
           <div className="flex justify-between items-end px-1">
              <div className="text-left">
                 <h3 className="text-[15px] font-black text-slate-900 tracking-tight">멤버십 이용권 업그레이드</h3>
              </div>
              <Zap size={18} className="text-amber-400 fill-amber-400" />
           </div>

           <div className="grid grid-cols-1 gap-3">
              {plans.map((plan) => (
                <button 
                  key={plan.id}
                  onClick={() => { setSelectedPlan(plan); setShowPaymentModal(true); }}
                  className={`w-full p-5 rounded-xl border-2 transition-all active:scale-[0.99] text-left flex items-center justify-between relative overflow-hidden ${
                    plan.isBest ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-800'
                  }`}
                >
                   <div className="flex flex-col gap-0.5 relative z-10">
                      <div className="flex items-center gap-1.5 mb-1">
                         <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm ${plan.isBest ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            {plan.label}
                         </span>
                         {plan.isPremium && <Crown size={10} className="text-amber-400 fill-amber-400" />}
                      </div>
                      <p className={`text-[15px] font-bold tracking-tight ${plan.isBest ? 'text-white' : 'text-slate-900'}`}>{plan.name}</p>
                      <p className={`text-[10px] font-medium ${plan.isBest ? 'text-slate-400' : 'text-slate-400'}`}>{plan.desc}</p>
                   </div>
                   <div className="text-right relative z-10">
                      <p className={`text-[18px] font-black tracking-tighter ${plan.isBest ? 'text-blue-400' : 'text-slate-900'}`}>
                         ₩{plan.price.toLocaleString()}
                      </p>
                      <div className={`flex items-center justify-end gap-1 mt-0.5 font-bold text-[9px] ${plan.isBest ? 'text-white/20' : 'text-slate-300'}`}>
                         <span>신청</span>
                         <ArrowRight size={10} />
                      </div>
                   </div>
                </button>
              ))}
           </div>
        </section>

        {/* 보증서 발행 내역 (이름 변경, 검색창, 텍스트 확대) */}
        <section className="pt-2">
           <div className="flex flex-col gap-3.5 mb-4 px-1 text-left">
              <div className="flex items-center gap-2">
                 <FileText size={16} className="text-slate-400" />
                 <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-tighter">보증서 발행 내역</h3>
              </div>
              
              <div className="relative group">
                 <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search size={14} className="text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                 </div>
                 <input 
                    type="text" 
                    placeholder="고객 성함 검색" 
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-[13px] font-bold outline-none focus:border-blue-500 shadow-sm"
                    value={searchKeyword}
                    onChange={(e) => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
                 />
              </div>
           </div>

           <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             {loading ? (
               <div className="p-12 text-center text-slate-300 text-[12px] font-bold">데이터를 불러오고 있습니다...</div>
             ) : currentHistory.length > 0 ? (
               <>
                 <div className="divide-y divide-slate-50">
                   {currentHistory.map((item) => (
                     <div key={item.id} onClick={() => setSelectedWarranty(item)} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer">
                       <div className="flex items-center gap-4 text-left">
                          <div className="w-10 h-10 bg-slate-50 rounded flex items-center justify-center text-slate-400 border border-slate-100 shadow-inner"><FileText size={18} /></div>
                          <div>
                             <p className="text-[15px] font-black text-slate-900 leading-tight">
                                {item.customerName} 고객님 
                                <span className="text-slate-900 font-bold ml-2 text-[13px]">| {item.carModel}</span>
                             </p>
                             <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter opacity-70">{formatDate(item.issuedAt)}</p>
                          </div>
                       </div>
                       <ChevronRight size={18} className="text-slate-300" />
                     </div>
                   ))}
                 </div>
                 {totalPages > 1 && (
                   <div className="flex justify-center items-center gap-8 py-4 border-t border-slate-50 bg-slate-50/30">
                     <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm active:scale-90"><ChevronLeft size={16} /></button>
                     <span className="text-[11px] font-black text-slate-400 tracking-widest">{currentPage} / {totalPages}</span>
                     <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm active:scale-90"><ChevronRight size={16} /></button>
                   </div>
                 )}
               </>
             ) : (
               <div className="p-16 text-center text-slate-300 font-bold text-[12px] uppercase">데이터가 없습니다.</div>
             )}
           </div>
        </section>

        <button onClick={handleLogout} className="w-full py-12 text-slate-300 text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-2 hover:text-red-500 transition-all active:scale-95"><LogOut size={12} /> Terminate Session</button>
      </div>

      {/* ================= [모달: 결제 정보] ================= */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in" onClick={() => setShowPaymentModal(false)}>
           <div className="bg-white w-full max-w-[340px] rounded-xl shadow-2xl relative p-7 flex flex-col overflow-hidden animate-scale-in text-left" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <div className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded text-[10px] font-black uppercase mb-1.5 inline-block">Order Sheet</div>
                    <h3 className="text-[20px] font-black text-slate-900 tracking-tight">결제 정보 안내</h3>
                 </div>
                 <button onClick={() => setShowPaymentModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-all"><X size={20}/></button>
              </div>

              <div className="bg-blue-600 rounded-xl p-6 text-white mb-6 shadow-xl relative overflow-hidden">
                 <Zap className="absolute right-[-15px] bottom-[-15px] w-24 h-24 text-white/10 rotate-12" />
                 <p className="text-[10px] font-black text-blue-200 uppercase mb-1 tracking-wider italic">Plan Name</p>
                 <p className="text-[18px] font-black mb-4">{selectedPlan.name}</p>
                 <div className="flex items-baseline gap-1.5">
                    <span className="text-[28px] font-black tracking-tighter">₩{selectedPlan.price.toLocaleString()}</span>
                    <span className="text-[11px] font-bold text-blue-200 opacity-80">VAT 포함</span>
                 </div>
              </div>

              <div className="space-y-2 mb-8">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bank Account</p>
                 <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex items-center justify-between group" onClick={copyAccount}>
                    <div className="text-left">
                       <p className="text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">우체국 (Korea Post)</p>
                       <p className="text-[16px] font-black text-slate-800 tracking-tight leading-tight">110-0074-44578</p>
                       <p className="text-[12px] font-bold text-slate-500 mt-1.5">예금주: 최경식 (글루넥스)</p>
                    </div>
                    <Copy size={18} className="text-slate-300" />
                 </div>
              </div>

              <button 
                onClick={sendApprovalRequest}
                className="w-full py-4.5 bg-slate-900 text-white rounded-xl font-black text-[14px] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"
              >
                 <Send size={16} className="text-blue-400" /> <span>입금 확인 요청 문자 발송</span>
              </button>
           </div>
        </div>
      )}

      {/* ================= [모달: 1:1 고객센터] ================= */}
      {showCustomerCenter && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setShowCustomerCenter(false)}>
            <div className="bg-white w-full max-w-[360px] rounded-2xl shadow-2xl relative flex flex-col h-[75vh] overflow-hidden animate-scale-in text-left" onClick={e => e.stopPropagation()}>
               <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white shrink-0">
                  <div className="flex items-center gap-2.5">
                     <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md"><Headphones size={18} /></div>
                     <h3 className="font-black text-[17px] text-slate-900 tracking-tight">1:1 고객지원</h3>
                  </div>
                  <button onClick={() => setShowCustomerCenter(false)} className="p-2 bg-slate-50 rounded-full text-slate-300 hover:text-slate-900 transition-all active:scale-90"><X size={20}/></button>
               </div>
               <div className="flex border-b border-slate-50 shrink-0">
                  <button onClick={() => setCsTab('write')} className={`flex-1 py-4 text-[12px] font-black uppercase tracking-widest ${csTab==='write'?'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30':'text-slate-400'}`}>Inquiry</button>
                  <button onClick={() => setCsTab('list')} className={`flex-1 py-4 text-[12px] font-black uppercase tracking-widest relative ${csTab==='list'?'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30':'text-slate-400'}`}>
                    History
                    {hasNewReply && <div className="absolute top-3 right-5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 scrollbar-hide text-left">
                  {csTab === 'write' ? (
                      <div className="space-y-5">
                         <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <textarea 
                              className="w-full h-44 p-0 bg-transparent text-[14px] font-bold outline-none resize-none placeholder:text-slate-300 leading-relaxed text-slate-700"
                              placeholder="서비스 이용 중 궁금하신 점을 남겨주세요."
                              value={inquiryText}
                              onChange={(e) => setInquiryText(e.target.value)}
                            ></textarea>
                         </div>
                         <button onClick={handleInquirySubmit} className="w-full py-4.5 bg-blue-600 text-white rounded-xl font-bold active:scale-95 transition-all text-sm shadow-lg">문의 등록</button>
                      </div>
                  ) : (
                      <div className="space-y-4">
                        {myInquiries.length === 0 ? (
                           <div className="text-center py-28 text-slate-300 font-black text-[12px] uppercase">내역이 존재하지 않습니다.</div>
                        ) : (
                           myInquiries.map(inq => (
                              <div key={inq.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm text-left">
                                 <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase ${inq.status === 'completed' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                         {inq.status === 'completed' ? '답변 완료' : '검토 중'}
                                      </span>
                                      {inq.status === 'completed' && inq.userReadStatus !== 'read' && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                                    </div>
                                    <span className="text-[11px] text-slate-300 font-black">{formatDate(inq.createdAt)}</span>
                                 </div>
                                 <p className="text-[14px] font-bold text-slate-700 leading-relaxed">{inq.content}</p>
                                 
                                 {inq.reply && (
                                    <div className="bg-blue-50/80 p-4 rounded-lg mt-4 border-l-[4px] border-blue-600">
                                       <div className="flex items-center gap-1.5 mb-2.5 text-blue-700 font-black text-[11px] uppercase">
                                          <MessageSquare size={12} className="fill-blue-700" /> Glunex Admin Response
                                       </div>
                                       <p className="text-[12px] font-bold text-slate-600 leading-relaxed whitespace-pre-wrap mb-4">{inq.reply}</p>
                                       
                                       {inq.userReadStatus !== 'read' && (
                                         <button 
                                           onClick={() => handleMarkAsRead(inq.id)}
                                           className="w-full py-2.5 bg-white border border-blue-200 text-blue-600 rounded-lg text-[11px] font-black hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                         >
                                           이 답변을 확인했습니다 (알림 끄기)
                                         </button>
                                       )}
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

      {/* ================= [모달: 보증서 상세 - 완벽 한글화] ================= */}
      {selectedWarranty && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/75 backdrop-blur-md animate-fade-in" onClick={() => setSelectedWarranty(null)}>
          <div className="bg-white w-full max-w-[350px] rounded-xl overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh] animate-scale-in" onClick={e => e.stopPropagation()}>
             <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
               <h3 className="font-black text-slate-900 text-[16px] tracking-tight uppercase italic">Certificate <span className="text-blue-600 not-italic">Info</span></h3>
               <button onClick={() => setSelectedWarranty(null)} className="p-1.5 bg-slate-50 rounded-full text-slate-300 hover:text-slate-900 transition-all active:scale-90"><X size={20}/></button>
             </div>
             <div className="p-6 overflow-y-auto scrollbar-hide text-left">
               <div className="bg-slate-900 rounded-xl p-6 text-white mb-6 relative overflow-hidden shadow-2xl">
                  {selectedWarranty.carImageUrl && (
                     <><img src={selectedWarranty.carImageUrl} alt="Car" className="absolute inset-0 w-full h-full object-cover opacity-20" /><div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div></>
                  )}
                  <div className="relative z-10">
                     <div className="flex justify-between items-start mb-6">
                       <div><p className="text-amber-400 text-[9px] font-black tracking-widest mb-1.5 uppercase">Premium Warranty</p><h2 className="text-[22px] font-black tracking-tight">{selectedWarranty.customerName} 고객님</h2></div>
                       <Crown size={24} className="text-amber-400 fill-amber-400" />
                     </div>
                     <div className="space-y-4 text-[13px] border-t border-white/10 pt-6 font-bold">
                        <div className="flex justify-between items-center"><span className="text-slate-400 font-medium uppercase text-[10px]">차량 모델</span><span>{selectedWarranty.carModel} ({selectedWarranty.plateNumber})</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-400 font-medium uppercase text-[10px]">시공 제품</span><span>{selectedWarranty.productName}</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-400 font-medium uppercase text-[10px]">발행 일자</span><span>{formatDate(selectedWarranty.issuedAt)}</span></div>
                     </div>
                  </div>
               </div>
               <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 mb-2">
                  <div className="flex items-center gap-1.5 mb-5 text-blue-900 font-black text-[11px] uppercase tracking-widest"><Lock size={14} strokeWidth={3} /> 관리자 전용 데이터</div>
                  <div className="space-y-4 font-bold">
                     <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <span className="text-slate-400 text-[11px] uppercase">시공 금액</span><span className="font-black text-blue-600 text-[17px]">₩{formatPrice(selectedWarranty.price)}</span>
                     </div>
                     <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <span className="text-slate-400 text-[11px] uppercase">보증 한도액</span><span className="font-black text-slate-800 text-[17px]">₩{formatPrice(selectedWarranty.warrantyPrice)}</span>
                     </div>
                     <div className="flex justify-between items-center px-1 pt-2"><span className="text-slate-400 text-[11px] uppercase font-black italic">관리 주기</span><span className="font-black text-slate-600 text-[13px]">{selectedWarranty.maintPeriod}개월 마다 알림</span></div>
                  </div>
               </div>
             </div>
             <div className="p-6 border-t border-slate-50 bg-white shrink-0">
                <button onClick={() => handleResendSMS(selectedWarranty)} className="w-full py-4.5 bg-slate-900 text-white rounded-xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all text-[14px]"><Send size={16} className="text-blue-400" /> 보증서 재발송 (고객 문자)</button>
             </div>
          </div>
        </div>
      )}

      {/* 스타일 애니메이션 정의 */}
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scale-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        @keyframes bounce-in { 0% { transform: translateY(-15px); opacity: 0; } 60% { transform: translateY(5px); opacity: 1; } 100% { transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
        .animate-scale-in { animation: scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-bounce-in { animation: bounce-in 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default MyPage;