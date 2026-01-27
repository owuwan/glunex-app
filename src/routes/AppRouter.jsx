import React, { useState } from 'react';
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
import WarrantyViewer from '../pages/WarrantyViewer'; // [추가]

const AppRouter = () => {
  // 모든 페이지에서 공유하는 데이터
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

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* 보증서 관련 */}
      <Route 
        path="/create" 
        element={<WarrantyIssue formData={formData} setFormData={setFormData} userStatus={userStatus} />} 
      />
      <Route 
        path="/warranty/result" 
        element={<WarrantyResult formData={formData} showToast={showToast} userStatus={userStatus} />} 
      />
      
      {/* 마케팅 & 매출 & AI홍보 */}
      <Route path="/marketing" element={<Marketing />} />
      <Route path="/sales" element={<Sales />} />
      <Route path="/creator" element={<Creator />} />
      
      {/* 마이페이지 */}
      <Route path="/mypage" element={<MyPage />} />

      {/* [추가] 고객용 보증서 뷰어 (로그인 없이 접근 가능) */}
      <Route path="/warranty/view/:id" element={<WarrantyViewer />} />
    </Routes>
  );
};

export default AppRouter;