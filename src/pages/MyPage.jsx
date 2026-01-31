import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, ChevronLeft, User, Crown, Copy, Send, LogOut, 
  FileText, Loader2, RefreshCw, AlertCircle, X, Lock, 
  Calendar, Headphones, MessageSquare, CreditCard, Zap, ArrowRight, 
  ShieldCheck, Store, Mail, CheckCircle2 
} from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';

const MyPage = ({ userStatus, setUserStatus }) => {
  const navigate = useNavigate();
  
  // --- 기존 상태 로직 유지 ---
  const [depositorName, setDepositorName] = useState('');
  const [historyList, setHistoryList] = useState([]);
  const [myInquiries, setMyInquiries] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [storeName, setStoreName] = useState('파트너');
  const [expiryInfo, setExpiryInfo] = useState({ date: null, daysLeft: 0 });
  
  // 팝업 및 UI 상태
  const [selectedWarranty, setSelectedWarranty] = useState(null);
  const [showCustomerCenter, setShowCustomerCenter] = useState(false); 
  const [csTab, setCsTab] = useState('write'); 
  const [inquiryText, setInquiryText] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // 요금제 데이터 (사장님 요청 체계)
  const plans = [
    { id: '1m', name: '1개월 베이직', price: 25000, label: 'Standard', desc: '월 25,000원 / 기본 관리 솔루션' },
    { id: '6m', name: '6개월 스타터', price: 125000, label: '추천', desc: '약 17% 할인 / 1개월 무료 효과', isBest: true },
    { id: '12m', name: '12개월 프로', price: 230000, label: '최대 할인', desc: '약 23% 할인 / 2개월 무료 효과', isPremium: true }
  ];

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // --- [Step 1] 데이터 로딩 및 인증 체크 (원본 로직 보존) ---
  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }
      setUserEmail(user.email);

      try {
        // 유저 정보 가져오기
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

        // 문의 내역 가져오기
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

  // --- [Step 2] 액션 핸들러 (원본 로직 보존) ---
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

  const handleResendSMS = (item) => {
    if (!item.phone) return alert("전화번호가 없습니다.");
    const confirmSend = window.confirm(`${item.customerName}님께 보증서를 재전송하시겠습니까?`);
    if (confirmSend) {
      const viewLink = `${window.location.origin}/warranty/view/${item.id}`;
      const message = `[GLUNEX] 안녕하세요, 발행된 시공 보증서입니다.\n아래 링크에서 확인하실 수 있습니다.\n${viewLink}`;
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

  // 결제 완료 요청 문자 (홍철님 요청 양식 적용)
  const sendApprovalRequest = () => {
    if (!selectedPlan) return alert('요금제를 선택해주세요.');
    const msg = `[Glunex 결제확인요청]\n- 상호: ${storeName}\n- 이메일: ${userEmail}\n- 신청요금제: ${selectedPlan.name}\n- 금액: ${selectedPlan.price.toLocaleString()}원\n\n입금 완료하였습니다. 서비스 연장 부탁드립니다!`;
    window.location.href = `sms:01028923334?body=${encodeURIComponent(msg)}`;
    setShowPaymentModal(false);
  };

  const handleLogout = () => {
    auth.signOut();
    navigate('/login');
  };

  // 페이징 계산
  const totalPages = Math.ceil(historyList.length / itemsPerPage);
  const currentHistory = historyList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}`;
  };

  const formatPrice = (price) => Number(String(price).replace(/[^0-9]/g, ''))?.toLocaleString() || '0';

  const isExpired = userStatus === 'approved' && expiryInfo.daysLeft <= 0;

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-white p-8">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#F8F9FB] font-sans animate-fade-in relative text-left select-none max-w-md mx-auto shadow-2xl overflow-hidden">
      
      {/* 성공 토스트 */}
      {toastMsg && (
        <div className="fixed top-12 inset-x-0 z-[200] flex justify-center px-4 animate-bounce-in pointer-events-none">
          <div className="bg-slate-900 text-white px-5 py-3 rounded-xl text-[12px] font-bold shadow-2xl flex items-center gap-2.5 border border-slate-700 backdrop-blur-md">
            <CheckCircle2 size={16} className="text-blue-400" /> {toastMsg}
          </div>
        </div>
      )}

      {/* 상단 헤더: 심플 & 날카로운 디자인 */}
      <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between pt-10 bg-white sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-1 hover:bg-slate-50 rounded-lg transition-colors">
            <ChevronLeft size={22} className="text-slate-400" />
          </button>
          <h2 className="text-[17px] font-black text-slate-900 tracking-tight italic">GLUNEX <span className="text-blue-600 font-bold not-italic">MY</span></h2>
        </div>
        <button 
          onClick={() => setShowCustomerCenter(true)}
          className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg hover:bg-slate-100 border border-slate-100 transition-all"
        >
          <Headphones size={13} /> 고객센터
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide pb-20">
        
        {/* 프로필 카드: 핀테크 스타일 */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between relative overflow-hidden group">
           <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                 <h3 className="text-[19px] font-black text-slate-900 tracking-tight">{storeName} 사장님</h3>
                 {userStatus === 'approved' && !isExpired ? (
                   <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Crown size={8} className="fill-white" /> 프리미엄
                   </span>
                 ) : (
                   <span className="bg-slate-100 text-slate-400 text-[9px] font-black px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-tighter">Free Experience</span>
                 )}
              </div>
              <p className="text-slate-400 text-[11px] font-medium tracking-tight">{userEmail}</p>
              {userStatus === 'approved' && <p className="text-[10px] text-blue-600 font-black mt-2.5 uppercase tracking-tighter">멤버십 만료일: {expiryInfo.date}</p>}
           </div>
           <div className="w-11 h-11 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 border border-slate-100">
              <Store size={22} />
           </div>
        </section>

        {/* 요금제 섹션: 결제를 부르는 고도화 디자인 */}
        <section className="space-y-3.5">
           <div className="flex justify-between items-end px-1">
              <div className="text-left">
                 <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">서비스 플랜 업그레이드</h3>
                 <p className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-widest italic opacity-60">Pricing Plans</p>
              </div>
              <Zap size={16} className="text-amber-400 fill-amber-400 animate-pulse" />
           </div>

           <div className="space-y-2.5">
              {plans.map((plan) => (
                <button 
                  key={plan.id}
                  onClick={() => { setSelectedPlan(plan); setShowPaymentModal(true); }}
                  className={`w-full p-5 rounded-xl border-2 transition-all active:scale-[0.99] text-left flex items-center justify-between relative overflow-hidden ${
                    plan.isBest ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200' : 'bg-white border-slate-100 text-slate-800'
                  }`}
                >
                   <div className="flex flex-col gap-1 relative z-10">
                      <div className="flex items-center gap-1.5 mb-0.5">
                         <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm ${plan.isBest ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            {plan.label}
                         </span>
                         {plan.isPremium && <Crown size={10} className="text-amber-400 fill-amber-400" />}
                      </div>
                      <p className={`text-[15px] font-bold tracking-tight ${plan.isBest ? 'text-white' : 'text-slate-900'}`}>{plan.name}</p>
                      <p className={`text-[10px] font-medium ${plan.isBest ? 'text-slate-400' : 'text-slate-400'}`}>{plan.desc}</p>
                   </div>
                   <div className="text-right relative z-10">
                      <p className={`text-lg font-black tracking-tighter ${plan.isBest ? 'text-blue-400' : 'text-slate-900'}`}>
                         ₩{plan.price.toLocaleString()}
                      </p>
                      <div className={`flex items-center justify-end gap-1 mt-0.5 font-bold text-[9px] ${plan.isBest ? 'text-white/20' : 'text-slate-300'}`}>
                         <span>선택하기</span>
                         <ArrowRight size={10} />
                      </div>
                   </div>
                </button>
              ))}
           </div>
        </section>

        {/* 발행 내역: 심플 콤팩트 리스트 */}
        <section>
           <div className="flex items-center gap-1.5 mb-3 px-1 text-left">
              <FileText size={14} className="text-slate-400" />
              <h3 className="text-[13px] font-bold text-slate-600">최근 보증서 발행 내역</h3>
           </div>
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[100px]">
             {loading ? (
               <div className="p-10 flex justify-center items-center text-slate-300 gap-2 text-[11px] font-bold"><Loader2 className="animate-spin" size={16} /> 정보 확인 중...</div>
             ) : historyList.length > 0 ? (
               <>
                 <div className="divide-y divide-slate-50">
                   {currentHistory.map((item) => (
                     <div key={item.id} onClick={() => setSelectedWarranty(item)} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer">
                       <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-50 rounded flex items-center justify-center text-slate-400 border border-slate-100"><FileText size={16} /></div>
                          <div className="text-left">
                             <p className="text-[13px] font-bold text-slate-800">{item.customerName} 고객님 <span className="text-slate-300 font-medium text-[11px] ml-1">| {item.carModel}</span></p>
                             <p className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-tighter">{formatDate(item.issuedAt)}</p>
                          </div>
                       </div>
                       <ChevronRight size={14} className="text-slate-200" />
                     </div>
                   ))}
                 </div>
                 {totalPages > 1 && (
                   <div className="flex justify-center items-center gap-6 py-3 border-t border-slate-50 bg-slate-50/20">
                     <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-1.5 rounded bg-white border border-slate-200 disabled:opacity-20"><ChevronLeft size={16} /></button>
                     <span className="text-[10px] font-bold text-slate-400">{currentPage} / {totalPages}</span>
                     <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 rounded bg-white border border-slate-200 disabled:opacity-20"><ChevronRight size={16} /></button>
                   </div>
                 )}
               </>
             ) : (
               <div className="p-16 text-center"><p className="text-[11px] text-slate-300 font-bold tracking-tight">발행된 데이터가 없습니다.</p></div>
             )}
           </div>
        </section>

        <button onClick={handleLogout} className="w-full py-10 text-slate-300 text-[10px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-1.5 hover:text-red-400 transition-colors"><LogOut size={10} /> Logout Account</button>
      </div>

      {/* ================= [모달 1: 결제 상세 및 계좌 안내] ================= */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-slate-900/80 backdrop-blur-sm animate-fade-in" onClick={() => setShowPaymentModal(false)}>
           <div className="bg-white w-full max-w-[320px] rounded-xl shadow-2xl relative p-6 flex flex-col overflow-hidden animate-scale-in text-left" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <div className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-black uppercase mb-1 inline-block tracking-tighter">Subscription Guide</div>
                    <h3 className="text-[20px] font-black text-slate-900 tracking-tight">멤버십 결제 안내</h3>
                 </div>
                 <button onClick={() => setShowPaymentModal(false)} className="p-1.5 bg-slate-50 rounded-full text-slate-300 hover:text-slate-900 transition-all"><X size={18}/></button>
              </div>

              <div className="bg-blue-600 rounded-xl p-5 text-white mb-5 shadow-lg relative overflow-hidden">
                 <Zap className="absolute right-[-10px] bottom-[-10px] w-20 h-20 text-white/10 rotate-12" />
                 <p className="text-[10px] font-black text-blue-200 uppercase mb-0.5">Selected Package</p>
                 <p className="text-[17px] font-bold mb-3 tracking-tight">{selectedPlan.name}</p>
                 <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black tracking-tighter">₩{selectedPlan.price.toLocaleString()}</span>
                    <span className="text-[10px] font-medium text-blue-200 ml-1">VAT 포함</span>
                 </div>
              </div>

              <div className="space-y-1.5 mb-6">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">무통장 입금 정보</p>
                 <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between group active:bg-slate-100 transition-colors" onClick={copyAccount}>
                    <div>
                       <p className="text-[11px] font-bold text-slate-400 mb-0.5 uppercase tracking-tighter">Korea Post (우체국)</p>
                       <p className="text-[14px] font-black text-slate-800 tracking-tight">110-0074-44578</p>
                       <p className="text-[10px] font-bold text-slate-400 mt-1">예금주: 최경식 (글루넥스)</p>
                    </div>
                    <Copy size={16} className="text-slate-300 group-hover:text-blue-600" />
                 </div>
              </div>

              <button 
                 onClick={sendApprovalRequest}
                 className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
              >
                 <Send size={14} className="text-blue-400" />
                 <span>입금 완료 확인 요청 (문자)</span>
              </button>
              <p className="text-center text-[9px] text-slate-400 font-medium mt-3.5 italic tracking-tight">입금 후 문자를 주시면 10분 내로 승인 처리됩니다.</p>
           </div>
        </div>
      )}

      {/* ================= [모달 2: 1:1 고객센터] ================= */}
      {showCustomerCenter && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setShowCustomerCenter(false)}>
            <div className="bg-white w-full max-w-[340px] rounded-xl shadow-2xl relative flex flex-col h-[70vh] overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
               <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-white">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 bg-blue-50 rounded flex items-center justify-center text-blue-600"><Headphones size={18} /></div>
                     <h3 className="font-bold text-[15px] text-slate-900 tracking-tight">1:1 고객센터</h3>
                  </div>
                  <button onClick={() => setShowCustomerCenter(false)} className="p-1.5 bg-slate-50 rounded-full text-slate-300 hover:text-slate-900 transition-all"><X size={18}/></button>
               </div>
               <div className="flex border-b border-slate-50">
                  <button onClick={() => setCsTab('write')} className={`flex-1 py-3 text-[11px] font-bold ${csTab==='write'?'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30':'text-slate-400'}`}>문의하기</button>
                  <button onClick={() => setCsTab('list')} className={`flex-1 py-3 text-[11px] font-bold ${csTab==='list'?'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30':'text-slate-400'}`}>문의 내역</button>
               </div>
               <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50">
                  {csTab === 'write' ? (
                      <div className="space-y-4">
                         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <textarea 
                              className="w-full h-40 p-1 bg-transparent text-[13px] font-medium outline-none resize-none placeholder:text-slate-300 leading-relaxed"
                              placeholder="사장님의 소중한 의견을 남겨주세요."
                              value={inquiryText}
                              onChange={(e) => setInquiryText(e.target.value)}
                            ></textarea>
                         </div>
                         <button onClick={handleInquirySubmit} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 active:scale-95 transition-all text-sm">문의 접수</button>
                      </div>
                  ) : (
                      <div className="space-y-3">
                        {myInquiries.length === 0 ? (
                           <div className="text-center py-24 text-slate-300 font-bold text-[11px]">문의 내역이 없습니다.</div>
                        ) : (
                           myInquiries.map(inq => (
                              <div key={inq.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                 <div className="flex justify-between items-center mb-2">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${inq.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                       {inq.status === 'completed' ? '답변완료' : '접수완료'}
                                    </span>
                                    <span className="text-[10px] text-slate-300 font-medium">{formatDate(inq.createdAt)}</span>
                                 </div>
                                 <p className="text-[13px] font-medium text-slate-700 leading-relaxed mb-1">{inq.content}</p>
                                 {inq.reply && (
                                    <div className="bg-slate-50 p-3 rounded-lg mt-3 border-l-2 border-blue-400">
                                       <div className="flex items-center gap-1.5 mb-1.5 text-blue-700 font-bold text-[10px]">
                                          <MessageSquare size={10} className="fill-blue-700" /> 운영팀 답변
                                       </div>
                                       <p className="text-[11px] font-medium text-slate-600 leading-relaxed">{inq.reply}</p>
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

      {/* ================= [모달 3: 보증서 상세 - 완벽 한글화] ================= */}
      {selectedWarranty && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedWarranty(null)}>
          <div className="bg-white w-full max-w-[340px] rounded-xl overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh] animate-scale-in" onClick={e => e.stopPropagation()}>
             <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
               <h3 className="font-black text-slate-900 text-[15px] tracking-tight">보증서 상세 정보</h3>
               <button onClick={() => setSelectedWarranty(null)} className="p-1.5 bg-slate-50 rounded-full text-slate-300 hover:text-slate-900 transition-all active:scale-90"><X size={18}/></button>
             </div>
             <div className="p-5 overflow-y-auto scrollbar-hide">
               <div className="bg-slate-900 rounded-xl p-5 text-white mb-5 relative overflow-hidden shadow-xl">
                  {selectedWarranty.carImageUrl && (
                     <>
                       <img src={selectedWarranty.carImageUrl} alt="Car" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                       <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
                     </>
                  )}
                  <div className="relative z-10">
                     <div className="flex justify-between items-start mb-5">
                       <div><p className="text-amber-400 text-[8px] font-black tracking-widest mb-1 uppercase">Official Warranty</p><h2 className="text-xl font-bold tracking-tight">{selectedWarranty.customerName} 고객님</h2></div>
                       <Crown size={20} className="text-amber-400 fill-amber-400" />
                     </div>
                     <div className="space-y-3.5 text-[12px] border-t border-white/10 pt-5">
                        <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">차량 모델</span><span className="font-bold">{selectedWarranty.carModel} ({selectedWarranty.plateNumber})</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">시공 제품</span><span className="font-bold">{selectedWarranty.productName}</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">발행 일자</span><span className="font-bold">{formatDate(selectedWarranty.issuedAt)}</span></div>
                     </div>
                  </div>
               </div>
               <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 mb-2">
                  <div className="flex items-center gap-1.5 mb-4 text-blue-900 font-black text-[10px] uppercase tracking-tighter"><Lock size={12} strokeWidth={3} /> 관리자 전용 데이터</div>
                  <div className="space-y-3">
                     <div className="flex justify-between items-center bg-white p-3.5 rounded-lg border border-slate-100 shadow-sm">
                        <span className="text-slate-400 font-bold text-[10px]">시공 금액</span><span className="font-black text-blue-600 text-[14px]">₩{formatPrice(selectedWarranty.price)}</span>
                     </div>
                     <div className="flex justify-between items-center bg-white p-3.5 rounded-lg border border-slate-100 shadow-sm">
                        <span className="text-slate-400 font-bold text-[10px]">보증 한도액</span><span className="font-black text-slate-800 text-[14px]">₩{formatPrice(selectedWarranty.warrantyPrice)}</span>
                     </div>
                     <div className="flex justify-between items-center px-1 pt-1"><span className="text-slate-400 text-[10px] font-bold italic tracking-tighter">관리 주기</span><span className="font-black text-slate-600 text-[11px]">{selectedWarranty.maintPeriod}개월 주기 알림</span></div>
                  </div>
               </div>
             </div>
             <div className="p-5 border-t border-slate-50 bg-white">
                <button onClick={() => handleResendSMS(selectedWarranty)} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all text-[13px]"><Send size={15} className="text-blue-400" /> 보증서 재발송 (문자)</button>
             </div>
          </div>
        </div>
      )}

      {/* 스타일 시스템: 미니멀한 애니메이션 */}
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scale-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        @keyframes bounce-in { 0% { transform: translateY(-15px); opacity: 0; } 60% { transform: translateY(5px); opacity: 1; } 100% { transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.25s ease-out forwards; }
        .animate-scale-in { animation: scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-bounce-in { animation: bounce-in 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default MyPage;