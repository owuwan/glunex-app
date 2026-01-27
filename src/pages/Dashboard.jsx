import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Crown, MessageSquare, ChevronRight, CloudRain, Sun, TrendingUp, Sparkles, Loader2, MapPin, Wallet, Bell, ArrowUpRight } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const Dashboard = () => {
  const navigate = useNavigate();
  
  const [userName, setUserName] = useState('파트너');
  const [loadingUser, setLoadingUser] = useState(true);
  
  // [수정] 초기값을 로딩 상태가 아닌 '기본값'으로 설정하여 0도/무한로딩 방지
  const [weather, setWeather] = useState({ 
    temp: 20, // 기본값 (봄/가을 평균)
    rain: 0, 
    status: 'clear', 
    region: 'Seoul', // 기본 지역
    targetCustomers: 42,
    loading: true 
  });

  const salesData = {
    today: 1250000,
    monthTotal: 45200000,
    todayGrowth: 12,
    totalGrowth: 8.5
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      let currentRegion = 'Seoul';
      let displayRegion = '서울';
      let storeName = '글루 디테일링';

      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            storeName = userData.storeName || storeName;
            
            if (userData.address) {
              const parts = userData.address.split(' ');
              // [중요] "인천 서구" -> API엔 "Incheon", 화면엔 "인천 서구"
              const cityMap = {
                '서울': 'Seoul', '부산': 'Busan', '대구': 'Daegu', '인천': 'Incheon',
                '광주': 'Gwangju', '대전': 'Daejeon', '울산': 'Ulsan', '세종': 'Sejong',
                '경기': 'Gyeonggi-do', '강원': 'Gangwon-do', '충북': 'Chungcheongbuk-do', 
                '충남': 'Chungcheongnam-do', '전북': 'Jeollabuk-do', '전남': 'Jeollanam-do', 
                '경북': 'Gyeongsangbuk-do', '경남': 'Gyeongsangnam-do', '제주': 'Jeju'
              };
              // 한글 주소 첫 단어(예: 대전)를 영문으로 변환 (매핑 없으면 그대로 사용)
              currentRegion = cityMap[parts[0]] || parts[0]; 
              displayRegion = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : parts[0];
            } else if (userData.region) {
              currentRegion = userData.region;
              displayRegion = userData.region;
            }
          }
        } catch (error) {
          console.error("유저 정보 로딩 실패:", error);
        }
      }
      
      setUserName(storeName);
      setLoadingUser(false);
      
      // 날씨 요청 (3초 타임아웃 적용)
      fetchRealWeather(currentRegion, displayRegion);
    });

    return () => unsubscribe();
  }, []);

  const fetchRealWeather = async (apiRegion, displayRegion) => {
    try {
      const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
      
      // 키가 없으면 기본값 유지하고 로딩 끝냄
      if (!API_KEY) {
        console.warn("API Key 없음");
        setWeather(prev => ({ ...prev, region: displayRegion, loading: false }));
        return;
      }

      // [핵심] 3초 안에 응답 안 오면 강제 종료 (무한로딩 방지)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(apiRegion)}&appid=${API_KEY}&units=metric&lang=kr`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error("날씨 데이터 없음");

      const data = await response.json();

      if (data.cod === 200) {
        const main = data.weather[0].main;
        const isRain = main === 'Rain' || main === 'Drizzle' || main === 'Thunderstorm' || main === 'Snow';
        const rainAmount = data.rain ? data.rain['1h'] : 0;
        
        setWeather({
          temp: Math.round(data.main.temp),
          rain: rainAmount,
          status: isRain ? 'rainy' : 'clear',
          region: displayRegion,
          targetCustomers: isRain ? 45 : 12,
          loading: false
        });
      } else {
        throw new Error("지역 못 찾음");
      }
    } catch (error) {
      console.error("날씨 로딩 실패 (기본값 사용):", error);
      // 에러 나면 "맑음 / 20도" 기본값 보여줘서 화면 안 깨지게 처리
      setWeather({ 
        temp: 20, 
        rain: 0, 
        status: 'clear', 
        region: displayRegion, 
        targetCustomers: 42, 
        loading: false 
      });
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#F8F9FB] text-slate-800 font-sans overflow-hidden max-w-md mx-auto shadow-2xl relative animate-fade-in">
      
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-blue-100/40 rounded-full blur-[80px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-slate-200/50 rounded-full blur-[80px]" />
      </div>

      {/* 헤더 */}
      <div className="relative px-6 pt-10 pb-4 z-10 flex justify-between items-center shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full" />
            <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
              GLUNEX PARTNER
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {userName}
          </h2>
        </div>

        <button 
          onClick={() => navigate('/mypage')}
          className="p-2.5 bg-white rounded-full border border-slate-200 shadow-sm active:scale-95 transition-all hover:bg-slate-50"
        >
          <User size={18} className="text-slate-600" />
        </button>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col px-5 pb-6 gap-3 z-10 min-h-0">
        
        {/* 상단 블록 */}
        <div className="flex gap-3 h-[32%] shrink-0">
          
          {/* 매출 카드 */}
          <button 
            onClick={() => navigate('/sales')}
            className="flex-[1.8] bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group active:scale-[0.98] transition-all flex flex-col justify-between text-left"
          >
            <div className="relative z-10 w-full">
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="p-1 rounded bg-slate-100 text-slate-500">
                  <Wallet size={12} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Total Sales (Month)
                </span>
              </div>
              
              <div className="flex items-baseline gap-1 mb-0.5">
                <span className="text-2xl font-black text-slate-900 tracking-tighter leading-none">
                  {salesData.monthTotal.toLocaleString()}
                </span>
                <span className="text-sm font-bold text-slate-400">원</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-slate-400">전월대비</span>
                <div className="bg-red-50 text-red-500 text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                   <TrendingUp size={10} /> {salesData.totalGrowth}%
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-slate-100 my-1" />

            <div className="relative z-10 w-full">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide flex items-center gap-1 mb-0.5">
                 Today
              </span>
              
              <div className="flex items-baseline gap-1 mb-0.5">
                <span className="text-xl font-black text-slate-800 tracking-tighter">
                  {salesData.today.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-400">원</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-slate-400">전일대비</span>
                <div className="bg-red-50 text-red-500 text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                   <TrendingUp size={10} /> {salesData.todayGrowth}%
                </div>
              </div>
            </div>
            
            <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300">
               <ArrowUpRight size={16} />
            </div>
          </button>

          {/* 날씨 카드 */}
          <div className="flex-1 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col items-center justify-between gap-1 group hover:border-blue-200 transition-colors">
             {/* 배경 아이콘 처리 */}
             {weather.status === 'rainy' ? (
                <CloudRain size={80} className="absolute -right-6 -bottom-6 text-blue-50 opacity-50 rotate-12 group-hover:scale-110 transition-transform" />
             ) : (
                <Sun size={80} className="absolute -right-6 -bottom-6 text-amber-50 opacity-50 rotate-12 group-hover:scale-110 transition-transform" />
             )}
             
             <div className="w-full flex flex-col items-center z-10 mt-1">
                <div className="text-[10px] font-medium text-slate-400 mb-1">
                  {weather.loading ? '확인 중...' : weather.region}
                </div>
                <div className="flex items-center gap-2">
                   {weather.loading ? (
                     <Loader2 className="animate-spin text-slate-400" size={24} />
                   ) : weather.temp !== null ? (
                     <>
                        <div className="text-3xl font-black text-slate-800 leading-none tracking-tight">{weather.temp}°</div>
                        {weather.status === 'rainy' ? <CloudRain size={20} className="text-blue-500" /> : <Sun size={20} className="text-amber-500" />}
                     </>
                   ) : (
                     // [수정] 날씨 로드 실패 시 보여줄 대체 화면
                     <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-slate-600">오늘도 안전운전</span>
                     </div>
                   )}
                </div>
             </div>

             <div className="z-10 w-full">
               <div className={`border rounded-lg p-2 flex flex-col items-center text-center ${weather.status === 'rainy' ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                 <div className="flex items-center gap-1 mb-0.5">
                   {weather.temp !== null ? (
                      <Bell size={8} className={weather.status === 'rainy' ? "text-blue-600 fill-blue-600" : "text-slate-400"} />
                   ) : (
                      <Sparkles size={8} className="text-amber-500 fill-amber-500" />
                   )}
                   <span className={`text-[9px] font-bold ${weather.status === 'rainy' ? 'text-blue-600' : 'text-slate-500'}`}>
                     {weather.temp === null ? '좋은 하루!' : (weather.status === 'rainy' ? '비소식 알림' : '기상 양호')}
                   </span>
                 </div>
                 <span className="text-[10px] font-black text-slate-700 tracking-tight">
                   관리 대상 <span className={`underline decoration-2 ${weather.status === 'rainy' ? 'text-blue-600' : 'text-slate-600'}`}>{weather.targetCustomers}명</span>
                 </span>
               </div>
             </div>
          </div>
        </div>

        {/* 하단 액션 버튼 */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          
          <button 
             onClick={() => navigate('/creator')}
             className="flex-1 bg-gradient-to-r from-indigo-50 to-white rounded-2xl border border-indigo-100 p-5 flex items-center justify-between relative overflow-hidden group active:scale-[0.98] transition-all shadow-sm hover:shadow-md"
          >
             <div className="absolute left-0 top-0 w-1 h-full bg-indigo-500" />
             <div className="flex flex-col items-start z-10 pl-2">
                <div className="flex items-center gap-2 mb-1">
                   <div className="p-1 rounded bg-indigo-100 text-indigo-600">
                     <Sparkles size={12} className="fill-indigo-600" />
                   </div>
                   <span className="text-base font-black text-indigo-900">AI 마케팅 에이전트</span>
                </div>
                <span className="text-[14px] text-slate-500 text-left font-medium">
                   "예약 마감 임박!" 홍보글 10초 완성
                </span>
             </div>
             <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-100 text-slate-300 shadow-sm group-hover:text-indigo-500 transition-colors">
                <ArrowUpRight size={16} />
             </div>
          </button>

          <button 
             onClick={() => navigate('/create')}
             className="flex-1 bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm hover:shadow-md hover:border-amber-200"
          >
             <div className="absolute left-0 top-0 w-1 h-full bg-amber-400" />
             <div className="flex flex-col items-start z-10 pl-2">
                <div className="flex items-center gap-2 mb-1">
                   <div className="p-1 rounded bg-amber-50 text-amber-500">
                     <Crown size={12} className="fill-amber-500" />
                   </div>
                   <span className="text-base font-black text-slate-800">보증서 발행</span>
                </div>
                <span className="text-[14px] text-slate-500 font-medium">
                   시공 보증서 및 내역 발급
                </span>
             </div>
             <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-300 shadow-sm group-hover:text-amber-500 transition-colors">
                <ArrowUpRight size={16} />
             </div>
          </button>

          <button 
             onClick={() => navigate('/marketing')}
             className="flex-1 bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm hover:shadow-md hover:border-blue-200"
          >
             <div className="absolute left-0 top-0 w-1 h-full bg-blue-500" />
             <div className="flex flex-col items-start z-10 pl-2">
                <div className="flex items-center gap-2 mb-1">
                   <div className="p-1 rounded bg-blue-50 text-blue-500">
                     <MessageSquare size={12} className="fill-blue-500" />
                   </div>
                   <span className="text-base font-black text-slate-800">마케팅 관리</span>
                </div>
                <span className="text-[14px] text-slate-500 font-medium">
                   알림톡 발송 및 고객 관리
                </span>
             </div>
             <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-300 shadow-sm group-hover:text-blue-500 transition-colors">
                <ArrowUpRight size={16} />
             </div>
          </button>
          
        </div>

        {/* 하단 카피라이트 */}
        <div className="text-center pt-1 shrink-0">
           <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">
              Powered by GLUNEX AI
           </p>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;