import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, ChevronLeft, User, Crown, Copy, Send, LogOut, 
  FileText, Loader2, RefreshCw, AlertCircle, ToggleLeft, X, Lock, 
  Calendar, Headphones, MessageSquare, CreditCard, Zap, ArrowRight, 
  ShieldCheck, Store, Mail, CheckCircle2 
} from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';

const MyPage = ({ userStatus, setUserStatus }) => {
  const navigate = useNavigate();
  const [depositorName, setDepositorName] = useState('');
  
  const [historyList, setHistoryList] = useState([]);
  const [myInquiries, setMyInquiries] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [storeName, setStoreName] = useState('파트너');
  
  const [expiryInfo, setExpiryInfo] = useState({ date: null, daysLeft: 0 });
  
  // 팝업 상태
  const [selectedWarranty, setSelectedWarranty] = useState(null);
  const [showCustomerCenter, setShowCustomerCenter] = useState(false); 
  const [csTab, setCsTab] = useState('write'); 
  const [inquiryText, setInquiryText] = useState("");

  // [신규] 결제 모달 및 요금제 상태
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // 요금제 데이터
  const plans = [
    { id: '1m', name: '1개월 베이직', price: 25000, label: 'Standard', desc: '월 2.5만원 / 효율적인 관리' },
    { id: '6m', name: '6개월 스타터', price: 125000, label: 'Recommended', desc: '1개월 무료 혜택 적용', isBest: true },
    { id: '12m', name: '12개월 프로', price: 230000, label: 'Best Value', desc: '2개월 무료 혜택 적용', isPremium: true }
  ];

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
        status: 'pending',
        reply: ''
      });
      alert("문의가 접수되었습니다.");
      setInquiryText("");
      setCsTab('list');
      fetchInquiries(user.uid);
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
    const el = document.createElement('textarea');
    el.value = "110-0074-44578";
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    alert('계좌번호가 복사되었습니다.');
  };

  // [수정] SMS 승인 요청 로직 고도화
  const sendApprovalRequest = () => {
    if (!selectedPlan) return alert('요금제를 먼저 선택해주세요.');
    const msg = `[Glunex 결제확인요청]\n\n- 상호: ${storeName}\n- 이메일: ${userEmail}\n- 선택요금제: ${selectedPlan.name}\n- 금액: ${selectedPlan.price.toLocaleString()}원\n\n입금 완료하였습니다. 확인 부탁드립니다.`;
    window.location.href = `sms:01028923334?body=${encodeURIComponent(msg)}`;
    setShowPaymentModal(false);
  };

  const handleLogout = () => {
    auth.signOut();
    navigate('/login');
  };

  const isExpiring = userStatus === 'approved' && expiryInfo.daysLeft <= 7 && expiryInfo.daysLeft > 0;
  const isExpired = userStatus === 'approved' && expiryInfo.daysLeft <= 0;

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#F8F9FB] font-noto animate-fade-in relative text-left select-none max-w-md mx-auto shadow-2xl overflow-hidden">
      
      {/* 1. 상단 헤더 */}
      <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between pt-10 bg-white sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-1 hover:bg-slate-50 rounded-full transition-colors">
            <ChevronLeft size={24} className="text-slate-400" />
          </button>
          <h2 className="text-lg font-black text-slate-900 tracking-tight italic">GLUNEX <span className="text-blue-600">MY</span></h2>
        </div>
        <button 
          onClick={() => setShowCustomerCenter(true)}
          className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors"
        >
          <Headphones size={14} /> 고객센터
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
        
        {/* 프로필 카드 */}
        <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 flex items-center justify-between relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 opacity-50 transition-transform group-hover:scale-110" />
           <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                 <h3 className="text-xl font-black text-slate-900 tracking-tight">{storeName}</h3>
                 {userStatus === 'approved' && !isExpired ? (
                   <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm border border-amber-200">
                      <Crown size={10} className="fill-amber-700" /> PREMIUM
                   </span>
                 ) : (
                   <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full border border-slate-200">FREE EXPERIENCE</span>
                 )}
              </div>
              <p className="text-slate-400 text-[11px] font-bold tracking-tight">{userEmail}</p>
              {userStatus === 'approved' && <p className="text-[10px] text-blue-600 font-bold mt-2 uppercase tracking-widest">Expires: {expiryInfo.date}</p>}
           </div>
           <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200 relative z-10">
              <Store size={28} />
           </div>
        </section>

        {/* 요금제 선택 섹션 (홍철님 요청: 결제를 부르는 디자인) */}
        <section className="space-y-4">
           <div className="flex justify-between items-end px-1">
              <div className="text-left">
                 <h3 className="text-lg font-black text-slate-900 tracking-tight">서비스 플랜 선택</h3>
                 <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Subscription Upgrade</p>
              </div>
              <Zap size={20} className="text-amber-400 fill-amber-400 animate-pulse" />
           </div>

           <div className="space-y-3">
              {plans.map((plan) => (
                <button 
                  key={plan.id}
                  onClick={() => { setSelectedPlan(plan); setShowPaymentModal(true); }}
                  className={`w-full p-6 rounded-[2.5rem] border-2 transition-all active:scale-[0.98] text-left flex items-center justify-between relative overflow-hidden ${
                    plan.isBest ? 'bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-300' : 'bg-white border-slate-100 text-slate-800'
                  }`}
                >
                   {plan.isPremium && <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full -mr-12 -mt-12" />}
                   <div className="flex flex-col gap-1 relative z-10">
                      <div className="flex items-center gap-2">
                         <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${plan.isBest ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            {plan.label}
                         </span>
                         {plan.isPremium && <Crown size={12} className="text-amber-400 fill-amber-400" />}
                      </div>
                      <p className={`text-lg font-black tracking-tight ${plan.isBest ? 'text-white' : 'text-slate-900'}`}>{plan.name}</p>
                      <p className={`text-[11px] font-bold ${plan.isBest ? 'text-slate-400' : 'text-slate-400'}`}>{plan.desc}</p>
                   </div>
                   <div className="text-right relative z-10">
                      <p className={`text-xl font-black tracking-tighter ${plan.isBest ? 'text-blue-400' : 'text-slate-900'}`}>
                         ₩{plan.price.toLocaleString()}
                      </p>
                      <div className={`flex items-center justify-end gap-1 mt-1 font-black text-[10px] ${plan.isBest ? 'text-white/30' : 'text-slate-300'}`}>
                         <span>선택하기</span>
                         <ArrowRight size={10} />
                      </div>
                   </div>
                </button>
              ))}
           </div>
        </section>

        {/* 발행 내역 리스트 (기존 유지) */}
        <section className="mb-6">
           <div className="flex items-center gap-2 mb-4 px-1 text-left">
              <FileText size={16} className="text-slate-400" />
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Recent Warranty Logs</h3>
           </div>
           <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[100px]">
             {loading ? (
               <div className="p-12 flex justify-center items-center text-slate-400 gap-3 text-xs font-bold"><Loader2 className="animate-spin text-blue-600" size={20} /> 실적을 확인 중입니다...</div>
             ) : historyList.length > 0 ? (
               <>
                 <div className="divide-y divide-slate-50">
                   {currentHistory.map((item) => (
                     <div key={item.id} onClick={() => setSelectedWarranty(item)} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner"><FileText size={18} /></div>
                          <div className="text-left"><p className="text-sm font-black text-slate-900">{item.customerName} <span className="text-slate-300 font-bold text-[10px] ml-1">| {item.carModel}</span></p><p className="text-[10px] text-slate-400 font-bold mt-1 tracking-wider uppercase">{formatDate(item.issuedAt)}</p></div>
                       </div>
                       <ChevronRight size={16} className="text-slate-200" />
                     </div>
                   ))}
                 </div>
                 {totalPages > 1 && (
                   <div className="flex justify-center items-center gap-6 py-4 border-t border-slate-50 bg-slate-50/30">
                     <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-xl bg-white border border-slate-200 disabled:opacity-30 active:scale-90 transition-all"><ChevronLeft size={16} /></button>
                     <span className="text-[11px] font-black text-slate-400 tracking-widest">{currentPage} / {totalPages}</span>
                     <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-xl bg-white border border-slate-200 disabled:opacity-30 active:scale-90 transition-all"><ChevronRight size={16} /></button>
                   </div>
                 )}
               </>
             ) : (
               <div className="p-16 text-center"><p className="text-xs text-slate-400 font-bold">발행된 보증서가 없습니다.</p></div>
             )}
           </div>
        </section>

        <button onClick={handleLogout} className="w-full py-8 text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-2 hover:text-red-500 transition-colors"><LogOut size={12} /> Logout Session</button>
      </div>

      {/* ================= [결제 상세 모달] ================= */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in" onClick={() => setShowPaymentModal(false)}>
           <div className="bg-white w-full max-w-[340px] rounded-[3rem] shadow-2xl relative p-8 flex flex-col overflow-hidden animate-scale-in text-left" onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-60 z-0" />
              <div className="flex justify-between items-start mb-8 relative z-10">
                 <div>
                    <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 inline-block">Payment Guide</div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-tight">결제 정보 안내</h3>
                 </div>
                 <button onClick={() => setShowPaymentModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-300 hover:text-slate-900 active:scale-90 transition-all"><X size={20}/></button>
              </div>

              <div className="bg-blue-600 rounded-[2.5rem] p-6 text-white mb-6 shadow-xl shadow-blue-100 relative overflow-hidden">
                 <Zap className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-white/10 rotate-12" />
                 <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Your Selection</p>
                 <p className="text-xl font-black mb-4">{selectedPlan.name}</p>
                 <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black tracking-tighter">₩{selectedPlan.price.toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-blue-200 ml-1">VAT 포함</span>
                 </div>
              </div>

              <div className="space-y-2 mb-8 relative z-10">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deposit Account</p>
                 <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 flex items-center justify-between group">
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 mb-0.5 uppercase tracking-tighter">Korea Post (우체국)</p>
                       <p className="text-base font-black text-slate-800 tracking-tight">110-0074-44578</p>
                       <p className="text-[11px] font-bold text-slate-500 mt-1">예금주: 최경식 (글루넥스)</p>
                    </div>
                    <button 
                      onClick={copyAccount}
                      className="p-3 bg-white rounded-2xl text-slate-400 hover:text-blue-600 active:scale-90 transition-all border border-slate-100 shadow-sm"
                    >
                       <Copy size={18} />
                    </button>
                 </div>
              </div>

              <button 
                 onClick={sendApprovalRequest}
                 className="w-full py-4.5 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all shadow-slate-900/30"
              >
                 <Send size={16} className="text-blue-400" />
                 <span>결제 완료 확인 요청</span>
              </button>
              <p className="text-center text-[9px] text-slate-400 font-bold mt-4 uppercase tracking-widest">자동 승인 시스템 연동 중</p>
           </div>
        </div>
      )}

      {/* 고객센터 모달 (기존 유지) */}
      {showCustomerCenter && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in" onClick={() => setShowCustomerCenter(false)}>
            <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl relative flex flex-col h-[70vh] overflow-hidden" onClick={e => e.stopPropagation()}>
               <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white">
                  <div className="flex items-center gap-2">
                     <Headphones size={20} className="text-blue-600" />
                     <h3 className="font-black text-lg text-slate-900 tracking-tight">1:1 고객지원</h3>
                  </div>
                  <button onClick={() => setShowCustomerCenter(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-all active:scale-90"><X size={20}/></button>
               </div>
               <div className="flex border-b border-slate-50">
                  <button onClick={() => setCsTab('write')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest ${csTab==='write'?'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30':'text-slate-400'}`}>Message</button>
                  <button onClick={() => setCsTab('list')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest ${csTab==='list'?'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30':'text-slate-400'}`}>Inquiry History</button>
               </div>
               <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                  {csTab === 'write' ? (
                      <div className="space-y-4">
                         <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-inner">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Your Inquiry</p>
                            <textarea 
                              className="w-full h-44 p-1 bg-transparent text-sm font-bold outline-none resize-none placeholder:text-slate-300"
                              placeholder="서비스 이용 중 궁금한 점이나 불편한 사항을 상세히 남겨주세요."
                              value={inquiryText}
                              onChange={(e) => setInquiryText(e.target.value)}
                            ></textarea>
                         </div>
                         <button onClick={handleInquirySubmit} className="w-full py-4.5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-all text-sm">문의 접수하기</button>
                      </div>
                  ) : (
                      <div className="space-y-3">
                        {myInquiries.length === 0 ? (
                           <div className="text-center py-24 text-slate-300 font-bold text-xs">문의 내역이 없습니다.</div>
                        ) : (
                           myInquiries.map(inq => (
                              <div key={inq.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                                 <div className="flex justify-between items-start mb-3">
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${inq.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                       {inq.status === 'completed' ? 'Resolved' : 'Pending'}
                                    </span>
                                    <span className="text-[9px] text-slate-300 font-bold">{formatDate(inq.createdAt)}</span>
                                 </div>
                                 <p className="text-sm font-bold text-slate-700 leading-relaxed mb-1">{inq.content}</p>
                                 {inq.reply && (
                                    <div className="bg-blue-50/80 p-4 rounded-2xl mt-4 border border-blue-100 relative">
                                       <div className="flex items-center gap-1.5 mb-2 text-blue-700 font-black text-[10px] uppercase">
                                          <MessageSquare size={12} className="fill-blue-700" /> Admin Response
                                       </div>
                                       <p className="text-[12px] font-bold text-slate-600 leading-relaxed">{inq.reply}</p>
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

      {/* 보증서 상세 (기존 유지) */}
      {selectedWarranty && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setSelectedWarranty(null)}>
          <div className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh] animate-scale-in" onClick={e => e.stopPropagation()}>
             <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
               <h3 className="font-black text-slate-900 text-lg tracking-tight uppercase italic">Warranty <span className="text-blue-600">Details</span></h3>
               <button onClick={() => setSelectedWarranty(null)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 active:scale-90"><X size={20}/></button>
             </div>
             <div className="p-6 overflow-y-auto scrollbar-hide">
               <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white mb-6 relative overflow-hidden shadow-2xl">
                  {selectedWarranty.carImageUrl && (
                     <>
                       <img src={selectedWarranty.carImageUrl} alt="Car" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                       <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
                     </>
                  )}
                  <div className="relative z-10">
                     <div className="flex justify-between items-start mb-6">
                       <div><p className="text-amber-400 text-[9px] font-black tracking-[0.2em] mb-1">OFFICIAL CERTIFICATE</p><h2 className="text-2xl font-black tracking-tight">{selectedWarranty.customerName} 고객님</h2></div>
                       <Crown size={24} className="text-amber-400 fill-amber-400" />
                     </div>
                     <div className="space-y-4 text-[13px] border-t border-white/10 pt-6">
                        <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase text-[10px]">Model</span><span className="font-black">{selectedWarranty.carModel} ({selectedWarranty.plateNumber})</span></div>
                        <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase text-[10px]">Product</span><span className="font-black">{selectedWarranty.productName}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase text-[10px]">Issue Date</span><span className="font-black">{formatDate(selectedWarranty.issuedAt)}</span></div>
                     </div>
                  </div>
               </div>
               <div className="bg-slate-50 rounded-[2.5rem] p-6 border border-slate-100 mb-2 shadow-inner">
                  <div className="flex items-center gap-2 mb-4 text-blue-900 font-black text-[10px] uppercase tracking-widest"><Lock size={14} strokeWidth={3} /> Administrator Only</div>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <span className="text-slate-400 font-black text-[10px] uppercase">Retail Price</span><span className="font-black text-blue-600 text-lg">₩{formatPrice(selectedWarranty.price)}</span>
                     </div>
                     <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <span className="text-slate-400 font-black text-[10px] uppercase">Policy Limit</span><span className="font-black text-slate-800 text-lg">₩{formatPrice(selectedWarranty.warrantyPrice)}</span>
                     </div>
                     <div className="flex justify-between items-center px-2 pt-2"><span className="text-slate-400 text-[10px] font-black uppercase">Cycle</span><span className="font-black text-slate-600 text-xs">{selectedWarranty.maintPeriod}개월 마다 알림 발송</span></div>
                  </div>
               </div>
             </div>
             <div className="p-6 border-t border-slate-50 bg-white">
                <button onClick={() => handleResendSMS(selectedWarranty)} className="w-full py-4.5 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all text-sm"><Send size={18} className="text-blue-400" /> 보증서 문자 재발송</button>
             </div>
          </div>
        </div>
      )}

      {/* 스타일 애니메이션 정의 */}
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes bounce-in { 0% { transform: translateY(-10px); opacity: 0; } 60% { transform: translateY(5px); opacity: 1; } 100% { transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-bounce-in { animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default MyPage;