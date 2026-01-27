import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ShieldCheck } from 'lucide-react';

const Input = ({ label, placeholder, type = "text", value, onChange, readOnly }) => (
  <div className="mb-4">
    <label className="block text-slate-400 text-[10px] mb-1.5 font-bold uppercase ml-1">{label}</label>
    <input 
      type={type} 
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      className={`w-full border border-slate-200 rounded-2xl p-4 text-sm outline-none transition-all font-medium ${readOnly ? 'bg-slate-100 cursor-not-allowed' : 'bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500'}`} 
      placeholder={placeholder} 
    />
  </div>
);

const Register = () => {
  const navigate = useNavigate();
  
  // 1. 매장 유형 옵션 리스트
  const shopOptions = ["세차", "디테일링", "하부세차", "유리막코팅", "썬팅", "네비게이션", "블랙박스"];

  // 2. 입력 데이터 상태 (shopTypes 추가됨)
  const [signupData, setSignupData] = useState({
    storeName: '',
    ownerName: '',
    userId: '',
    password: '',
    phone: '',
    address: '',
    region: '',
    shopTypes: [] // 사장님이 선택한 업종들이 담길 바구니
  });

  // 3. 매장 유형 클릭 시 넣고 빼는 함수
  const toggleShopType = (type) => {
    setSignupData(prev => ({
      ...prev,
      shopTypes: prev.shopTypes.includes(type) 
        ? prev.shopTypes.filter(t => t !== type) 
        : [...prev.shopTypes, type]
    }));
  };

  // 카카오 주소 검색 실행 함수
  const handleAddressSearch = () => {
    new window.daum.Postcode({
      oncomplete: function(data) {
        setSignupData({
          ...signupData,
          address: data.address,
          region: data.sigungu 
        });
      }
    }).open();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in font-noto">
      <div className="px-6 py-6 flex items-center gap-4 bg-white border-b border-slate-100">
        <button onClick={() => navigate('/login')} className="text-slate-400"><ChevronRight size={24} className="rotate-180" /></button>
        <h2 className="text-lg font-black text-slate-900">파트너 가입</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto px-6 py-8 pb-32">
        <div className="mb-8 flex items-center gap-3 bg-blue-600 p-6 rounded-3xl text-white shadow-lg shadow-blue-200">
          <ShieldCheck size={40} />
          <div>
            <p className="font-black text-lg">GLUNEX Partner</p>
            <p className="text-blue-100 text-xs font-medium">정식 파트너쉽 신청을 시작합니다.</p>
          </div>
        </div>

        {/* 4. 매장 유형 선택 UI 섹션 */}
        <div className="mb-8">
          <label className="block text-slate-400 text-[10px] mb-3 font-bold uppercase ml-1">매장 전문 분야 (복수 선택 가능)</label>
          <div className="flex flex-wrap gap-2">
            {shopOptions.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => toggleShopType(type)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all ${
                  signupData.shopTypes.includes(type) 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Input label="매장명" placeholder="상호명을 입력하세요" value={signupData.storeName} onChange={(e) => setSignupData({...signupData, storeName: e.target.value})} />
          <Input label="대표자명" placeholder="성함을 입력하세요" value={signupData.ownerName} onChange={(e) => setSignupData({...signupData, ownerName: e.target.value})} />
          <Input label="아이디" placeholder="사용하실 ID" value={signupData.userId} onChange={(e) => setSignupData({...signupData, userId: e.target.value})} />
          <Input label="비밀번호" type="password" placeholder="영문, 숫자 조합" value={signupData.password} onChange={(e) => setSignupData({...signupData, password: e.target.value})} />
          <Input label="연락처" placeholder="010-0000-0000" value={signupData.phone} onChange={(e) => setSignupData({...signupData, phone: e.target.value})} />
          
          <div className="mb-4">
            <label className="block text-slate-400 text-[10px] mb-1.5 font-bold uppercase ml-1">사업장 주소</label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={signupData.address}
                readOnly
                placeholder="주소 검색 버튼을 눌러주세요"
                className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl p-4 text-sm font-medium outline-none cursor-not-allowed"
              />
              <button 
                type="button"
                onClick={handleAddressSearch}
                className="bg-slate-900 text-white px-5 rounded-2xl text-xs font-bold active:scale-95 transition-all shadow-md"
              >
                검색
              </button>
            </div>
            {signupData.region && (
              <p className="text-[10px] text-blue-600 font-bold mt-2 ml-1 animate-fade-in">
                📍 {signupData.region} 지역 날씨와 연동됩니다.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-slate-100 fixed bottom-0 left-0 right-0 max-w-md mx-auto">
        <button 
          onClick={() => navigate('/dashboard')}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 active:scale-95 transition-transform"
        >
          무료 가입 완료하기
        </button>
      </div>
    </div>
  );
};

export default Register;