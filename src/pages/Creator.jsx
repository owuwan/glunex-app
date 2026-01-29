import React, { useState } from 'react';
import { 
  Sparkles, CloudRain, Sun, Snowflake, Cloud, 
  CheckCircle2, Zap, Layout, Instagram, Video, 
  Copy, Check, ArrowLeft, ArrowRight
} from 'lucide-react';

const Creator = () => {
  const [step, setStep] = useState('keyword'); 
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isWeatherEnabled, setIsWeatherEnabled] = useState(true);

  const categories = [
    { id: 'wash', name: '세차' }, { id: 'detailing', name: '디테일링' },
    { id: 'coating', name: '유리막코팅' }, { id: 'undercoating', name: '언더코팅' },
    { id: 'special_wash', name: '실내특수세차' }, { id: 'interior_clean', name: '실내크리닝' },
    { id: 'iron_remove', name: '철분제거' }, { id: 'glass_repel', name: '유리발수코팅' },
    { id: 'tinting', name: '썬팅' }, { id: 'blackbox', name: '블랙박스' },
    { id: 'new_car', name: '신차패키지' }, { id: 'leather_coating', name: '가죽코팅' }
  ];

  const toggleTopic = (id) => {
    setSelectedTopics(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 font-noto overflow-hidden relative text-left">
      <header className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Glunex <span className="text-blue-600">Ai</span></h1>
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
          <Cloud size={16} className="text-slate-400" />
          <span className="text-[10px] font-black text-slate-700">비 18°C</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
        <section className="animate-fade-in text-left">
          <div className={`p-6 rounded-[2.5rem] border-2 transition-all ${isWeatherEnabled ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-black uppercase tracking-tight text-sm"><Zap size={18}/> 날씨연동</div>
              <button onClick={() => setIsWeatherEnabled(!isWeatherEnabled)} className="w-12 h-6 rounded-full bg-white/20 relative">
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isWeatherEnabled ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>
            <p className="text-[11px] opacity-80 font-medium">현재 날씨에 맞춰 고객을 설득하는 문구를 추가합니다.</p>
          </div>
        </section>

        <section className="space-y-4 text-left">
          <h2 className="text-lg font-black text-slate-900 ml-1">어떤 주제로 글을 쓸까요?</h2>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => toggleTopic(cat.id)} className={`relative py-5 px-2 rounded-2xl border-2 transition-all ${selectedTopics.includes(cat.id) ? 'bg-slate-900 border-slate-900 text-white scale-[1.03] font-bold' : 'bg-white text-slate-500 text-xs font-bold'}`}>
                {cat.name}
                {selectedTopics.includes(cat.id) && <CheckCircle2 size={12} className="absolute top-1.5 right-1.5 text-blue-400" fill="currentColor" />}
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 max-w-md mx-auto">
        <button disabled={selectedTopics.length === 0} className={`w-full py-5 rounded-[1.8rem] font-black text-sm ${selectedTopics.length > 0 ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-100 text-slate-300'}`}>
          제목 추천받기
        </button>
      </footer>
    </div>
  );
};

export default Creator;