import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Eye, Clock, CreditCard, Save, Loader2, PlusCircle, Camera, X } from 'lucide-react';
// [중요] 위에서 생성한 파일들을 불러옵니다.
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { db, auth, storage } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const WarrantyIssue = ({ formData, setFormData, userStatus }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [serviceType, setServiceType] = useState(formData._serviceType || 'coating');
  const [previewImage, setPreviewImage] = useState(null); // 사진 미리보기
  const [imageFile, setImageFile] = useState(null); // 업로드할 파일

  const isWarrantyType = ['coating', 'tinting', 'etc'].includes(serviceType);

  const getPlaceholder = () => {
    switch (serviceType) {
      case 'coating': return "예: A사 세라믹코트";
      case 'tinting': return "예: 루마 버텍스 900";
      case 'detailing': return "예: 전체 철분제거";
      case 'wash': return "예: 내부/외부 세차";
      case 'etc': return "예: 생활보호PPF, 블랙박스";
      default: return "내용 입력";
    }
  };

  const getAmountHints = () => {
    switch (serviceType) {
      case 'coating': return { warranty: "예: 1,200,000", actual: "예: 650,000" };
      case 'tinting': return { warranty: "예: 1,100,000", actual: "예: 650,000" };
      case 'detailing': return { warranty: "예: 250,000", actual: "예: 150,000" };
      case 'wash': return { warranty: "예: 100,000", actual: "예: 55,000" };
      case 'etc': return { warranty: "예: 900,000", actual: "예: 600,000" };
      default: return { warranty: "금액 입력", actual: "금액 입력" };
    }
  };
  const amountHints = getAmountHints();

  // 사진 파일 선택 시 처리
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 사진 삭제
  const clearImage = () => {
    setPreviewImage(null);
    setImageFile(null);
  };

  const handleIssue = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("로그인이 필요한 서비스입니다.");
      return navigate('/login');
    }

    if (userStatus !== 'approved') {
      const confirmUpgrade = window.confirm("🔒 정식 보증서 발행은 '프리미엄 파트너' 전용 기능입니다.\n\n지금 멤버십을 전환하고 바로 발행하시겠습니까?");
      if (confirmUpgrade) navigate('/mypage');
      return;
    }

    if (!formData.customerName || !formData.phone || !formData.plateNumber) {
      return alert("고객명, 연락처, 차량번호는 필수입니다.");
    }

    setLoading(true);

    try {
      let imageUrl = "";

      // 1. 사진이 있다면 스토리지에 업로드
      if (imageFile) {
        // 파일명 중복 방지를 위해 시간값 추가
        const storageRef = ref(storage, `car_images/${user.uid}/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref); // 업로드된 이미지 주소 받기
      }

      // 2. DB에 저장 (이미지 주소 포함)
      const docRef = await addDoc(collection(db, "warranties"), {
        ...formData,
        userId: user.uid,
        serviceType: serviceType,
        issuedAt: new Date().toISOString(),
        carImageUrl: imageUrl, // [중요] 이미지 주소 저장
        status: 'active'
      });

      navigate('/warranty/result', { state: { warrantyId: docRef.id } });

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
        
        {/* [신규] 사진 업로드 섹션 */}
        <div className="mb-6">
          <label className="block text-slate-400 text-[10px] mb-2 font-bold uppercase ml-1">시공 차량 사진 (선택)</label>
          
          <div className="relative w-full aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden flex flex-col items-center justify-center group hover:border-blue-400 transition-colors">
            {previewImage ? (
              <>
                <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                {/* 사진 삭제 버튼 */}
                <button 
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors backdrop-blur-sm"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                {/* 숨겨진 파일 입력창 */}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-2 group-hover:scale-110 transition-transform">
                  <Camera size={24} className="text-blue-500" />
                </div>
                <p className="text-xs text-slate-400 font-bold">터치하여 사진 촬영/업로드</p>
              </>
            )}
          </div>
        </div>

        {/* 서비스 선택 그리드 */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-2 mb-2">
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
                className={`py-3.5 rounded-xl text-sm font-bold transition-all ${serviceType === item.id ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button 
            onClick={() => {
              setServiceType('etc');
              setFormData(prev => ({...prev, _serviceType: 'etc'}));
            }} 
            className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${serviceType === 'etc' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}
          >
            <PlusCircle size={16} />
            기타 작업 (랩핑, PPF, 블박 등)
          </button>
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
            <div className="flex items-center gap-2 mb-2 text-blue-600"><CreditCard size={18} /><span className="text-sm font-bold">금액 및 매출 설정</span></div>
            <Input label="보증 금액 (보증서용)" placeholder={amountHints.warranty} value={formData.warrantyPrice} onChange={(e) => setFormData({...formData, warrantyPrice: e.target.value})} />
            <Input label="실 시공 금액 (매출용)" placeholder={amountHints.actual} value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 mb-3 text-slate-600"><Clock size={18} /><span className="text-sm font-bold">마케팅 관리 주기</span></div>
            <div className="relative">
              <select value={formData.maintPeriod || "6"} onChange={(e) => setFormData({...formData, maintPeriod: e.target.value})} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium outline-none focus:border-blue-500 appearance-none transition-all">
                <option value="1">1개월 마다</option>
                <option value="3">3개월 마다</option>
                <option value="6">6개월 마다</option>
                <option value="12">1년 마다</option>
                <option value="0">알림 없음</option>
              </select>
              <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-slate-100 sticky bottom-0">
        <Button onClick={handleIssue} disabled={loading} className={loading ? "bg-slate-700" : ""}>
          {loading ? <><Loader2 className="animate-spin mr-2" size={18} />업로드 및 저장 중...</> : <><Save className="mr-2" size={18} />인증서 생성 및 매출 기록</>}
        </Button>
      </div>
    </div>
  );
};

export default WarrantyIssue;