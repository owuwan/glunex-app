import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { User, Check, X, Loader2, RefreshCw, Calendar, Lock, Search, ChevronLeft, ChevronRight, BarChart3, Users, MessageSquare, TrendingUp, Send } from 'lucide-react';

const Admin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard'); 
  
  const [users, setUsers] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(false);

  // 답변 상태 관리 (각 문의 ID별로 답변 텍스트 저장)
  const [replyTexts, setReplyTexts] = useState({});

  const [searchTerm, setSearchTerm] = useState('');
  const [userPage, setUserPage] = useState(1);
  const itemsPerPage = 5;

  const handleAdminLogin = () => {
    if (password === 'chol5622729') { 
      setIsAdmin(true);
      fetchAllData();
    } else {
      alert('비밀번호가 틀렸습니다.');
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const userList = usersSnap.docs.map(doc => {
        const data = doc.data();
        let expiryDate = null;
        if (data.membershipExpiry) expiryDate = data.membershipExpiry.toDate(); 
        return { id: doc.id, ...data, expiryDate };
      });
      userList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setUsers(userList);

      const inqQ = query(collection(db, "inquiries"), orderBy("createdAt", "desc"));
      const inqSnap = await getDocs(inqQ);
      const inqList = inqSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInquiries(inqList);

      const warSnap = await getDocs(collection(db, "warranties"));
      const warList = warSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWarranties(warList);

    } catch (error) {
      console.error("데이터 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId, months, currentExpiry) => {
    try {
      const userRef = doc(db, "users", userId);
      let baseDate = new Date();
      if (currentExpiry && currentExpiry > new Date()) baseDate = currentExpiry;
      const newExpiry = new Date(baseDate);
      newExpiry.setMonth(newExpiry.getMonth() + months);
      await updateDoc(userRef, { userStatus: 'approved', membershipExpiry: newExpiry });
      alert(`${months}개월 승인 완료!`);
      fetchAllData();
    } catch (error) { alert("오류 발생"); }
  };

  // [신규] 답변 저장 함수
  const submitReply = async (inqId) => {
    const text = replyTexts[inqId];
    if (!text || !text.trim()) return alert("답변 내용을 입력하세요.");

    if(!window.confirm("답변을 등록하시겠습니까? (사장님께 즉시 노출됩니다)")) return;

    try {
      await updateDoc(doc(db, "inquiries", inqId), { 
        status: 'completed',
        reply: text,
        repliedAt: new Date().toISOString()
      });
      alert("답변이 등록되었습니다.");
      // 입력창 초기화 및 데이터 갱신
      setReplyTexts(prev => ({ ...prev, [inqId]: '' }));
      fetchAllData();
    } catch (error) { 
      console.error(error); 
      alert("오류가 발생했습니다.");
    }
  };

  const totalSales = warranties.reduce((sum, item) => {
    const price = Number(String(item.price).replace(/[^0-9]/g, '')) || 0;
    return sum + price;
  }, 0);

  const filteredUsers = users.filter(user => 
    (user.storeName && user.storeName.includes(searchTerm)) ||
    (user.ownerName && user.ownerName.includes(searchTerm)) ||
    (user.phone && user.phone.includes(searchTerm))
  );
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentUsers = filteredUsers.slice((userPage - 1) * itemsPerPage, userPage * itemsPerPage);

  if (!isAdmin) {
    return (
      <div className="flex h-screen bg-slate-900 items-center justify-center font-noto">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center">
          <div className="flex justify-center mb-4 text-blue-600"><Lock size={40} /></div>
          <h2 className="text-2xl font-black mb-1 text-slate-900">GLUNEX ADMIN</h2>
          <p className="text-xs text-slate-400 mb-6">최고 관리자 전용 페이지입니다.</p>
          <input 
            type="password" placeholder="Access Key"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4 outline-none focus:border-blue-600 text-center font-bold"
            value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
          />
          <button onClick={handleAdminLogin} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold active:scale-95 transition-all">접속하기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-noto flex flex-col md:flex-row">
      <div className="bg-slate-900 text-white w-full md:w-64 p-6 flex flex-col shrink-0">
        <div className="mb-8"><h1 className="text-xl font-black text-amber-400 tracking-widest">GLUNEX</h1><p className="text-xs text-slate-500 font-bold">ADMIN CONSOLE</p></div>
        <nav className="flex flex-col gap-2">
            <button onClick={() => setActiveTab('dashboard')} className={`p-3 rounded-xl text-left font-bold flex items-center gap-3 ${activeTab==='dashboard' ? 'bg-blue-600' : 'hover:bg-white/10'}`}><BarChart3 size={18}/> 대시보드</button>
            <button onClick={() => setActiveTab('users')} className={`p-3 rounded-xl text-left font-bold flex items-center gap-3 ${activeTab==='users' ? 'bg-blue-600' : 'hover:bg-white/10'}`}><Users size={18}/> 파트너 관리</button>
            <button onClick={() => setActiveTab('inquiries')} className={`p-3 rounded-xl text-left font-bold flex items-center gap-3 ${activeTab==='inquiries' ? 'bg-blue-600' : 'hover:bg-white/10'}`}>
                <div className="flex justify-between w-full items-center">
                    <span className="flex items-center gap-3"><MessageSquare size={18}/> 1:1 문의</span>
                    {inquiries.filter(i=>i.status==='pending').length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{inquiries.filter(i=>i.status==='pending').length}</span>}
                </div>
            </button>
        </nav>
      </div>

      <div className="flex-1 p-6 md:p-10 overflow-y-auto h-screen">
        {activeTab === 'dashboard' && (
           <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-900">플랫폼 현황</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-slate-400 text-xs font-bold mb-1">총 누적 거래액</p><p className="text-2xl font-black text-slate-900">{totalSales.toLocaleString()}원</p></div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-slate-400 text-xs font-bold mb-1">총 파트너 수</p><p className="text-2xl font-black text-blue-600">{users.length}명</p></div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-slate-400 text-xs font-bold mb-1">미답변 문의</p><p className="text-2xl font-black text-red-500">{inquiries.filter(i=>i.status==='pending').length}건</p></div>
              </div>

              {/* 매출 그래프 시각화 (CSS 막대) */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2 mb-6">
                      <TrendingUp className="text-green-500" />
                      <h3 className="font-bold text-lg">최근 거래 추이 (최근 5건)</h3>
                  </div>
                  <div className="flex items-end justify-between h-40 gap-2">
                      {warranties.slice(0, 7).reverse().map((w, i) => {
                          const price = Number(String(w.price).replace(/[^0-9]/g, '')) || 0;
                          const height = Math.min((price / 1000000) * 100, 100); // 100만원 기준
                          return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                  <div className="w-full bg-blue-100 rounded-t-lg relative group-hover:bg-blue-200 transition-colors" style={{height: `${height}%`}}>
                                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover:opacity-100">{Math.round(price/10000)}만</div>
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              </div>
           </div>
        )}

        {activeTab === 'users' && (
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                    <h2 className="text-2xl font-black text-slate-900">파트너 관리</h2>
                    <div className="relative w-full md:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="검색..." className="w-full pl-10 py-2 rounded-xl border" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                    </div>
                </div>
                {currentUsers.map(user => (
                    <div key={user.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1"><span className={`w-2 h-2 rounded-full ${user.userStatus==='approved'?'bg-green-500':'bg-slate-300'}`}></span><h3 className="font-bold">{user.storeName}</h3></div>
                            <p className="text-xs text-slate-500">{user.email} | {user.phone}</p>
                            {user.expiryDate && <p className="text-xs text-blue-600 font-bold mt-1">만료: {user.expiryDate.toLocaleDateString()}</p>}
                        </div>
                        <div className="flex gap-1">
                            {[1, 3, 6, 12].map(m => (<button key={m} onClick={()=>approveUser(user.id, m, user.expiryDate)} className="px-3 py-1 bg-slate-50 text-xs font-bold rounded-lg hover:bg-blue-600 hover:text-white">+{m}개월</button>))}
                        </div>
                    </div>
                ))}
                {totalPages > 1 && (
                   <div className="flex justify-center gap-4 py-4">
                     <button onClick={() => setUserPage(p => Math.max(p-1, 1))} disabled={userPage===1}><ChevronLeft/></button>
                     <span>{userPage} / {totalPages}</span>
                     <button onClick={() => setUserPage(p => Math.min(p+1, totalPages))} disabled={userPage===totalPages}><ChevronRight/></button>
                   </div>
                )}
            </div>
        )}

        {activeTab === 'inquiries' && (
            <div className="space-y-4">
                <h2 className="text-2xl font-black text-slate-900 mb-4">1:1 문의 내역</h2>
                {inquiries.length === 0 ? <p className="text-center text-slate-400 py-10">문의 내역이 없습니다.</p> : 
                 inquiries.map(inq => (
                    <div key={inq.id} className={`bg-white p-5 rounded-2xl border shadow-sm ${inq.status==='pending' ? 'border-l-4 border-l-red-500' : 'border-slate-200'}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inq.status==='pending'?'bg-red-100 text-red-600':'bg-slate-100 text-slate-500'}`}>
                                    {inq.status === 'pending' ? '답변대기' : '처리완료'}
                                </span>
                                <h3 className="font-bold mt-1">{inq.storeName} <span className="text-xs font-normal text-slate-400">({inq.email})</span></h3>
                            </div>
                            <span className="text-xs text-slate-400">{new Date(inq.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-800 mb-4 whitespace-pre-wrap font-medium border border-slate-100">
                            Q. {inq.content}
                        </div>
                        
                        {inq.status === 'pending' ? (
                            <div className="flex gap-2">
                                <textarea 
                                    className="flex-1 p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-600"
                                    placeholder="답변 내용을 입력하세요"
                                    rows="2"
                                    value={replyTexts[inq.id] || ''}
                                    onChange={(e) => setReplyTexts(prev => ({ ...prev, [inq.id]: e.target.value }))}
                                />
                                <button 
                                    onClick={() => submitReply(inq.id)}
                                    className="px-4 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 flex flex-col items-center justify-center gap-1 min-w-[80px]"
                                >
                                    <Send size={16} /> 답변
                                </button>
                            </div>
                        ) : (
                            <div className="bg-green-50 p-3 rounded-xl border border-green-100 text-sm text-green-800">
                                <span className="font-bold mr-2">A.</span>{inq.reply}
                            </div>
                        )}
                    </div>
                 ))
                }
            </div>
        )}
      </div>
    </div>
  );
};

export default Admin;