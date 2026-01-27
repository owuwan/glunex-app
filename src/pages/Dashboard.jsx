import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Crown, MessageSquare, ChevronRight, CloudRain, Sun, TrendingUp, Sparkles, Loader2, MapPin, Wallet } from 'lucide-react';
// 파이어베이스 도구
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const Dashboard = () => {
  const navigate = useNavigate();
  
  // [상태 관리]
  const [userName, setUserName] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);
  
  // 날씨 상태 (초기값: 로딩 중)
  const [weather, setWeather] = useState({ 
    temp: 0, 
    rain: 0, 
    status: 'clear', // clear, rain
    region: '위치 확인 중...',
    loading: true 
  });

  // 매출 데이터 (UI 바인딩용 더미)
  const salesData = {
    today: 1250000,
    monthTotal: 45200000
  };

  // 1. 유저 정보 및 날씨 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      let currentRegion = 'Seoul'; // 기본값

      // (1) 로그인한 유저 정보 가져오기
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserName(userData.storeName);
            // 가입 시 저장한 지역 정보가 있다면 사용
            if (userData.region) currentRegion = userData.region;
          }
        } catch (error) {
          console.error("유저 정보 로딩 실패:", error);
        }
      }
      setLoadingUser(false);

      // (2) 해당 지역의 실시간 날씨 가져오기
      fetchRealWeather(currentRegion);
    };

    fetchData();
  }, []);

  // 2. OpenWeatherMap API 호출 함수
  const fetchRealWeather = async (regionName) => {
    try {
      const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
      
      // API 키가 없을 경우 (안전 장치)
      if (!API_KEY) {
        console.warn("날씨 API 키가 설정되지 않았습니다.");
        setWeather({ temp: 20, rain: 0, status: 'clear', region: regionName, loading: false });
        return;
      }

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${regionName}&appid=${API_KEY}&units=metric&lang=kr`
      );
      
      const data = await response.json();

      if (data.cod === 200) {
        // 비 또는 눈이 오는지 체크
        const mainWeather = data.weather[0].main;
        const isRain = mainWeather === 'Rain' || mainWeather === 'Drizzle' || mainWeather === 'Thunderstorm' || mainWeather === 'Snow';
        const rainAmount = data.rain ? data.rain['1h'] : 0; // 1시간 강수량
        
        setWeather({
          temp: Math.round(data.main.temp),
          rain: rainAmount,
          status: isRain ? 'rainy' : 'clear',
          region: regionName,
          loading: false
        });
      } else {
        // 지역을 못 찾았거나 에러인 경우
        setWeather(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error("날씨 API 호출 에러:", error);
      setWeather(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 font-noto animate-fade-in overflow-hidden">
      
      {/* 1. [상단 화이트 박스] 브랜드, 프로필, 현황 카드 */}
      <div className="bg-white px-8 pt-10 pb-8 rounded-b-[2.5rem] shadow-sm z-10">
        
        {/* 헤더: 로고 및 마이페이지 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <span className="text-[11px] font-black text-[#D4AF37] uppercase tracking-wider">GLUNEX</span>
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">PARTNER</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 leading-tight tracking-tight">
              {loadingUser ? '로딩중...' : (userName || '글루 디테일링')}
            </h2>
          </div>
          <button 
            onClick={() => navigate('/mypage')}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 group-active:scale-95 transition-all shadow-sm">
              <User size={24} />
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase">마이페이지</span>
          </button>
        </div>

        {/* 상단 현황 카드 그리드 (날씨 & 매출) */}
        <div className="grid grid-cols-5 gap-4">
          
          {/* (1) 날씨 카드: 실시간 데이터 연동 */}
          <div className="col-span-2 bg-slate-800 rounded-[2rem] p-5 text-white relative overflow-hidden flex flex-col justify-center min-h-[110px]">
            {weather.loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-[10px]">날씨 확인중</span>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-bold text-slate-400 mb-2 flex items-center gap-1">
                  <MapPin size={10} /> {weather.region}
                </p>
                <div className="flex items-center gap-2 relative z-10">
                  {weather.status === 'rainy' ? (
                    <CloudRain size={24} className="text-blue-400" />
                  ) : (
                    <Sun size={24} className="text-amber-400" />
                  )}
                  <span className="text-3xl font-black italic tracking-tighter">{weather.temp}°</span>
                </div>
                {/* 배경 장식 아이콘 */}
                {weather.status === 'rainy' ? (
                  <CloudRain size={80} className="absolute right-[-15px] bottom-[-15px] opacity-10" />
                ) : (
                  <Sun size={80} className="absolute right-[-15px] bottom-[-15px] opacity-10" />
                )}
                {/* 강수량 표시 (비 올 때만) */}
                {weather.rain > 0 && (
                  <span className="absolute top-4 right-4 text-[9px] text-blue-300 font-bold bg-blue-900/50 px-1.5 py-0.5 rounded-md">
                    {weather.rain}mm
                  </span>
                )}
              </>
            )}
          </div>

          {/* (2) 매출 카드: 페이지 이동 연동 */}
          <button 
            onClick={() => navigate('/sales')}
            className="col-span-3 bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 text-left active:scale-95 transition-all flex flex-col justify-center min-h-[110px] relative overflow-hidden"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <div className="p-1 rounded-md bg-blue-50 text-blue-600">
                <Wallet size={12} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Today Sales</p>
            </div>
            
            <div className="flex items-center justify-between relative z-10">
              <span className="text-2xl font-black text-slate-900 tracking-tighter">
                {salesData.today.toLocaleString()}
              </span>
              <ChevronRight size={20} className="text-slate-300" />
            </div>
            
            {/* 전일 대비 상승 표시 (데코레이션) */}
            <div className="absolute right-4 bottom-4 flex items-center gap-1 text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
              <TrendingUp size={10} /> 12%
            </div>
          </button>
        </div>
      </div>

      {/* 2. [하단 그레이 박스 영역] 기능 실행 버튼들 */}
      <div className="flex-1 px-6 pt-6 pb-6 space-y-4 overflow-y-auto flex flex-col">
        
        {/* AI 홍보글 배너 */}
        <button 
          onClick={() => navigate('/creator')}
          className="w-full bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-200/50 relative overflow-hidden text-left active:scale-95 transition-all"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <Sparkles size={20} className="text-white" />
              </div>
              <span className="text-[11px] font-black text-blue-100 uppercase tracking-widest">AI Marketing</span>
            </div>
            <p className="text-2xl font-black mb-1.5">AI 홍보글 작성하기</p>
            <p className="text-xs text-blue-100 opacity-90 font-medium">블로그, 인스타 포스팅을 10초 만에!</p>
          </div>
          <Sparkles size={140} className="absolute right-[-30px] top-[-30px] text-white/10" />
        </button>

        {/* 주요 실행 버튼 그리드 */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/create')}
            className="bg-white p-8 rounded-[2.8rem] shadow-sm text-center active:scale-95 transition-all flex flex-col items-center gap-4 border border-white"
          >
            <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-amber-400 shadow-lg shadow-slate-200">
              <Crown size={32} />
            </div>
            <p className="text-base font-black text-slate-900">보증서 발행</p>
          </button>

          <button 
            onClick={() => navigate('/marketing')}
            className="bg-white p-8 rounded-[2.8rem] shadow-sm text-center active:scale-95 transition-all flex flex-col items-center gap-4 border border-white"
          >
            <div className="w-16 h-16 bg-blue-50 rounded-[1.5rem] flex items-center justify-center text-blue-600 border border-blue-100">
              <MessageSquare size={32} />
            </div>
            <p className="text-base font-black text-slate-900">마케팅 관리</p>
          </button>
        </div>

        {/* 하단 카피라이트 */}
        <div className="mt-auto pt-6 pb-2 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Powered by GLUNEX AI</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;