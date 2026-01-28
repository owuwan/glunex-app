import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Crown, Wrench, AlertCircle, AlertTriangle, Loader2, Store, Phone } from 'lucide-react';
import AccordionItem from '../components/common/AccordionItem';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const WarrantyViewer = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [shopInfo, setShopInfo] = useState({ name: 'GLUNEX Partner', phone: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchWarranty = async () => {
      try {
        // 1. 보증서 정보 가져오기
        const docRef = doc(db, "warranties", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const warrantyData = docSnap.data();
          setData(warrantyData);

          // 2. 해당 보증서를 발행한 사장님(User) 정보 가져오기
          if (warrantyData.userId) {
             const userDoc = await getDoc(doc(db, "users", warrantyData.userId));
             if(userDoc.exists()) {
                 const userData = userDoc.data();
                 setShopInfo({ name: userData.storeName, phone: userData.phone });
             }
          }
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("조회 실패:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchWarranty();
  }, [id]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-slate-400" size={40} /></div>;
  if (error || !data) return <div className="h-screen flex flex-col items-center justify-center text-slate-500 bg-slate-50"><AlertCircle size={40} className="mb-2"/><p>존재하지 않는 보증서입니다.</p></div>;

  const isCareType = ['wash', 'detailing'].includes(data.serviceType);
  const getCardHeader = () => { 
    switch (data.serviceType) { 
      case 'coating': return "Certified Coating"; 
      case 'tinting': return "Certified Tinting"; 
      default: return "Premium Care Service"; 
    } 
  };

  const formatPrice = (price) => {
    if (!price) return "0";
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FB] animate-fade-in font-noto">
      <div className="p-6 pb-10 flex flex-col items-center">
        
        <div className="mb-8 text-center w-full mt-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-full border border-amber-100 mb-3 shadow-sm">
            <Crown size={12} className="text-amber-500 fill-amber-500" />
            <span className="text-amber-600 text-[10px] font-bold tracking-widest uppercase">Official Certification</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">정품 시공 보증서</h2>
          <p className="text-xs text-slate-400 mt-1">본 문서는 GLUNEX 파트너가 발행한 정식 보증서입니다.</p>
        </div>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 mb-6">
          <div className="p-6 bg-slate-900 text-center relative z-10">
            <h3 className="text-amber-400 font-serif font-bold text-lg mb-6 tracking-widest">GLUNEX CERTIFICATE</h3>
            
            <div className="relative w-full aspect-[1.58/1] bg-black rounded-xl overflow-hidden shadow-2xl mx-auto border border-slate-700">
              {/* 배경 이미지 연동 */}
              {data.carImageUrl ? (
                <>
                  <img src={data.carImageUrl} alt="Car" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30"></div>
                </>
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black"></div>
                  <div className="absolute top-0 left-6 w-[1px] h-full bg-gradient-to-b from-transparent via-amber-500/50 to-transparent"></div>
                </>
              )}
              
              <div className="relative z-10 p-5 flex flex-col h-full justify-between text-white text-left font-noto">
                
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5">
                    <Crown size={14} className="text-amber-400" fill="currentColor" />
                    <span className="text-amber-400 font-serif font-bold tracking-widest text-xs uppercase">Glunex Official</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[7px] text-slate-300 uppercase tracking-widest mb-0.5">Warranty Value</p>
                    <p className="text-xs font-bold text-amber-200">₩ {formatPrice(data.warrantyPrice)}</p>
                  </div>
                </div>

                <div className="pl-4 border-l-2 border-amber-500/50 flex flex-col justify-center py-2">
                  <p className="text-[8px] text-amber-400 uppercase tracking-widest mb-1 shadow-black drop-shadow-md">{getCardHeader()}</p>
                  <h3 className="text-xl font-bold text-white tracking-wide truncate mb-1 leading-tight drop-shadow-lg">{data.productName}</h3>
                  <div className="flex">
                    <span className="text-[10px] bg-black/40 backdrop-blur-md px-2 py-0.5 rounded text-white border border-white/10">{data.plateNumber}</span>
                  </div>
                </div>

                <div className="flex justify-between items-end pl-4">
                  <div>
                    <p className="text-[8px] text-slate-300 uppercase tracking-wider mb-0.5">Owner / Model</p>
                    <p className="text-xs font-bold text-white tracking-wide uppercase drop-shadow-md">
                      {data.customerName} <span className="text-slate-400 mx-1">|</span> {data.carModel}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-slate-300 uppercase tracking-wider mb-0.5">{isCareType ? "Next Care" : "Expires"}</p>
                    <p className={`text-xs font-bold tracking-wide ${isCareType ? 'text-blue-300' : 'text-amber-400'} drop-shadow-md`}>
                      {isCareType ? "1 Month Later" : data.warrantyPeriod}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="p-4 bg-white space-y-4">
             <div className="px-2 pb-2 text-center">
              <p className="text-slate-900 font-bold text-sm mb-1">안녕하세요, {data.customerName}님.</p>
              <p className="text-slate-500 text-xs leading-relaxed">
                {isCareType 
                  ? "GLUNEX 프리미엄 케어를 받으셨습니다. 늘 안전운전하세요." 
                  : "GLUNEX 정품 시공이 완료되었습니다. 본 보증서는 보험 처리가 가능합니다."}
              </p>
            </div>

            {/* 시공점 정보 */}
            <div className="border border-slate-900 rounded-xl p-4 flex justify-between items-center bg-slate-50/50">
               <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1 flex items-center gap-1">
                    <Store size={10} /> Constructed by
                  </p>
                  <p className="font-black text-slate-900 text-sm">{shopInfo.name}</p>
               </div>
               <div className="text-right">
                  <a href={`tel:${shopInfo.phone}`} className="inline-flex flex-col items-end group">
                    <p className="text-[10px] text-blue-600 font-bold uppercase mb-1 flex items-center gap-1 group-hover:underline">
                       Click to Call <Phone size={10} className="fill-blue-600" />
                    </p>
                    <p className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{shopInfo.phone}</p>
                  </a>
               </div>
            </div>

            <div className="pt-2 space-y-2">
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
            </div>
            
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