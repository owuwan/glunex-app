import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, ChevronLeft, User, Crown, Copy, Send, LogOut, 
  FileText, Loader2, RefreshCw, AlertCircle, X, Lock, 
  Calendar, Headphones, MessageSquare, CreditCard, Zap, ArrowRight, 
  ShieldCheck, Store, Mail, CheckCircle2, Bell
} from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';

const MyPage = ({ userStatus, setUserStatus }) => {
  const navigate = useNavigate();
  
  // --- [1] 상태 관리 (원본 로직 100% 보존) ---
  const [depositorName, setDepositorName] = useState('');
  const [historyList, setHistoryList] = useState([]);
  const [myInquiries, setMyInquiries] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [storeName, setStoreName] = useState('파트너');
  const [expiryInfo, setExpiryInfo] = useState({ date: null, daysLeft: 0 });
  
  // UI 팝업 및 알림 상태
  const [selectedWarranty, setSelectedWarranty] = useState(null);
  const [showCustomerCenter, setShowCustomerCenter] = useState(false); 
  const [csTab, setCsTab] = useState('write'); 
  const [inquiryText, setInquiryText] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // --- [2] 계산 변수 (totalPages 오류 해결 핵심) ---
  const totalPages = Math.ceil(historyList.length / itemsPerPage);
  const currentHistory = historyList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 본사 답변 알림 점(Red Dot) 계산
  const hasNewReply = useMemo(() => {
    return myInquiries.some(inq => inq.status === 'completed' || inq.reply);
  }, [myInquiries]);

  // 요금제 데이터
  const plans = [
    { id: '1m', name: '1개월 베이직', price: 25000, label: '기본형', desc: '월 25,000원 / 매장 관리의 시작' },
    { id: '6m', name: '6개월 스타터', price: 125000, label: '인기', desc: '약 17% 할인 / 1개월 무료 효과', isBest: true },
    { id: '12m', name: '12개월 프로', price: 230000, label: '베스트', desc: '약 23% 할인 / 2개월 무료 효과', isPremium: true }
  ];

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // --- [3] 데이터 페칭 및 인증 (기존 로직 보존) ---
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

  // --- [4] 핸들러 함수들 ---
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
    } catch (e) { alert("전송 실패"); }
  };

  const handleResendSMS = (item) => {
    if (!item.phone) return alert("전화번호가 없습니다.");
    const confirmSend = window.confirm(`${item.customerName}님께 보증서를 재전송하시겠습니까?`);
    if (confirmSend) {
      const viewLink = `${window.location.origin}/warranty/view/${item.id}`;
      const message = `[GLUNEX] 보증서가 발급되었습니다.\n아래 링크에서 확인하세요!\n${viewLink}`;
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
    if (!selectedPlan) return alert('요금제를 선택해 주세요.');
    const msg = `[Glunex 결제확인요청]\n- 상호: ${storeName}\n- 이메일: ${userEmail}\n- 요금제: ${selectedPlan.name}\n- 금액: ${selectedPlan.price.toLocaleString()}원\n\n입금 완료했습니다. 확인 부탁드립니다!`;
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
    <div className="flex flex-col h-full bg-[#F8F9FB] font-sans animate-fade-in relative text-left select-none max-w-md mx-auto shadow-2xl overflow-hidden">
      
      {/* 알림 토스트 */}
      {toastMsg && (
        <div className="fixed top-12 inset-x-0 z-[200] flex justify-center px-4 animate-bounce-in pointer-events-none">
          <div className="bg-slate-900 text-white px-5 py-3 rounded-xl text-[12px] font-bold shadow-2xl flex items-center gap-2.5 border border-slate-700 backdrop-blur-md">
            <CheckCircle2 size={16} className="text-blue-400" /> {toastMsg}
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between pt-12 bg-white sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-1 hover:bg-slate-50 rounded-lg transition-colors">
            <ChevronLeft size={22} className="text-slate-400" />
          </button>
          <h2 className="text-[17px] font-black text-slate-900 tracking-tight italic uppercase">GLUNEX <span className="text-blue-600 not-italic">MY</span></h2>
        </div>

        {/* [업데이트] 블루 강조된 고객센터 버튼 및 알림 빨간점 */}
        <div className="relative">
          <button 
            onClick={() => setShowCustomerCenter(true)}
            className="flex items-center gap-1.5 text-[11px] font-black text-white bg-blue-600 px-4 py-2 rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-md shadow-blue-100"
          >
            <Headphones size={13} strokeWidth={3} /> 고객센터
          </button>
          {hasNewReply && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide pb-24">
        
        {/* [업데이트] 프로필 카드: 집 아이콘 제거 및 등급 배지 추가 */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between relative overflow-hidden group">
           <div className="relative z-10">
              <div className="flex flex-col gap-0.5">
                 <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Partner Status</p>
                 <h3 className="text-[19px] font-black text-slate-900 tracking-tight leading-tight">{storeName} 사장님</h3>
              </div>
              <p className="text-slate-400 text-[11px] font-medium tracking-tight mt-1">{userEmail}</p>
              {userStatus === 'approved' && (
                <p className="text-[10px] text-blue-600 font-black mt-3 uppercase tracking-tighter bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                  만료 예정: {expiryInfo.date}
                </p>
              )}
           </div>

           <div className="flex flex-col items-end gap-2 relative z-10">
              <div className={`px-4 py-2.5 rounded-xl font-black text-[11px] shadow-sm border ${
                userStatus === 'approved' && !isExpired 
                ? 'bg-blue-600 text-white border-blue-700' 
                : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {userStatus === 'approved' && !isExpired ? (
                  <div className="flex items-center gap-1.5"><Crown size={14} className="fill-white" /> 프리미엄</div>
                ) : (
                  '일반 회원'
                )}
              </div>
           </div>
        </section>

        {/* 요금제 섹션: 심플 & 직관적 */}
        <section className="space-y-3.5">
           <div className="flex justify-between items-end px-1">
              <div className="text-left">
                 <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">멤버십 이용권 선택</h3>
                 <p className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-widest italic opacity-60">Upgrade Plans</p>
              </div>
              <Zap size={16} className="text-amber-400 fill-amber-400" />
           </div>

           <div className="space-y-2.5">
              {plans.map((plan) => (
                <button 
                  key={plan.id}
                  onClick={() => { setSelectedPlan(plan); setShowPaymentModal(true); }}
                  className={`w-full p-5 rounded-xl border-2 transition-all active:scale-[0.99] text-left flex items-center justify-between relative overflow-hidden ${
                    plan.isBest ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-800'
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
                         <span>선택</span>
                         <ArrowRight size={10} />
                      </div>
                   </div>
                </button>
              ))}
           </div>
        </section>

        {/* 발행 내역: 한글화 적용 */}
        <section>
           <div className="flex items-center gap-1.5 mb-3 px-1 text-left">
              <FileText size={14} className="text-slate-400" />
              <h3 className="text-[13px] font-bold text-slate-600">최근 보증서 발행 내역</h3>
           </div>
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[100px]">
             {currentHistory.length > 0 ? (
               <>
                 <div className="divide-y divide-slate-50">
                   {currentHistory.map((item) => (
                     <div key={item.id} onClick={() => setSelectedWarranty(item)} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer">
                       <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-50 rounded flex items-center justify-center text-slate-400"><FileText size={16} /></div>
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
                     <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-1.5 rounded bg-white border border-slate-200 disabled:opacity-20 transition-all"><ChevronLeft size={16} /></button>
                     <span className="text-[10px] font-bold text-slate-400">{currentPage} / {totalPages}</span>
                     <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 rounded bg-white border border-slate-200 disabled:opacity-20 transition-all"><ChevronRight size={16} /></button>
                   </div>
                 )}
               </>
             ) : (
               <div className="p-16 text-center"><p className="text-[11px] text-slate-300 font-bold uppercase tracking-widest">발행 데이터 없음</p></div>
             )}
           </div>
        </section>

        <button onClick={handleLogout} className="w-full py-10 text-slate-300 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-1.5 hover:text-red-400 transition-colors"><LogOut size={10} /> Logout Account</button>
      </div>

      {/* ================= [모달 1: 결제 안내] ================= */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-slate-900/80 backdrop-blur-sm animate-fade-in" onClick={() => setShowPaymentModal(false)}>
           <div className="bg-white w-full max-w-[320px] rounded-2xl shadow-2xl relative p-6 flex flex-col overflow-hidden animate-scale-in text-left" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <div className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-black uppercase mb-1 inline-block">Payment Guide</div>
                    <h3 className="text-[20px] font-black text-slate-900 tracking-tight">입금 안내</h3>
                 </div>
                 <button onClick={() => setShowPaymentModal(false)} className="p-1.5 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-all"><X size={18}/></button>
              </div>

              <div className="bg-blue-600 rounded-xl p-5 text-white mb-5 shadow-lg relative overflow-hidden">
                 <Zap className="absolute right-[-10px] bottom-[-10px] w-20 h-20 text-white/10 rotate-12" />
                 <p className="text-[10px] font-black text-blue-200 uppercase mb-0.5">선택 요금제</p>
                 <p className="text-[17px] font-bold mb-3 tracking-tight">{selectedPlan.name}</p>
                 <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black tracking-tighter">₩{selectedPlan.price.toLocaleString()}</span>
                    <span className="text-[10px] font-medium text-blue-200 ml-1">VAT 포함</span>
                 </div>
              </div>

              <div className="space-y-1.5 mb-6">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">입금 계좌 (우체국)</p>
                 <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between active:bg-slate-100 transition-colors" onClick={copyAccount}>
                    <div>
                       <p className="text-[14px] font-black text-slate-800 tracking-tight leading-tight">110-0074-44578</p>
                       <p className="text-[10px] font-bold text-slate-400 mt-1">예금주: 최경식 (글루넥스)</p>
                    </div>
                    <Copy size={16} className="text-slate-300" />
                 </div>
              </div>

              <button onClick={sendApprovalRequest} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all">
                 <Send size={14} className="text-blue-400" /> <span>결제 완료 확인 요청 문자</span>
              </button>
           </div>
        </div>
      )}

      {/* ================= [모달 2: 1:1 고객센터] ================= */}
      {showCustomerCenter && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setShowCustomerCenter(false)}>
            <div className="bg-white w-full max-w-[340px] rounded-xl shadow-2xl relative flex flex-col h-[70vh] overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
               <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-white shrink-0">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-100"><Headphones size={16} /></div>
                     <h3 className="font-black text-[15px] text-slate-900 tracking-tight">1:1 고객지원</h3>
                  </div>
                  <button onClick={() => setShowCustomerCenter(false)} className="p-1.5 bg-slate-50 rounded-full text-slate-300 hover:text-slate-900 transition-all active:scale-90"><X size={18}/></button>
               </div>
               <div className="flex border-b border-slate-50 shrink-0">
                  <button onClick={() => setCsTab('write')} className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest ${csTab==='write'?'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30':'text-slate-400'}`}>문의하기</button>
                  <button onClick={() => setCsTab('list')} className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest relative ${csTab==='list'?'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30':'text-slate-400'}`}>
                    내 문의내역
                    {hasNewReply && <div className="absolute top-2 right-4 w-1.5 h-1.5 bg-red-500 rounded-full" />}
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 scrollbar-hide">
                  {csTab === 'write' ? (
                      <div className="space-y-4">
                         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-left">
                            <textarea 
                              className="w-full h-40 p-1 bg-transparent text-[13px] font-bold outline-none resize-none placeholder:text-slate-300 leading-relaxed text-slate-700"
                              placeholder="서비스 이용 중 궁금한 점을 남겨주세요."
                              value={inquiryText}
                              onChange={(e) => setInquiryText(e.target.value)}
                            ></textarea>
                         </div>
                         <button onClick={handleInquirySubmit} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all text-sm">문의 접수</button>
                      </div>
                  ) : (
                      <div className="space-y-3">
                        {myInquiries.length === 0 ? (
                           <div className="text-center py-24 text-slate-300 font-bold text-[11px] uppercase tracking-widest">문의 없음</div>
                        ) : (
                           myInquiries.map(inq => (
                              <div key={inq.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-left">
                                 <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${inq.status === 'completed' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                         {inq.status === 'completed' ? '답변완료' : '검토중'}
                                      </span>
                                      {inq.status === 'completed' && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
                                    </div>
                                    <span className="text-[10px] text-slate-300 font-bold tracking-tighter">{formatDate(inq.createdAt)}</span>
                                 </div>
                                 <p className="text-[13px] font-bold text-slate-700 leading-relaxed mb-1">{inq.content}</p>
                                 {inq.reply && (
                                    <div className="bg-blue-50/80 p-3 rounded-lg mt-3 border-l-2 border-blue-400">
                                       <div className="flex items-center gap-1.5 mb-1.5 text-blue-700 font-black text-[10px]">
                                          <MessageSquare size={10} className="fill-blue-700" /> 본사 답변
                                       </div>
                                       <p className="text-[11px] font-bold text-slate-600 leading-relaxed whitespace-pre-wrap">{inq.reply}</p>
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
             <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
               <h3 className="font-black text-slate-900 text-[15px] tracking-tight">보증서 상세 내역</h3>
               <button onClick={() => setSelectedWarranty(null)} className="p-1.5 bg-slate-50 rounded-full text-slate-300 hover:text-slate-900 transition-all active:scale-90"><X size={18}/></button>
             </div>
             <div className="p-5 overflow-y-auto scrollbar-hide text-left">
               <div className="bg-slate-900 rounded-xl p-5 text-white mb-5 relative overflow-hidden shadow-xl">
                  {selectedWarranty.carImageUrl && (
                     <><img src={selectedWarranty.carImageUrl} alt="Car" className="absolute inset-0 w-full h-full object-cover opacity-20" /><div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div></>
                  )}
                  <div className="relative z-10">
                     <div className="flex justify-between items-start mb-5">
                       <div><p className="text-amber-400 text-[8px] font-black tracking-widest mb-1 uppercase">Official Warranty</p><h2 className="text-xl font-bold tracking-tight">{selectedWarranty.customerName} 고객님</h2></div>
                       <Crown size={20} className="text-amber-400 fill-amber-400" />
                     </div>
                     <div className="space-y-3.5 text-[12px] border-t border-white/10 pt-5 font-bold">
                        <div className="flex justify-between items-center"><span className="text-slate-400 font-medium text-[10px]">차량 모델</span><span>{selectedWarranty.carModel} ({selectedWarranty.plateNumber})</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-400 font-medium text-[10px]">시공 제품</span><span>{selectedWarranty.productName}</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-400 font-medium text-[10px]">발행 일자</span><span>{formatDate(selectedWarranty.issuedAt)}</span></div>
                     </div>
                  </div>
               </div>
               <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 mb-2">
                  <div className="flex items-center gap-1.5 mb-4 text-blue-900 font-black text-[10px] uppercase tracking-tighter"><Lock size={12} strokeWidth={3} /> 관리자 전용 데이터</div>
                  <div className="space-y-3 font-bold">
                     <div className="flex justify-between items-center bg-white p-3.5 rounded-lg border border-slate-100 shadow-sm">
                        <span className="text-slate-400 text-[10px]">시공 금액</span><span className="font-black text-blue-600 text-[14px]">₩{formatPrice(selectedWarranty.price)}</span>
                     </div>
                     <div className="flex justify-between items-center bg-white p-3.5 rounded-lg border border-slate-100 shadow-sm">
                        <span className="text-slate-400 text-[10px]">보증 한도액</span><span className="font-black text-slate-800 text-[14px]">₩{formatPrice(selectedWarranty.warrantyPrice)}</span>
                     </div>
                     <div className="flex justify-between items-center px-1 pt-1"><span className="text-slate-400 text-[10px]">관리 주기</span><span className="font-black text-slate-600 text-[11px]">{selectedWarranty.maintPeriod}개월 주기 알림</span></div>
                  </div>
               </div>
             </div>
             <div className="p-5 border-t border-slate-50 bg-white shrink-0">
                <button onClick={() => handleResendSMS(selectedWarranty)} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-[13px]"><Send size={15} className="text-blue-400" /> 보증서 재발송 문자</button>
             </div>
          </div>
        </div>
      )}

      {/* 스타일 애니메이션 */}
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