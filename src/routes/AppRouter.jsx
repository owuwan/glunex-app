import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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
import Admin from '../pages/Admin';

import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const AppRouter = () => {
  const navigate = useNavigate();
  const location = useLocation(); // 현재 위치 확인용
  
  const [formData, setFormData] = useState({
    productName: '', customerName: '', phone: '', carModel: '', plateNumber: '', price: '', warrantyPrice: '', maintPeriod: '6', _serviceType: 'coating'
  });
  const [userStatus, setUserStatus] = useState('free');
  const showToast = (msg) => alert(msg);

  useEffect(() => {
    // 1. 파이어베이스 인증 상태 감시
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // (1) 로그인이 안 된 경우
      if (!user) {
        // 현재 페이지가 로그인/회원가입/고객뷰어 페이지가 아니라면 -> 로그인으로 쫓아냄
        if (location.pathname !== '/login' && location.pathname !== '/register' && !location.pathname.startsWith('/warranty/view')) {
          navigate('/login');
        }
        return;
      }

      // (2) 로그인이 된 경우 -> 24시간 만료 체크
      const loginTime = localStorage.getItem('loginTime');
      const now = new Date().getTime();
      const oneDay = 24 * 60 * 60 * 1000; // 24시간

      if (loginTime && (now - parseInt(loginTime) > oneDay)) {
        // 시간 초과 시 강제 로그아웃
        await signOut(auth);
        localStorage.removeItem('loginTime');
        alert("보안을 위해 24시간이 지나 로그아웃되었습니다.\n다시 로그인해주세요.");
        navigate('/login');
        return;
      }

      // (3) 회원 정보(등급) 가져오기
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.userStatus) setUserStatus(userData.userStatus);
        }
      } catch (error) {
        console.error("회원 정보 확인 실패", error);
      }
    });

    return () => unsubscribe();
  }, [navigate, location.pathname]); // 주소가 바뀔 때마다 체크

  return (
    <Routes>
      {/* 기본 경로 접속 시에도 로그인 체크에 의해 처리됨 */}
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/create" element={<WarrantyIssue formData={formData} setFormData={setFormData} userStatus={userStatus} />} />
      <Route path="/warranty/result" element={<WarrantyResult formData={formData} showToast={showToast} userStatus={userStatus} />} />
      
      <Route path="/marketing" element={<Marketing userStatus={userStatus} />} />
      <Route path="/sales" element={<Sales />} />
      <Route path="/creator" element={<Creator userStatus={userStatus} />} />
      
      <Route path="/mypage" element={<MyPage userStatus={userStatus} />} />
      <Route path="/warranty/view/:id" element={<WarrantyViewer />} />
      <Route path="/chol5622729" element={<Admin />} />
    </Routes>
  );
};

export default AppRouter;
