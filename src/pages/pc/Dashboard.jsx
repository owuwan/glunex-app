import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  ChevronRight, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Zap,
  ShieldCheck,
  MessageCircle
} from 'lucide-react';

/**
 * PC 전용 Dashboard 페이지 (업데이트)
 * 모바일 메인에 있던 'AI 마케팅 에이전트' 퀵 링크를 추가했습니다.
 */
const Dashboard = () => {
  const navigate = useNavigate();

  // 샘플 데이터
  const stats = [
    { label: '전체 고객 수', value: '1,284', change: '+12.5%', isUp: true, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '이번 달 매출', value: '₩12,450,000', change: '+18.2%', isUp: true, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: '평균 작업 시간', value: '1.4h', change: '-5.1%', isUp: false, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: '보증서 발행', value: '856건', change: '+2.4%', isUp: true, icon: CheckCircle, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  const recentOrders = [
    { id: 'ORD-001', customer: '김철수', product: '프리미엄 세라믹 코팅', date: '2026.02.01', status: '완료' },
    { id: 'ORD-002', customer: '이영희', product: '윈도우 틴팅 (전면)', date: '2026.02.01', status: '작업 중' },
    { id: 'ORD-003', customer: '박지성', product: '실내 클리닝 패키지', date: '2026.01.31', status: '대기' },
    { id: 'ORD-004', customer: '최유리', product: '가죽 시트 보호 코팅', date: '2026.01.31', status: '완료' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1. 상단 타이틀 섹션 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">시스템 대시보드</h1>
          <p className="text-slate-500 mt-1">오늘의 매장 현황과 주요 실적 지표입니다.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <button className="px-4 py-2 text-sm font-bold bg-slate-900 text-white rounded-xl shadow-md">실시간</button>
          <button className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">주간</button>
          <button className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">월간</button>
        </div>
      </div>

      {/* 2. 주요 지표 카드 그리드 */}
      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                <stat.icon size={24} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${stat.isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {stat.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {stat.change}
              </div>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* [추가] 3. 핵심 AI 서비스 & 퀵 액션 섹션 (모바일 메인 느낌 그대로) */}
      <div className="grid grid-cols-3 gap-6">
        <button 
          onClick={() => navigate('/creator')}
          className="col-span-1 p-6 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl text-left text-white shadow-xl shadow-indigo-100 group transition-all hover:-translate-y-1"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <Sparkles size={24} className="text-white" />
            </div>
            <ChevronRight size={20} className="text-white/50 group-hover:translate-x-1 transition-transform" />
          </div>
          <h4 className="text-xl font-black mb-1">AI 마케팅 에이전트</h4>
          <p className="text-indigo-100 text-xs font-medium">네이버 블로그/인스타 포스팅 10초 완성</p>
        </button>

        <button 
          onClick={() => navigate('/create')}
          className="col-span-1 p-6 bg-white border border-slate-200 rounded-3xl text-left shadow-sm group transition-all hover:border-indigo-600 hover:-translate-y-1 hover:shadow-xl"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
          </div>
          <h4 className="text-xl font-black text-slate-900 mb-1">서비스 보증서 발행</h4>
          <p className="text-slate-400 text-xs font-medium">보험수리 대응 공식 시공 보증서 발급</p>
        </button>

        <button 
          onClick={() => navigate('/marketing')}
          className="col-span-1 p-6 bg-white border border-slate-200 rounded-3xl text-left shadow-sm group transition-all hover:border-blue-600 hover:-translate-y-1 hover:shadow-xl"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
              <MessageCircle size={24} />
            </div>
            <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
          </div>
          <h4 className="text-xl font-black text-slate-900 mb-1">단골 마케팅 센터</h4>
          <p className="text-slate-400 text-xs font-medium">재방문 유도 알림톡 및 고객 관리</p>
        </button>
      </div>

      {/* 4. 하단 상세 영역 (최근 이력 + 일정) */}
      <div className="grid grid-cols-3 gap-8 pt-4">
        <div className="col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-bold">최근 발행 이력</h2>
            <button className="text-indigo-600 text-sm font-bold flex items-center gap-1 hover:underline">
              전체 보기 <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex-1">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-slate-400 text-[11px] font-bold uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">주문번호</th>
                  <th className="px-6 py-4">고객명</th>
                  <th className="px-6 py-4">시공 항목</th>
                  <th className="px-6 py-4 text-center">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{order.id}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{order.customer}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">{order.product}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                          order.status === '완료' ? 'bg-emerald-50 text-emerald-600' : 
                          order.status === '작업 중' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Calendar size={20} className="text-indigo-600" /> 오늘의 일정
          </h2>
          <div className="space-y-4 flex-1">
            {[
              { time: '10:00', task: '벤츠 S-Class 코팅', type: '시공' },
              { time: '14:30', task: 'BMW X5 틴팅 재시공', type: 'AS' },
              { time: '16:00', task: '고객 마케팅 문자 발송', type: '마케팅' },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-indigo-600 font-black text-sm">{item.time}</div>
                <div>
                  <p className="font-bold text-sm text-slate-900">{item.task}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{item.type}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full py-4 mt-6 bg-slate-50 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-colors border border-slate-100">
            일정 관리 페이지로 이동
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;