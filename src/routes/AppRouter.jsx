import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import WarrantyIssue from '../pages/WarrantyIssue';
import WarrantyResult from '../pages/WarrantyResult';
import Marketing from '../pages/Marketing';
import Sales from '../pages/Sales';
import Creator from '../pages/Creator';
import Register from '../pages/Register';
import Login from '../pages/Login';
import MyPage from '../pages/MyPage';
import WarrantyViewer from '../pages/WarrantyViewer';
import Admin from '../pages/Admin'; // [추가] 어드민 페이지

// 파이어베이스 도구
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const AppRouter = () => {
  const [formData, setFormData] = useState({
    productName: '',
    customerName: '',
    phone: '',
    carModel: '',
    plateNumber: '',
    price: '',
    warrantyPrice: '',
    maintPeriod: '6',
    _serviceType: 'coating'
  });

  const [userStatus, setUserStatus] = useState('free');
  const showToast = (msg) => alert(msg);

  // [핵심] 로그인 시 DB에서 내 등급(userStatus) 확인하기
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // DB에 저장된 status가 있으면 그걸 쓰고, 없으면 free
            if (userData.userStatus) {
              setUserStatus(userData.userStatus);
            }
          }
        } catch (error) {
          console.error("회원 정보 확인 실패", error);
        }
      } else {
        setUserStatus('free');
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route 
        path="/create" 
        element={<WarrantyIssue formData={formData} setFormData={setFormData} userStatus={userStatus} />} 
      />
      <Route 
        path="/warranty/result" 
        element={<WarrantyResult formData={formData} showToast={showToast} userStatus={userStatus} />} 
      />
      
      <Route path="/marketing" element={<Marketing userStatus={userStatus} />} />
      <Route path="/sales" element={<Sales />} />
      <Route path="/creator" element={<Creator userStatus={userStatus} />} />
      
      <Route path="/mypage" element={<MyPage userStatus={userStatus} setUserStatus={setUserStatus} />} />
      
      <Route path="/warranty/view/:id" element={<WarrantyViewer />} />

      {/* [추가] 관리자 페이지 경로 (나중에 비밀번호 걸 수도 있음) */}
      <Route path="/admin" element={<Admin />} />
    </Routes>
  );
};

export default AppRouter;