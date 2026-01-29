import React, { useState, useEffect } from 'react';
import { 
  Wand2, Sparkles, CloudRain, Sun, Snowflake, Cloud, 
  CheckCircle2, Plus, Calendar, Zap, MessageSquare,
  ArrowRight, Thermometer
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const Creator = () => {
  const { showToast } = useApp();
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isWeatherEnabled, setIsWeatherEnabled] = useState(true);
  const [weather, setWeather] = useState({ status: 'rain', desc: '비', temp: 18 });

  // 12개 시공 카테고리
  const categories = [
    { id: 'wash', name: '세차' },
    { id: 'detailing', name: '디테일링' },
    { id: 'coating', name: '유리막코팅' },
    { id: 'undercoating', name: '언더코팅' },
    { id: 'special_wash', name: '실내특수세차' },
    { id: 'interior_clean', name: '실내크리닝' },
    { id: 'iron_remove', name: '철분제거' },
    { id: 'glass_repel', name: '유리발수코팅' },
    { id: 'tinting', name: '썬팅' },
    { id: 'blackbox', name: '블랙박스' },
    { id: 'new_car', name: '신차패키지' },
    { id: 'leather_coating', name: '가죽코팅' }
  ];

  // 카테고리 토글 함수 (복수 선택)
  const toggleTopic = (topicId) => {
    setSelectedTopics(prev => 
      prev.includes(topicId) 
        ? prev.filter(id => id !== topicId) 
        : [...prev, topicId]
    );
  };

  const getWeatherIcon = (status) => {
    switch(status) {
      case 'rain': return <CloudRain size={20} className="text-blue-500" />;
      case 'snow': return <Snowflake size={20} className="text-blue-300" />;
      case 'cloud': return <Cloud size={20} className="text-slate-400" />;
      default: return <Sun size={20} className="text-orange-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 font-noto overflow-hidden">
      {/* 상단 헤더 */}
      <header className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-900 tracking-tighter italic">
          GLUNEX <span className="text-blue-600">AI</span>
        </h1>
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
          {getWeatherIcon(weather.status)}
          <span className="text-[11px] font-black text-slate-700 uppercase">{weather.desc} {weather.temp}°C</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
        
        {/* 날씨 연동 섹션 */}
        <section className="animate-fade-in">
          <div className={`p-6 rounded-[2.5rem] border transition-all duration-500 ${isWeatherEnabled ? 'bg-blue-600 border-blue-400 shadow-xl shadow-blue-100' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${isWeatherEnabled ? 'bg-white/20' : 'bg-blue-50'}`}>
                  <Zap size={18} className={isWeatherEnabled ? 'text-white' : 'text-blue-600'} />
                </div>
                <h2 className={`text-sm font-black ${isWeatherEnabled ? 'text-white' : 'text-slate-900'}`}>날씨연동 글쓰기</h2>
              </div>
              <button 
                onClick={() => setIsWeatherEnabled(!isWeatherEnabled)}
                className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isWeatherEnabled ? 'bg-white' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full transition-all duration-300 ${isWeatherEnabled ? 'right-1 bg-blue-600' : 'left-1 bg-white shadow-sm'}`}></div>
              </button>
            </div>
            <p className={`text-[11px] leading-relaxed ${isWeatherEnabled ? 'text-blue-100' : 'text-slate-400'}`}>
              {isWeatherEnabled 
                ? `현재 ${weather.desc} 날씨에 맞춰서 고객들이 시공을 맡기고 싶어지는 문구를 자동으로 추가합니다.` 
                : "날씨 정보를 제외하고 일반적인 홍보용 글을 작성합니다."}
            </p>
          </div>
        </section>

        {/* 주제 선택 섹션 */}
        <section className="space-y-4 animate-fade-in" style={{animationDelay: '100ms'}}>
          <div className="flex items-end justify-between px-1">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              어떤 주제로 글을 쓸까요?<br/>
              <span className="text-xs text-slate-400 font-medium">(복수선택 가능)</span>
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => toggleTopic(cat.id)}
                className={`relative flex flex-col items-center justify-center py-4 px-2 rounded-2xl border transition-all duration-200 ${
                  selectedTopics.includes(cat.id)
                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-[1.03] z-10'
                    : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200 active:scale-95'
                }`}
              >
                <span className="text-[12px] font-black break-keep">{cat.name}</span>
                {selectedTopics.includes(cat.id) && (
                  <div className="absolute top-1.5 right-1.5 text-blue-400 animate-fade-in">
                    <CheckCircle2 size={12} fill="currentColor" className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

      </main>

      {/* 하단 버튼 */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 max-w-md mx-auto z-50">
        <button 
          disabled={selectedTopics.length === 0}
          className={`w-full py-5 rounded-[1.8rem] font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${
            selectedTopics.length > 0 
              ? 'bg-slate-900 text-white shadow-slate-900/20' 
              : 'bg-slate-100 text-slate-300 cursor-not-allowed'
          }`}
        >
          <Sparkles size={18} />
          제목 추천받기
          <ArrowRight size={16} />
        </button>
      </footer>
    </div>
  );
};

export default Creator;