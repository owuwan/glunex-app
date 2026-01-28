import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { User, Check, X, Loader2, RefreshCw } from 'lucide-react';

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 유저 목록 불러오기
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const userList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userList);
    } catch (error) {
      console.error("유저 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 승인 처리 함수
  const updateUserStatus = async (userId, newStatus, storeName) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        userStatus: newStatus // DB에 상태 업데이트
      });
      alert(`[${storeName}] 사장님을 ${newStatus === 'approved' ? '프리미엄' : '무료'} 상태로 변경했습니다.`);
      fetchUsers(); // 목록 새로고침
    } catch (error) {
      console.error("업데이트 실패:", error);
      alert("오류가 발생했습니다.");
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center gap-2"><Loader2 className="animate-spin" /> 데이터 로딩중...</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-noto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-slate-900">관리자 페이지 (파트너 승인)</h1>
        <button onClick={fetchUsers} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100"><RefreshCw size={20}/></button>
      </div>

      <div className="space-y-4 max-w-2xl mx-auto">
        {users.map(user => (
          <div key={user.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg">{user.storeName || '상호미정'}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${user.userStatus === 'approved' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                  {user.userStatus === 'approved' ? '프리미엄' : '무료체험'}
                </span>
              </div>
              <p className="text-sm text-slate-500">{user.ownerName} | {user.phone}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
            <div className="flex gap-2">
              {user.userStatus !== 'approved' ? (
                <button 
                  onClick={() => updateUserStatus(user.id, 'approved', user.storeName)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-1"
                >
                  <Check size={16} /> 승인
                </button>
              ) : (
                <button 
                  onClick={() => updateUserStatus(user.id, 'free', user.storeName)}
                  className="bg-slate-200 text-slate-500 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors flex items-center gap-1"
                >
                  <X size={16} /> 해지
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