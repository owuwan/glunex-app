import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Store, Mail, Phone, LogOut, ChevronLeft, 
  CreditCard, CheckCircle2, Copy, Send, Zap, Crown, 
  ShieldCheck, ArrowRight, Loader2, X, Bell
} from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const Mypage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState("");
  
  // 요금제 모달 상태
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // 입금 계좌 정보 (사장님 정보로 수정 가능)
  const bankInfo = {
    bank: "카카오뱅크",
    account: "3333-01-2345678",
    holder: "글루넥스(주)"
  };

  const plans = [
    { id: '1m', name: '1개월 베이직', price: 25000, label: 'Standard', desc: '월 2.5만원 / 기본 관리' },
    { id: '6m', name: '6개월 스타터', price: 125000, label: 'Recommended', desc: '약 17% 할인 / 1개월 무료 효과', isBest: true },
    { id: '12m', name: '12개월 프로', price: 230000, label: 'Best Value', desc: '약 23% 할인 / 2개월 무료 효과', isPremium: true }
  ];

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const docRef = doc(db, "users", u.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      } else {
        navigate('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const copyToClipboard = (text) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast("계좌번호가 복사되었습니다.");
  };

  const handleSmsConfirmation = () => {
    if (!selectedPlan || !userData) return;
    
    const msg = `[Glunex 결제확인요청]\n\n- 상호: ${userData.storeName || '미등록'}\n- 이메일: ${user.email}\n- 요금제: ${selectedPlan.name}\n- 금액: ${selectedPlan.price.toLocaleString()}원\n\n입금 완료했습니다. 서비스 연장 부탁드립니다.`;
    const isIphone = navigator.userAgent.match(/iPhone/i);
    // 고객센터 번호 설정 가능 (현재는 예시번호)
    const adminPhone = "01012345678"; 
    const smsUrl = `sms:${adminPhone}${isIphone ? '&' : '?'}body=${encodeURIComponent(msg)}`;
    
    window.location.href = smsUrl;
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-[#F8F9FB] text-slate-800 font-sans overflow-hidden max-w-md mx-auto shadow-2xl relative select-none text-left">
      
      {/* 토스트 알림 */}
      {toastMsg && (
        <div className="fixed top-12 inset-x-0 z-[200] flex justify-center px-4 animate-bounce-in pointer-events-none">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-full text-xs font-black shadow-2xl flex items-center gap-3 border border-slate-700">
            <CheckCircle2 size={16} className="text-blue-400" /> {toastMsg}
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 bg-white border-b border-slate-100 z-10 shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-full transition-colors active:scale-90">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">마이페이지</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8 pb-20 scrollbar-hide">
        
        {/* 사용자 정보 섹션 */}
        <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50" />
          <div className="relative z-10">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-slate-200">
               <Store size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">{userData?.storeName || '글루넥스 파트너'}</h2>
            <p className="text-sm font-bold text-slate-400 flex items-center gap-1.5 mb-6">
               <Mail size={14} /> {user?.email}
            </p>
            
            <div className="flex gap-2">
               <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 border border-blue-100">
                  <ShieldCheck size={14} /> 정식 파트너 인증됨
               </div>
            </div>
          </div>
        </section>

        {/* 요금제 선택 섹션 - 결제를 부르는 디자인 */}
        <section className="space-y-4">
           <div className="flex justify-between items-end px-2">
              <div>
                 <h3 className="text-lg font-black text-slate-900 tracking-tight">서비스 이용권</h3>
                 <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">Subscription Plans</p>
              </div>
              <Zap size={20} className="text-amber-400 fill-amber-400" />
           </div>

           <div className="space-y-3">
              {plans.map((plan) => (
                <button 
                  key={plan.id}
                  onClick={() => { setSelectedPlan(plan); setShowPaymentModal(true); }}
                  className={`w-full p-6 rounded-[2rem] border-2 transition-all active:scale-[0.98] text-left flex items-center justify-between relative overflow-hidden group ${
                    plan.isBest ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200' : 'bg-white border-slate-100 text-slate-800'
                  }`}
                >
                   {plan.isPremium && <div className="absolute top-0 right-0 w-20 h-20 bg-amber-400/10 rounded-full -mr-10 -mt-10" />}
                   <div className="flex flex-col gap-1.5 relative z-10">
                      <div className="flex items-center gap-2">
                         <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${plan.isBest ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            {plan.label}
                         </span>
                         {plan.isPremium && <Crown size={12} className="text-amber-400 fill-amber-400" />}
                      </div>
                      <p className={`text-lg font-black ${plan.isBest ? 'text-white' : 'text-slate-900'}`}>{plan.name}</p>
                      <p className={`text-[11px] font-bold ${plan.isBest ? 'text-slate-400' : 'text-slate-400'}`}>{plan.desc}</p>
                   </div>
                   <div className="text-right relative z-10">
                      <p className={`text-xl font-black tracking-tighter ${plan.isBest ? 'text-blue-400' : 'text-slate-900'}`}>
                         ₩{plan.price.toLocaleString()}
                      </p>
                      <div className={`flex items-center justify-end gap-1 mt-1 font-black text-[10px] ${plan.isBest ? 'text-white/40' : 'text-slate-300'}`}>
                         <span>선택하기</span>
                         <ArrowRight size={10} />
                      </div>
                   </div>
                </button>
              ))}
           </div>
        </section>

        {/* 기타 메뉴 */}
        <section className="space-y-2 pt-4">
           <button 
             onClick={handleLogout}
             className="w-full p-6 bg-slate-50 rounded-[2rem] flex items-center justify-between active:bg-slate-100 transition-colors group"
           >
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-white rounded-2xl text-red-500 shadow-sm group-hover:bg-red-50 transition-colors">
                    <LogOut size={20} />
                 </div>
                 <span className="text-sm font-black text-slate-600">안전하게 로그아웃</span>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
           </button>
        </section>

        <div className="text-center pt-8 opacity-30">
           <p className="text-[10px] font-black uppercase tracking-[0.3em]">Glunex AI Hub v2.4.0</p>
        </div>
      </main>

      {/* ================= [결제 안내 모달] ================= */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in" onClick={() => setShowPaymentModal(false)}>
           <div className="bg-white w-full max-w-[340px] rounded-[3rem] shadow-2xl relative p-8 flex flex-col overflow-hidden animate-scale-in text-left" onClick={e => e.stopPropagation()}>
              
              <div className="flex justify-between items-start mb-8">
                 <div>
                    <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 inline-block">Payment Guide</div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-tight">결제 정보 안내</h3>
                 </div>
                 <button onClick={() => setShowPaymentModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 active:scale-90 transition-all"><X size={20}/></button>
              </div>

              <div className="bg-blue-600 rounded-3xl p-6 text-white mb-6 shadow-xl shadow-blue-100 relative overflow-hidden">
                 <Zap className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-white/10 rotate-12" />
                 <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Selected Plan</p>
                 <p className="text-xl font-black mb-4">{selectedPlan.name}</p>
                 <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black tracking-tighter">₩{selectedPlan.price.toLocaleString()}</span>
                    <span className="text-xs font-bold text-blue-200">결제 예정</span>
                 </div>
              </div>

              <div className="space-y-4 mb-8">
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deposit Account</p>
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex items-center justify-between group">
                       <div>
                          <p className="text-[10px] font-bold text-slate-400 mb-0.5">{bankInfo.bank}</p>
                          <p className="text-base font-black text-slate-800">{bankInfo.account}</p>
                          <p className="text-[11px] font-bold text-slate-500 mt-1">예금주: {bankInfo.holder}</p>
                       </div>
                       <button 
                         onClick={() => copyToClipboard(bankInfo.account)}
                         className="p-3 bg-white rounded-xl text-slate-400 hover:text-blue-600 active:scale-90 transition-all border border-slate-100 shadow-sm"
                       >
                          <Copy size={18} />
                       </button>
                    </div>
                 </div>
              </div>

              <div className="space-y-3">
                 <button 
                    onClick={handleSmsConfirmation}
                    className="w-full py-4.5 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all shadow-slate-900/30"
                 >
                    <Send size={16} className="text-blue-400" />
                    <span>입금 완료 확인 요청</span>
                 </button>
                 <p className="text-center text-[10px] text-slate-400 font-bold">확인 요청 문자를 보내주시면 10분 내로 승인됩니다.</p>
              </div>

           </div>
        </div>
      )}

      {/* 스타일 시스템 */}
      <style>{`
        @keyframes bounce-in { 0% { transform: translateY(-20px); opacity: 0; } 60% { transform: translateY(10px); opacity: 1; } 100% { transform: translateY(0); } }
        @keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-bounce-in { animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Mypage;