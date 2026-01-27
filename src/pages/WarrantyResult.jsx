import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Eye, X, Crown, Wrench, AlertCircle, AlertTriangle, MessageSquare } from 'lucide-react';
import Button from '../components/common/Button';
import AccordionItem from '../components/common/AccordionItem';

const WarrantyResult = ({ formData, showToast, userStatus }) => {
  const navigate = useNavigate();
  const serviceType = formData._serviceType;
  const isCareType = ['wash', 'detailing'].includes(serviceType);
  
  const getCardHeader = () => { 
    switch (serviceType) { 
      case 'coating': return "Certified Coating"; 
      case 'tinting': return "Certified Tinting"; 
      default: return "Premium Care Service"; 
    } 
  };

  // 숫자에 콤마 찍어주는 함수
  const formatPrice = (price) => {
    if (!price) return "0";
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const sendSMS = () => {
    if (userStatus !== 'approved') {
      showToast('🔒 유료 파트너 전용 기능입니다. 마이페이지에서 승인 요청해주세요.');
      return;
    }
    window.location.href = `sms:${formData.phone}?body=Link`; 
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 animate-fade-in relative overflow-hidden">
      <div className="flex-none z-30">
        {userStatus !== 'approved' && (
          <div className="bg-slate-800 text-white px-4 py-3 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2">
              <div className="bg-amber-500 rounded-full p-1"><Eye size={12} className="text-slate-900" /></div>
              <span className="text-xs font-bold">체험 모드 (미리보기)</span>
            </div>
            <button onClick={() => navigate('/mypage')} className="text-[10px] font-bold bg-white/10 px-2 py-1 rounded">유료 전환 &rarr;</button>
          </div>
        )}

        <div className="px-6 py-4 flex items-center justify-between bg-slate-50 border-b border-slate-100">
          <button onClick={() => navigate('/create')} className="text-slate-500 flex items-center gap-1 text-sm font-medium">
            <ChevronRight size={16} className="rotate-180" /> 수정하기
          </button>
          <button onClick={() => navigate('/dashboard')} className="bg-slate-200 p-1 rounded-full text-slate-500"><X size={20} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-32">
        <div className="mb-6 text-center w-full">
          <div className="inline-block px-3 py-1 bg-green-100 rounded-full text-green-700 text-xs font-bold mb-2">발행 완료</div>
          <h2 className="text-lg font-bold text-slate-900">고객 확인용 보증서 카드</h2>
        </div>

        <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 mb-6">
          <div className="p-6 bg-slate-900 text-center pb-8 rounded-b-[2rem] relative z-10">
            <h3 className="text-amber-400 font-serif font-bold text-lg mb-4 tracking-widest">GLUNEX CERTIFICATE</h3>
            
            <div className="relative w-full aspect-[1.58/1] bg-black rounded-xl overflow-hidden shadow-2xl mx-auto border border-slate-700">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black"></div>
              <div className="absolute top-0 left-6 w-[1px] h-full bg-gradient-to-b from-transparent via-amber-500/50 to-transparent"></div>
              
              <div className="relative z-10 p-5 flex flex-col h-full justify-between text-white text-left font-noto">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Crown size={14} className="text-amber-400" fill="currentColor" />
                    <span className="text-amber-400 font-serif font-bold tracking-widest text-xs uppercase">Glunex Official</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[7px] text-slate-500 uppercase tracking-widest mb-0.5">Amount</p>
                    <p className="text-xs font-bold text-amber-200">₩ {formatPrice(formData.price)}</p>
                  </div>
                </div>

                <div className="pl-5 mt-1">
                  <p className="text-[8px] text-amber-500/80 uppercase tracking-widest mb-0.5">{getCardHeader()}</p>
                  <h3 className="text-lg font-bold text-white tracking-wide truncate mb-1">{formData.productName || "GLUNEX PREMIUM"}</h3>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300 border border-white/5">{formData.plateNumber || "차량번호 미입력"}</span>
                </div>

                <div className="flex justify-between items-end pl-5">
                  <div>
                    <p className="text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">Owner / Model</p>
                    <p className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                      {formData.customerName || "고객명"} <span className="text-slate-500 mx-1">|</span> {formData.carModel || "차종 미입력"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">{isCareType ? "Next Care" : "Expires"}</p>
                    <p className={`text-xs font-bold tracking-wide ${isCareType ? 'text-blue-400' : 'text-amber-400'}`}>
                      {isCareType ? "1 Month Later" : formData.warrantyPeriod}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 -mt-4 pt-8 space-y-2">
            <AccordionItem icon={Wrench} title="사후 관리 가이드 (Maintenance)">
              <div className="space-y-3 text-xs text-slate-500 leading-relaxed">
                <p>• <strong>세차 주의사항:</strong> 시공 후 최소 7일간은 고압 세차를 피해주십시오.</p>
                <p>• <strong>권장 세차법:</strong> 중성 카샴푸 사용을 권장하며 도장면 마찰을 최소화하십시오.</p>
              </div>
            </AccordionItem>
            {!isCareType && (
              <>
                <AccordionItem icon={AlertCircle} title="보증 적용 범위 (Coverage)">
                  <div className="space-y-3 text-xs text-slate-500 leading-relaxed">
                    <p>• 정상적인 관리 상태에서 발생하는 코팅층 균열, 박리 등을 보증합니다.</p>
                  </div>
                </AccordionItem>
                <AccordionItem icon={AlertTriangle} title="사고 발생 시 보증 처리 (Insurance)">
                  <div className="space-y-3 text-xs text-slate-500 leading-relaxed">
                    <p>• 본 보증서는 사고 시 보험사로부터 재시공 비용을 보상받는 증빙 자료입니다.</p>
                    <p>• 사고 접수 시 보증서를 제시하여 재시공 혜택을 받으시기 바랍니다.</p>
                  </div>
                </AccordionItem>
              </>
            )}
            <div className="mt-4 pb-4 text-center"><p className="text-slate-400 text-[10px]">© GLUNEX Corp. All rights reserved.</p></div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 z-40 max-w-md mx-auto shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <Button onClick={sendSMS} variant="gold">
          <MessageSquare size={18} className="mr-1" />
          <span className="font-bold">{userStatus === 'approved' ? `${formData.customerName || '고객'}님께 문자 전송` : '문자 전송 (유료 전용)'}</span>
        </Button>
      </div>
    </div>
  );
};

export default WarrantyResult;