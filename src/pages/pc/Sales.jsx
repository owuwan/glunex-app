import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  MoreHorizontal, 
  ChevronRight,
  FileText,
  DollarSign,
  UserPlus,
  BarChart3
} from 'lucide-react';

/**
 * PC 전용 Sales(영업 관리) 페이지
 * 고객 시공 내역, 매출 현황 등을 표 형태로 상세히 관리합니다.
 */
const Sales = () => {
  // 필터링을 위한 임시 상태
  const [searchTerm, setSearchTerm] = useState('');

  // 샘플 영업 데이터
  const salesData = [
    { id: 'S-2026-001', customer: '홍길동', car: '제네시스 GV80', service: '전체 코팅 패키지', price: '₩1,200,000', date: '2026.02.01', status: '입금완료' },
    { id: 'S-2026-002', customer: '성춘향', car: '현대 아이오닉 6', service: '윈도우 틴팅 (전면/측후면)', price: '₩650,000', date: '2026.02.01', status: '진행중' },
    { id: 'S-2026-003', customer: '이몽룡', car: '기아 EV9', service: '생활보호 PPF 6종', price: '₩450,000', date: '2026.01.31', status: '입금완료' },
    { id: 'S-2026-004', customer: '심청이', car: '테슬라 모델 Y', service: '신차 패키지 (코팅+틴팅)', price: '₩1,800,000', date: '2026.01.31', status: '취소됨' },
    { id: 'S-2026-005', customer: '임꺽정', car: '포르쉐 타이칸', service: '프리미엄 유리막 코팅', price: '₩950,000', date: '2026.01.30', status: '입금완료' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1. 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">영업 및 시공 관리</h1>
          <p className="text-slate-500 mt-1">등록된 모든 시공 내역과 매출 현황을 관리합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <Download size={18} /> 내보내기
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            <Plus size={18} /> 신규 매출 등록
          </button>
        </div>
      </div>

      {/* 2. 영업 요약 카드 */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: '이번 달 총 매출', value: '₩14,200,000', icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: '신규 고객 등록', value: '24명', icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '발행 보증서', value: '18건', icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: '평균 객단가', value: '₩591,000', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center`}>
                <item.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                <h3 className="text-xl font-black text-slate-900">{item.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. 데이터 리스트 영역 */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* 필터 및 검색 바 */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="고객명, 차종으로 검색..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900">
              <Filter size={18} /> 상세 필터
            </button>
          </div>
        </div>

        {/* 메인 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80 text-slate-400 text-[11px] font-bold uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-5">고객 정보</th>
                <th className="px-6 py-5">시공 항목</th>
                <th className="px-6 py-5">결제 금액</th>
                <th className="px-6 py-5">시공일</th>
                <th className="px-6 py-5">진행 상태</th>
                <th className="px-8 py-5 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {salesData.map((data) => (
                <tr key={data.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{data.customer}</div>
                    <div className="text-xs text-slate-400 mt-0.5 font-medium">{data.car}</div>
                  </td>
                  <td className="px-6 py-5 text-sm font-semibold text-slate-700">{data.service}</td>
                  <td className="px-6 py-5 font-black text-slate-900">{data.price}</td>
                  <td className="px-6 py-5 text-sm text-slate-500 font-medium">{data.date}</td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black ${
                      data.status === '입금완료' ? 'bg-emerald-50 text-emerald-600' : 
                      data.status === '진행중' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {data.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
                      <MoreHorizontal size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div className="p-6 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500 font-medium">전체 {salesData.length}개 내역 중 1-5 표시</p>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-400 cursor-not-allowed">이전</button>
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 hover:bg-slate-50 shadow-sm">다음</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sales;