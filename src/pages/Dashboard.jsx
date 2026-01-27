import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Crown, MessageSquare, ChevronRight, CloudRain, Sun, TrendingUp, Sparkles, Loader2, MapPin } from 'lucide-react';
// 파이어베이스 도구
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const Dashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  
  // 날씨 상태 (초기값은 로딩 중)
  const [weather, setWeather] = useState({ 
    temp: 0, 
    rain: 0, 
    status: 'clear', // clear, rain, clouds, snow
    region: '위치 확인 중...',
    loading: true 
  });

  // [핵심] 유저 정보 가져오기 -> 날씨 조회하기
  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return; // 비로그인 상태면 패스

      try {
        // 1. 파이어베이스에서 사장님 지역(region) 가져오기
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserName(userData.storeName);
          
          const region = userData.region || 'Seoul'; // 지역 없으면 서울 기본값
          fetchRealWeather(region); // 날씨 함수 실행
        }
      } catch (error) {
        console.error("정보 로딩 실패:", error);
      }
    };

    fetchData();
  }, []);

  // [핵심] 진짜 날씨 가져오는 함수 (OpenWeatherMap)
  const fetchRealWeather = async (regionName) => {
    try {
      const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
      if (!API_KEY) {
        console.warn("날씨 API 키가 없습니다.");
        // API 키가 없을 때 기본값 처리
        setWeather({
          temp: 20,
          rain: 0,
          status: 'clear',
          region: regionName,
          loading: false
        });
        return;
      }

      // 1. 도시 이름으로 날씨 요청 (한국어 지원)
      // regionName에서 '구' 단위만 추출하거나 영문 변환이 필요할 수 있으나, 
      // OpenWeatherMap은 한글 도시명도 일부 지원합니다.
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${regionName}&appid=${API_KEY}&units=metric&lang=kr`
      );
      
      if (!response.ok) throw new Error("날씨 데이터 호출 실패");
      
      const data = await response.json();

      // 2. 데이터 가공
      const isRain = data.weather[0].main === 'Rain' || data.weather[0].main === 'Drizzle' || data.weather[0].main === 'Thunderstorm';
      const rainAmount = data.rain ? data.rain['1h'] : 0; // 1시간 강수량
      
      setWeather({
        temp: Math.round(data.main.temp), // 반올림 온도
        rain: rainAmount,
        status: isRain ? 'rainy' : 'clear',
        region: regionName,
        loading: false
      });
      
    } catch (error) {
      console.error("날씨 로딩 실패:", error);
      // 에러 시 기본값 표시
      setWeather(prev => ({ 
        ...prev, 
        region: regionName, 
        status: 'clear',
        temp: 0,
        loading: false 
      }));
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 font-noto animate-fade-in overflow-hidden">
      {/* 1. 상단 현황 섹션 */}
      <div className="bg-white px-8 pt-8 pb-6 rounded-b-[2.5rem] shadow-sm z-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Glunex Partner</p>
            <h2 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">
              {userName || '파트너'} 사장님
            </h2>
          </div>
          <button 
            onClick={() => navigate('/mypage')}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 group-active:scale-95 transition-all shadow-sm">
              <User size={22} />
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase">마이페이지</span>
          </button>
        </div>

        {/* 현황 카드 그리드 */}
        <div className="grid grid-cols-5 gap-3">
          {/* 날씨 카드 (진짜 데이터 연동) */}
          <div className="col-span-2 bg-slate-800 rounded-2xl p-4 text-white relative overflow-hidden flex flex-col justify-center min-h-[90px]">
            {weather.loading ? (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-[10px]">로딩중..</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1 mb-1">
                  <MapPin size={10} className="text-slate-400" />
                  <p className="text-[9px] font-bold text-slate-400">{weather.region}</p>
                </div>
                <div className="flex items-center gap-2 relative z-10">
                  {weather.status === 'rainy' ? (
                    <CloudRain size={20} className="text-blue-400" />
                  ) : (
                    <Sun size={20} className="text-amber-400" />
                  )}
                  <div>
                    <span className="text-xl font-black italic tracking-tighter">{weather.temp}°</span>
                    {weather.rain > 0 && <span className="text-[9px] block text-blue-300">{weather.rain}mm</span>}
                  </div>
                </div>
                {/* 배경 장식 */}
                {weather.status === 'rainy' ? (
                  <CloudRain size={60} className="absolute right-[-10px] bottom-[-10px] opacity-10" />
                ) : (
                  <Sun size={60} className="absolute right-[-10px] bottom-[-10px] opacity-10" />
                )}
              </>
            )}
          </div>

          {/* 매출 카드 */}
          <button 
            onClick={() => navigate('/sales')}
            className="col-span-3 bg-white rounded-2xl p-4 shadow-sm text-left active:scale-95 transition-all flex flex-col justify-center min-h-[90px]"
          >
            <p className="text-[9px] font-black text-blue-500 mb-1 uppercase tracking-tight">Today Sales</p>
            <div className="flex items-center justify-between">
              <span className="text-xl font-black text-slate-900 tracking-tighter">1,250,000원</span>
              <ChevronRight size={18} className="text-slate-300" />
            </div>
          </button>
        </div>

        {/* AI 홍보글 배너 */}
        <button 
          onClick={() => navigate('/creator')}
          className="w-full mt-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200/50 relative overflow-hidden text-left active:scale-95 transition-all"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md">
                <Sparkles size={18} className="text-white" />
              </div>
              <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest">AI Marketing</span>
            </div>
            <p className="text-xl font-black mb-1">AI 홍보글 작성하기</p>
            <p className="text-[11px] text-blue-100 opacity-90 font-medium">SNS 포스팅을 10초 만에 완성!</p>
          </div>
          <Sparkles size={100} className="absolute right-[-20px] top-[-20px] text-white/10" />
        </button>

        {/* 주요 실행 버튼 그리드 */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button 
            onClick={() => navigate('/create')}
            className="bg-white p-6 rounded-2xl shadow-sm text-center active:scale-95 transition-all flex flex-col items-center gap-3 border border-white"
          >
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-amber-400 shadow-lg shadow-slate-200">
              <Crown size={28} />
            </div>
            <p className="text-sm font-black text-slate-900">보증서 발행</p>
          </button>

          <button 
            onClick={() => navigate('/marketing')}
            className="bg-white p-6 rounded-2xl shadow-sm text-center active:scale-95 transition-all flex flex-col items-center gap-3 border border-white"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100">
              <MessageSquare size={28} />
            </div>
            <p className="text-sm font-black text-slate-900">마케팅 관리</p>
          </button>
        </div>

        {/* 하단 카피라이트 */}
        <div className="pt-2 text-center mt-auto pb-4">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em]">Powered by GLUNEX AI</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;