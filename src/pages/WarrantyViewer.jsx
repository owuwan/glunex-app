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

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-slate-400" size={40} /></div>;
  if (error || !data) return <div className="h-screen flex flex-col items-center justify-center text-slate-500 bg-slate-50"><AlertCircle size={40} className="mb-2"/><p>존재하지 않거나 만료된 보증서입니다.</p></div>;

  const isCareType = ['wash', 'detailing'].includes(data.serviceType);
  const getCardHeader = () => { 
    switch (data.serviceType) { 
      case 'coating': return "Certified Coating"; 
      case 'tinting': return "Certified Tinting"; 
      default: return "Premium Care Service"; 
    } 
  };

  // 금액 포맷팅 (콤마 추가)
  const formatPrice = (price) => {
    if (!price) return "0";
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FB] animate-fade-in font-noto">
      <div className="p-6 pb-10 flex flex-col items-center">
        
        {/* 상단 인증 마크 */}
        <div className="mb-8 text-center w-full mt-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-full border border-amber-100 mb-3 shadow-sm">
            <Crown size={12} className="text-amber-500 fill-amber-500" />
            <span className="text-amber-600 text-[10px] font-bold tracking-widest uppercase">Official Certification</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">정품 시공 보증서</h2>
          <p className="text-xs text-slate-400 mt-1">본 문서는 GLUNEX 파트너가 발행한 정식 보증서입니다.</p>
        </div>

        {/* 보증서 카드 (사장님 미리보기와 100% 동일 디자인) */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 mb-6">
          <div className="p-6 bg-slate-900 text-center pb-8 rounded-b-[2rem] relative z-10">
            <h3 className="text-amber-400 font-serif font-bold text-lg mb-4 tracking-widest">GLUNEX CERTIFICATE</h3>
            
            <div className="relative w-full aspect-[1.58/1] bg-black rounded-xl overflow-hidden shadow-2xl mx-auto border border-slate-700">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black"></div>
              <div className="absolute top-0 left-6 w-[1px] h-full bg-gradient-to-b from-transparent via-amber-500/50 to-transparent"></div>
              
              <div className="relative z-10 p-5 flex flex-col h-full justify-between text-white text-left">
                {/* 카드 상단: 로고 & 금액 */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Crown size={14} className="text-amber-400" fill="currentColor" />
                    <span className="text-amber-400 font-serif font-bold tracking-widest text-xs uppercase">Glunex Official</span>
                  </div>
                  {/* [중요] 고객에게는 '보증 금액'을 보여줍니다 */}
                  <div className="text-right">
                    <p className="text-[7px] text-slate-500 uppercase tracking-widest mb-0.5">Warranty Value</p>
                    <p className="text-xs font-bold text-amber-200">₩ {formatPrice(data.warrantyPrice)}</p>
                  </div>
                </div>

                {/* 카드 중단: 상품명 & 번호판 */}
                <div className="pl-5 mt-1">
                  <p className="text-[8px] text-amber-500/80 uppercase tracking-widest mb-0.5">{getCardHeader()}</p>
                  <h3 className="text-lg font-bold text-white tracking-wide truncate mb-1">{data.productName}</h3>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300 border border-white/5">{data.plateNumber}</span>
                </div>

                {/* 카드 하단: 차주 & 기간 */}
                <div className="flex justify-between items-end pl-5">
                  <div>
                    <p className="text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">Owner / Model</p>
                    <p className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                      {data.customerName} <span className="text-slate-500 mx-1">|</span> {data.carModel}
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

          {/* 하단 상세 가이드 */}
          <div className="p-4 bg-slate-50 -mt-4 pt-8 space-y-2">
            <div className="px-2 pb-2">
              <p className="text-slate-900 font-bold text-sm mb-1">안녕하세요, {data.customerName}님.</p>
              <p className="text-slate-500 text-xs leading-relaxed">
                {isCareType 
                  ? "GLUNEX 프리미엄 케어를 받으셨습니다. 차량의 최상 컨디션 유지를 위한 관리 가이드를 확인해 주세요." 
                  : "GLUNEX 정품 시공이 완료되었습니다. 본 보증서는 대물 사고 시 보험사로부터 재시공 비용을 보상받을 수 있는 정식 증빙 서류입니다."}
              </p>
            </div>
            
            <AccordionItem icon={Wrench} title="사후 관리 가이드 (Maintenance)">
              <div className="space-y-3 text-xs text-slate-500 leading-relaxed">
                <p>• <strong>세차 주의사항:</strong> 시공 후 최소 7일간은 고압 세차 및 자동 세차를 피해주십시오. (완전 경화 기간)</p>
                <p>• <strong>권장 세차법:</strong> 도장면 보호를 위해 <strong>중성 카샴푸</strong> 사용을 권장하며, 과도한 마찰을 피해주십시오.</p>
                <p>• <strong>오염물 제거:</strong> 새 배설물, 나무 수액 등 산성 오염물은 코팅층을 파고들 수 있으니 발견 즉시 제거해 주세요.</p>
              </div>
            </AccordionItem>

            {!isCareType && (
              <>
                <AccordionItem icon={AlertCircle} title="보증 적용 범위 (Coverage)">
                  <div className="space-y-3 text-xs text-slate-500 leading-relaxed">
                    <p>• <strong>보증 대상:</strong> 정상적인 관리 상태에서 발생하는 코팅층의 갈라짐, 박리, 변색 및 광택 저하를 보증합니다.</p>
                    <p>• <strong>제외 사항:</strong> 외부 충격(스톤칩, 사고), 천재지변, 고의적 파손, 비전문가의 약재 사용으로 인한 손상은 제외됩니다.</p>
                  </div>
                </AccordionItem>
                <AccordionItem icon={AlertTriangle} title="사고 발생 시 보증 처리 (Insurance)">
                  <div className="space-y-3 text-xs text-slate-500 leading-relaxed">
                    <p>• <strong>보험 수리:</strong> 상대방 과실로 인한 사고 시, 본 보증서를 보험사에 제출하면 <strong>시공 비용 전액을 보상</strong>받을 수 있습니다.</p>
                    <p>• <strong>재시공 절차:</strong> 사고 수리(판금/도색)가 끝난 후 보증서를 지참하여 시공점에 방문해 주시면 해당 부위 재시공을 해드립니다.</p>
                  </div>
                </AccordionItem>
              </>
            )}
            
            <div className="mt-6 pb-4 text-center border-t border-slate-100 pt-4">
              <p className="text-slate-400 text-[10px]">© GLUNEX Corp. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarrantyViewer;