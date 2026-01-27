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

  const [userStatus, setUserStatus] = useState('free'); // 초기 상태
  const showToast = (msg) => alert(msg);

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/create" element={<WarrantyIssue formData={formData} setFormData={setFormData} userStatus={userStatus} />} />
      <Route path="/warranty/result" element={<WarrantyResult formData={formData} showToast={showToast} userStatus={userStatus} />} />
      
      <Route path="/marketing" element={<Marketing />} />
      <Route path="/sales" element={<Sales />} />
      <Route path="/creator" element={<Creator />} />
      
      {/* [수정] 마이페이지에 등급을 변경할 수 있는 권한(함수)을 넘겨줍니다 */}
      <Route path="/mypage" element={<MyPage userStatus={userStatus} setUserStatus={setUserStatus} />} />
      
      <Route path="/warranty/view/:id" element={<WarrantyViewer />} />
    </Routes>
  );
};

export default AppRouter;