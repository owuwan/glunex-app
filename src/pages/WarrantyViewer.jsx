import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Crown, Wrench, AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import AccordionItem from '../components/common/AccordionItem';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const WarrantyViewer = () => {
  const { id } = useParams(); // URL에서 보증서 ID 가져오기
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchWarranty = async () => {
      try {
        const docRef = doc(db, "warranties", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setData(docSnap.data());
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("보증서 조회 실패:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchWarranty();
  }, [id]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  if (error || !data) return <div className="h-screen flex flex-col items-center justify-center text-slate-500"><AlertCircle size={40} className="mb-2"/><p>보증서를 찾을 수 없습니다.</p></div>;

  const isCareType = ['wash', 'detailing'].includes(data.serviceType);
  const getCardHeader = () => { 
    switch (data.serviceType) { 
      case 'coating': return "Certified Coating"; 
      case 'tinting': return "Certified Tinting"; 
      default: return "Premium Care Service"; 
    } 
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 animate-fade-in font-noto">
      <div className="p-6 pb-10 flex flex-col items-center">
        <div className="mb-8 text-center w-full mt-8">
          <div className="inline-block px-3 py-1 bg-amber-50 rounded-full text-amber-600 text-xs font-bold mb-2 border border-amber-100">
            Official Certification
          </div>
          <h2 className="text-xl font-black text-slate-900">정품 시공 보증서</h2>
        </div>

        {/* 보증서 카드 */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 mb-6">
          <div className="p-6 bg-slate-900 text-center pb-8 rounded-b-[2rem] relative z-10">
            <h3 className="text-amber-400 font-serif font-bold text-lg mb-4 tracking-widest">GLUNEX CERTIFICATE</h3>
            <div className="relative w-full aspect-[1.58/1] bg-black rounded-xl overflow-hidden shadow-2xl mx-auto border border-slate-700">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black"></div>
              <div className="absolute top-0 left-6 w-[1px] h-full bg-gradient-to-b from-transparent via-amber-500/50 to-transparent"></div>
              
              <div className="relative z-10 p-5 flex flex-col h-full justify-between text-white text-left">
                <div className="flex items-center gap-1.5 mb-1">
                  <Crown size={14} className="text-amber-400" fill="currentColor" />
                  <span className="text-amber-400 font-serif font-bold tracking-widest text-xs uppercase">Glunex Official</span>
                </div>

                <div className="pl-5 mt-1">
                  <p className="text-[8px] text-amber-500/80 uppercase tracking-widest mb-0.5">{getCardHeader()}</p>
                  <h3 className="text-lg font-bold text-white tracking-wide truncate mb-1">{data.productName}</h3>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300 border border-white/5">{data.plateNumber}</span>
                </div>

                <div className="flex justify-between items-end pl-5">
                  <div>
                    <p className="text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">Owner</p>
                    <p className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                      {data.customerName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">{isCareType ? "Next Care" : "Expires"}</p>
                    <p className={`text-xs font-bold tracking-wide ${isCareType ? 'text-blue-400' : 'text-amber-400'}`}>
                      {isCareType ? "1 Month Later" : data.warrantyPeriod}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 -mt-4 pt-8 space-y-2">
            <div className="px-2 pb-2">
              <p className="text-slate-900 font-bold text-sm mb-1">안녕하세요, {data.customerName}님.</p>
              <p className="text-slate-500 text-xs leading-relaxed">
                {isCareType 
                  ? "GLUNEX 프리미엄 케어를 받으셨습니다. 다음 관리 시기에 맞춰 알림을 보내드립니다." 
                  : "GLUNEX 정품 시공이 완료되었습니다. 본 보증서는 사고 시 보험 처리가 가능한 정식 증빙 서류입니다."}
              </p>
            </div>
            <AccordionItem icon={Wrench} title="사후 관리 가이드 (Maintenance)">
              <div className="space-y-3 text-xs text-slate-500 leading-relaxed">
                <p>• <strong>세차 주의사항:</strong> 시공 후 최소 7일간은 고압/자동 세차를 피해주십시오.</p>
                <p>• <strong>권장 세차법:</strong> 중성 카샴푸 사용을 권장합니다.</p>
              </div>
            </AccordionItem>
            {!isCareType && (
              <>
                <AccordionItem icon={AlertCircle} title="보증 적용 범위 (Coverage)">
                  <p className="text-xs text-slate-500">정상적인 관리 상태에서의 코팅층 결함을 보증합니다.</p>
                </AccordionItem>
                <AccordionItem icon={AlertTriangle} title="사고 발생 시 보증 처리 (Insurance)">
                  <p className="text-xs text-slate-500">본 보증서를 제시하여 보험사로부터 재시공 비용을 보상받으실 수 있습니다.</p>
                </AccordionItem>
              </>
            )}
            <div className="mt-4 pb-4 text-center"><p className="text-slate-400 text-[10px]">© GLUNEX Corp. All rights reserved.</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarrantyViewer;