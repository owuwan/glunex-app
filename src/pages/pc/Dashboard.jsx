import React from 'react';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  ChevronRight, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

/**
 * PC 전용 Dashboard 페이지
 * 모바일보다 확장된 데이터 시각화와 리스트를 제공합니다.
 */
const Dashboard = () => {
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
          <button className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900">주간</button>
          <button className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900">월간</button>
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

      {/* 3. 메인 컨텐츠 그리드 (최근 이력 + 일정) */}
      <div className="grid grid-cols-3 gap-8">
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