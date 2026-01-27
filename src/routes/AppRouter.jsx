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
import WarrantyViewer from '../pages/WarrantyViewer';

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

  // [테스트용] 'free'를 'approved'로 바꾸면 유료회원 모드가 됩니다.
  const [userStatus, setUserStatus] = useState('free'); 
  const showToast = (msg) => alert(msg);

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* userStatus를 모든 주요 기능 페이지에 넘겨줍니다 */}
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
    </Routes>
  );
};

export default AppRouter;