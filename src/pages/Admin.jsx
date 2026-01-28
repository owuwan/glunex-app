import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { User, Check, X, Loader2, RefreshCw, Calendar, Lock, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const Admin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // [신규] 검색 및 페이징 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const handleAdminLogin = () => {
    if (password === 'chol5622729') { 
      setIsAdmin(true);
      fetchUsers();
    } else {
      alert('비밀번호가 틀렸습니다.');
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const userList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        let expiryDate = null;
        if (data.membershipExpiry) {
          expiryDate = data.membershipExpiry.toDate(); 
        }
        return { id: doc.id, ...data, expiryDate };
      });
      // 최신 가입순 정렬 (createdAt이 있다면 사용, 없으면 이름순)
      setUsers(userList);
    } catch (error) {
      console.error("유저 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId, months, currentExpiry) => {
    try {
      const userRef = doc(db, "users", userId);
      let baseDate = new Date();
      if (currentExpiry && currentExpiry > new Date()) {
        baseDate = currentExpiry;
      }
      const newExpiry = new Date(baseDate);
      newExpiry.setMonth(newExpiry.getMonth() + months);

      await updateDoc(userRef, {
        userStatus: 'approved',
        membershipExpiry: newExpiry
      });
      alert(`${months}개월 승인/연장 완료!`);
      fetchUsers();
    } catch (error) {
      alert("오류가 발생했습니다.");
    }
  };

  const revokeUser = async (userId) => {
    if(!window.confirm("정말 해지하시겠습니까?")) return;
    try {
      await updateDoc(doc(db, "users", userId), {
        userStatus: 'free',
        membershipExpiry: null
      });
      fetchUsers();
    } catch (error) { console.error(error); }
  };

  // [신규] 검색 필터링 로직
  const filteredUsers = users.filter(user => 
    (user.storeName && user.storeName.includes(searchTerm)) ||
    (user.ownerName && user.ownerName.includes(searchTerm)) ||
    (user.phone && user.phone.includes(searchTerm))
  );

  // [신규] 페이지네이션 로직
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (!isAdmin) {
    return (
      <div className="flex h-screen bg-slate-100 items-center justify-center font-noto">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
          <div className="flex justify-center mb-4 text-slate-800"><Lock size={40} /></div>
          <h2 className="text-xl font-black text-center mb-6 text-slate-900">관리자 접속</h2>
          <input 
            type="password" 
            placeholder="관리자 비밀번호"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4 outline-none focus:border-slate-900"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
          />
          <button onClick={handleAdminLogin} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold active:scale-95 transition-all">접속하기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-noto">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            파트너 관리 <span className="text-sm font-medium text-slate-500 bg-white px-2 py-1 rounded-lg border">총 {users.length}명</span>
          </h1>
          <div className="flex gap-2 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="상호명, 이름, 전화번호 검색" 
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-slate-900"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
             </div>
             <button onClick={fetchUsers} className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-100"><RefreshCw size={20}/></button>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? <div className="text-center py-10"><Loader2 className="animate-spin inline mr-2"/>데이터 로딩중...</div> : 
           currentUsers.length > 0 ? currentUsers.map(user => (
            <div key={user.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg">{user.storeName || '상호미정'}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${user.userStatus === 'approved' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {user.userStatus === 'approved' ? '프리미엄' : '무료체험'}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{user.ownerName} | {user.phone}</p>
                <p className="text-xs text-slate-400 mb-1">{user.email}</p>
                {user.expiryDate && (
                  <p className="text-xs font-bold text-blue-600 flex items-center gap-1">
                    <Calendar size={12} /> 만료일: {user.expiryDate.toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="flex bg-slate-50 p-1 rounded-xl">
                  {[1, 3, 6, 12].map(month => (
                    <button 
                      key={month}
                      onClick={() => approveUser(user.id, month, user.expiryDate)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded-lg transition-all"
                    >
                      +{month}개월
                    </button>
                  ))}
                </div>
                {user.userStatus === 'approved' && (
                  <button onClick={() => revokeUser(user.id)} className="bg-red-50 text-red-500 px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors">해지</button>
                )}
              </div>
            </div>
          )) : (
            <div className="text-center py-20 text-slate-400">검색 결과가 없습니다.</div>
          )}
        </div>

        {/* 페이지네이션 UI */}
        {totalPages > 1 && (
           <div className="flex justify-center items-center gap-4 py-8">
             <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-full bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={20} /></button>
             <span className="text-sm font-bold text-slate-600">{currentPage} / {totalPages}</span>
             <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-full bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50"><ChevronRight size={20} /></button>
           </div>
        )}
      </div>
    </div>
  );
};

export default Admin;