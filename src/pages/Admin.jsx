import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { User, Check, X, Loader2, RefreshCw, Calendar, Lock } from 'lucide-react';

const Admin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // [관리자 로그인] 간단한 비밀번호 체크 (기본값: admin1234)
  const handleAdminLogin = () => {
    if (password === 'admin1234') { 
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
        // Firestore Timestamp를 Date 객체로 변환
        let expiryDate = null;
        if (data.membershipExpiry) {
          expiryDate = data.membershipExpiry.toDate(); 
        }
        return { id: doc.id, ...data, expiryDate };
      });
      setUsers(userList);
    } catch (error) {
      console.error("유저 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // [핵심] 기간별 승인 및 연장 함수
  const approveUser = async (userId, months, currentExpiry) => {
    try {
      const userRef = doc(db, "users", userId);
      
      // 시작일 기준 설정 (이미 유료회원이면 기존 만료일부터 연장, 아니면 오늘부터)
      let baseDate = new Date();
      if (currentExpiry && currentExpiry > new Date()) {
        baseDate = currentExpiry;
      }

      // 개월 수 더하기
      const newExpiry = new Date(baseDate);
      newExpiry.setMonth(newExpiry.getMonth() + months);

      await updateDoc(userRef, {
        userStatus: 'approved',
        membershipExpiry: newExpiry // 만료일 저장
      });

      alert(`${months}개월 승인/연장 완료! (만료일: ${newExpiry.toLocaleDateString()})`);
      fetchUsers();
    } catch (error) {
      console.error("승인 실패:", error);
      alert("오류가 발생했습니다.");
    }
  };

  // 해지 함수
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

  // 로그인 전 화면
  if (!isAdmin) {
    return (
      <div className="flex h-screen bg-slate-100 items-center justify-center font-noto">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
          <div className="flex justify-center mb-4 text-slate-800">
            <Lock size={40} />
          </div>
          <h2 className="text-xl font-black text-center mb-6 text-slate-900">관리자 접속</h2>
          <input 
            type="password" 
            placeholder="관리자 비밀번호"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4 outline-none focus:border-slate-900"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
          />
          <button onClick={handleAdminLogin} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold active:scale-95 transition-all">
            접속하기
          </button>
        </div>
      </div>
    );
  }

  // 관리자 메인 화면
  return (
    <div className="p-6 bg-slate-50 min-h-screen font-noto">
      <div className="flex justify-between items-center mb-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-black text-slate-900">파트너 관리 ({users.length}명)</h1>
        <button onClick={fetchUsers} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100"><RefreshCw size={20}/></button>
      </div>

      <div className="space-y-4 max-w-4xl mx-auto">
        {loading ? <div className="text-center py-10"><Loader2 className="animate-spin inline mr-2"/>로딩중...</div> : users.map(user => (
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
                <button 
                  onClick={() => revokeUser(user.id)}
                  className="bg-red-50 text-red-500 px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors"
                >
                  해지
                </button>
              )}
            </div>
          </div>
        ))}
        
        {users.length === 0 && <p className="text-center text-slate-400 py-10">가입된 회원이 없습니다.</p>}
      </div>
    </div>
  );
};

export default Admin;