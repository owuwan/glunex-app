import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Eye, Clock, CreditCard, Save, Loader2 } from 'lucide-react';
// 파일 경로 재확인 (상대 경로)
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { db, auth } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

const WarrantyIssue = ({ formData, setFormData, userStatus }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [serviceType, setServiceType] = useState(formData._serviceType || 'coating');
  const isWarrantyType = ['coating', 'tinting'].includes(serviceType);

  const getPlaceholder = () => {
    switch (serviceType) {
      case 'coating': return "예: A사 세라믹코트";
      case 'tinting': return "예: 루마 버텍스 900";
      case 'detailing': return "예: 전체 철분제거";
      case 'wash': return "예: 내부/외부 세차";
      default: return "내용 입력";
    }
  };

  const handleIssue = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("로그인이 필요한 서비스입니다.");
      return navigate('/login');
    }

    if (!formData.customerName || !formData.phone || !formData.plateNumber) {
      return alert("고객명, 연락처, 차량번호는 필수입니다.");
    }

    setLoading(true);

    try {
      await addDoc(collection(db, "warranties"), {
        ...formData,
        userId: user.uid,
        serviceType: serviceType,
        issuedAt: new Date().toISOString(),
        status: 'active'
      });
      navigate('/warranty/result');
    } catch (error) {
      console.error("저장 실패:", error);
      alert("보증서 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white animate-fade-in font-noto">
      {userStatus !== 'approved' && (
        <div className="bg-slate-800 text-white px-4 py-3 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500 rounded-full p-1"><Eye size={12} className="text-slate-900" /></div>
            <span className="text-xs font-bold">체험 모드 (미리보기)</span>
          </div>
          <button onClick={() => navigate('/mypage')} className="text-[10px] font-bold bg-white/10 px-2 py-1 rounded">유료 전환 &rarr;</button>
        </div>
      )}
      
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4 pt-4">
        <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-slate-900"><ChevronRight size={24} className="rotate-180" /></button>
        <h2 className="text-lg font-bold text-slate-900">서비스 인증 발행</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-20">
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-2 rounded-xl mb-6">
          {[
            { id: 'coating', label: '유리막 코팅' },
            { id: 'tinting', label: '썬팅' },
            { id: 'detailing', label: '디테일링' },
            { id: 'wash', label: '일반 세차' }
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => {
                setServiceType(item.id);
                setFormData(prev => ({...prev, _serviceType: item.id}));
              }} 
              className={`py-3 rounded-lg text-sm font-bold transition-all ${serviceType === item.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Input label={isWarrantyType ? "시공 제품명" : "서비스 명"} placeholder={getPlaceholder()} value={formData.productName} onChange={(e) => setFormData({...formData, productName: e.target.value})} />
            <Input label="고객명" placeholder="성함" value={formData.customerName} onChange={(e) => setFormData({...formData, customerName: e.target.value})} />
            <Input label="연락처" placeholder="010-0000-0000" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            <Input label="차종" placeholder="예: 쏘렌토" value={formData.carModel} onChange={(e) => setFormData({...formData, carModel: e.target.value})} />
            <Input label="차량번호" placeholder="12가 3456" value={formData.plateNumber} onChange={(e) => setFormData({...formData, plateNumber: e.target.value})} />
          </div>

          <hr className="my-6 border-slate-100" />

          <div className="bg-blue-50/30 p-4 rounded-2xl border border-blue-50 space-y-4">
            <div className="flex items-center gap-2 mb-2 text-blue-600">
              <CreditCard size={18} />
              <span className="text-sm font-bold">금액 및 매출 설정</span>
            </div>
            <Input 
              label="보증 금액 (보증서 노출용)" 
              placeholder="예: 900,000 (숫자만)" 
              value={formData.warrantyPrice} 
              onChange={(e) => setFormData({...formData, warrantyPrice: e.target.value})} 
            />
            <Input 
              label="실 시공 금액 (매출 통계용)" 
              placeholder="예: 650,000 (숫자만)" 
              value={formData.price} 
              onChange={(e) => setFormData({...formData, price: e.target.value})} 
            />
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 mb-3 text-slate-600">
              <Clock size={18} />
              <span className="text-sm font-bold">마케팅 관리 주기</span>
            </div>
            <div className="relative">
              <select 
                value={formData.maintPeriod || "6"}
                onChange={(e) => setFormData({...formData, maintPeriod: e.target.value})}
                className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium outline-none focus:border-blue-500 appearance-none transition-all"
              >
                <option value="1">1개월 마다 관리 문자</option>
                <option value="3">3개월 마다 관리 문자</option>
                <option value="6">6개월 마다 관리 문자</option>
                <option value="12">1년 마다 관리 문자</option>
                <option value="0">관리 문자 안 함</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronRight size={18} className="rotate-90" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 px-1 leading-relaxed">
              * 설정한 개월 수가 지나면 마케팅 센터 명단에 자동으로 등록됩니다.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-slate-100 sticky bottom-0">
        <Button onClick={handleIssue} disabled={loading} className={loading ? "bg-slate-700" : ""}>
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2" size={18} />
              저장 중...
            </>
          ) : (
            <>
              <Save className="mr-2" size={18} />
              인증서 생성 및 매출 기록
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default WarrantyIssue;