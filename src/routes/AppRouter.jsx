import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import PcDashboard from '../pages/pc/Dashboard';
import WarrantyIssue from '../pages/WarrantyIssue';
import WarrantyResult from '../pages/WarrantyResult';
import Marketing from '../pages/Marketing';
import PcMarketing from '../pages/pc/Marketing'; // [추가] PC 전용 마케팅 임포트
import Sales from '../pages/Sales';
import PcSales from '../pages/pc/Sales';
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
  const location = useLocation(); 
  
  const [isPc, setIsPc] = useState(window.innerWidth >= 768);

  const [formData, setFormData] = useState({
    productName: '', customerName: '', phone: '', carModel: '', plateNumber: '', price: '', warrantyPrice: '', maintPeriod: '6', _serviceType: 'coating'
  });
  const [userStatus, setUserStatus] = useState('free');

  useEffect(() => {
    const handleResize = () => setIsPc(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (location.pathname !== '/login' && location.pathname !== '/register' && !location.pathname.startsWith('/warranty/view')) {
          navigate('/login');
        }
        return;
      }

      const loginTime = localStorage.getItem('loginTime');
      const now = new Date().getTime();
      const oneDay = 24 * 60 * 60 * 1000;

      if (loginTime && (now - parseInt(loginTime) > oneDay)) {
        await signOut(auth);
        localStorage.removeItem('loginTime');
        alert("보안을 위해 24시간이 지나 로그아웃되었습니다.\n다시 로그인해주세요.");
        navigate('/login');
        return;
      }

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

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribe();
    };
  }, [navigate, location.pathname]);

  return (
    <Routes>
      <Route path="/" element={isPc ? <PcDashboard /> : <Dashboard />} />
      <Route path="/dashboard" element={isPc ? <PcDashboard /> : <Dashboard />} />
      
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/create" element={<WarrantyIssue formData={formData} setFormData={setFormData} userStatus={userStatus} />} />
      <Route path="/warranty/result" element={<WarrantyResult formData={formData} userStatus={userStatus} />} />
      
      {/* [수정] 마케팅 관리 경로: PC일 때는 PcMarketing을, 모바일일 때는 기존 Marketing을 렌더링 */}
      <Route path="/marketing" element={isPc ? <PcMarketing /> : <Marketing userStatus={userStatus} />} />
      
      <Route path="/sales" element={isPc ? <PcSales /> : <Sales />} />
      
      <Route path="/creator" element={<Creator userStatus={userStatus} />} />
      
      <Route path="/mypage" element={<MyPage userStatus={userStatus} />} />
      <Route path="/warranty/view/:id" element={<WarrantyViewer />} />
      <Route path="/chol5622729" element={<Admin />} />
    </Routes>
  );
};

export default AppRouter;