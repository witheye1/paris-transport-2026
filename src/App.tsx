/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Briefcase, 
  TrainFront, 
  Smartphone, 
  CreditCard, 
  ChevronRight, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  ArrowRightLeft,
  Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { calculateStrategies, TravelInput, CardType, StrategyResult } from './types';
import { format, parseISO, isAfter, getDay } from 'date-fns';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export default function App() {
  if (typeof window !== 'undefined') {
    document.title = "파리 교통권 최적화 가이드 2026";
  }

  const [input, setInput] = useState<TravelInput>({
    arrivalDate: format(new Date(), 'yyyy-MM-dd'),
    departureDate: format(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    bagOption: 'Backpack+Carrier',
    dailyTrips: 4,
    cardType: 'Mobile',
  });

  // 날짜 유효성 체크: 도착일이 출발일보다 뒤에 있으면 true
  const isInvalidDate = useMemo(() => {
    return isAfter(parseISO(input.arrivalDate), parseISO(input.departureDate));
  }, [input.arrivalDate, input.departureDate]);

  // 날짜가 정상일 때만 계산 수행
  const results = useMemo(() => {
    if (isInvalidDate) return [];
    return calculateStrategies(input);
  }, [input, isInvalidDate]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // 팝업(alert) 없이 즉시 상태를 업데이트하여 자유로운 날짜 선택을 보장합니다.
    setInput(prev => ({
      ...prev,
      [name]: name === 'dailyTrips' ? parseInt(value) : value
    }));
  };

  const getDayColor = (dateStr: string) => {
    const year = parseISO(input.arrivalDate).getFullYear();
    const date = parseISO(`${year}-${dateStr.replace('/', '-')}`);
    const day = getDay(date);
    if (day === 0) return 'text-red-500';
    if (day === 6) return 'text-blue-500';
    return 'opacity-60';
  };

  const getDayName = (dateStr: string) => {
    const year = parseISO(input.arrivalDate).getFullYear();
    const date = parseISO(`${year}-${dateStr.replace('/', '-')}`);
    return DAY_NAMES[getDay(date)];
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans selection:bg-[#5A5A40] selection:text-white">
      <header className="border-b border-[#141414]/10 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#141414] rounded-full flex items-center justify-center text-white">
              <Navigation size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">파리 여행 최적 교통권 추천</h1>
              <p className="text-[10px] uppercase tracking-widest opacity-50 font-semibold">2026 Edition ©외눈이</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
          {/* 홍보 섹션: 헤더 바로 아래 배치 */}
          <div className="bg-white border border-[#141414]/10 rounded-2xl mb-12 shadow-sm">
            <div className="max-w-4xl mx-auto px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[13px] font-medium text-[#141414]/70">
                🇫🇷 더 많은 파리 여행 정보가 더 궁금하다면?
              </p>
              <div className="flex gap-2">
                <a 
                  href="https://blog.naver.com/witheye1" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold px-4 py-2 bg-[#03C75A] text-white rounded-full hover:opacity-90 transition-all flex items-center gap-1"
                >
                  <span>N</span> 블로그
                </a>
                <a 
                  href="https://instagram.com/eye1___" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold px-4 py-2 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] text-white rounded-full hover:opacity-90 transition-all"
                >
                  인스타그램
                </a>
              </div>
            </div>
          </div>
                  
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <section className="lg:col-span-5 space-y-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Travel Details</h2>
              <p className="text-sm opacity-60">여행 정보를 입력하면 최적의 알고리즘이 가동됩니다.</p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider font-bold opacity-50 flex items-center gap-1">
                    <Calendar size={12} /> Paris in
                  </label>
                  <input 
                    type="date" 
                    name="arrivalDate"
                    value={input.arrivalDate}
                    onChange={handleInputChange}
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                    className="w-full bg-white border border-[#141414]/10 rounded-xl px-4 py-3 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-[#141414]/5 transition-all text-sm appearance-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider font-bold opacity-50 flex items-center gap-1">
                    <Calendar size={12} /> Paris out
                  </label>
                  <input 
                    type="date" 
                    name="departureDate"
                    value={input.departureDate}
                    onChange={handleInputChange}
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                    className="w-full bg-white border border-[#141414]/10 rounded-xl px-4 py-3 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-[#141414]/5 transition-all text-sm appearance-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider font-bold opacity-50 flex items-center gap-1">
                    <Briefcase size={12} /> 수하물 선택 (1인 기준)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'Backpack', label: '백팩' },
                      { id: 'Backpack+Carrier', label: '백팩+캐리어1개' },
                      { id: 'MultiCarrier', label: '캐리어2개이상' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setInput(p => ({ ...p, bagOption: opt.id as any }))}
                        className={`flex-1 min-w-[100px] text-center px-2 py-3 rounded-xl border transition-all text-[11px] font-bold ${
                          input.bagOption === opt.id ? 'bg-[#141414] text-white shadow-lg' : 'bg-white border-[#141414]/10 hover:bg-[#141414]/5'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] italic opacity-50">
                    {input.bagOption === 'MultiCarrier' ? '캐리어 2개 이상은 공항 택시 이용을 권장합니다.' : '수하물이 적어 RER 이용이 가능합니다.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider font-bold opacity-50 flex items-center gap-1">
                    <ArrowRightLeft size={12} /> 1일 평균 대중교통 예상 이용 횟수
                  </label>
                  <input 
                    type="range" 
                    name="dailyTrips"
                    min="0"
                    max="10"
                    value={input.dailyTrips}
                    onChange={handleInputChange}
                    className="w-full accent-[#141414]"
                  />
                  <div className="flex justify-between text-[10px] font-bold opacity-40">
                    <span>0회</span>
                    <span className="text-sm text-[#141414] opacity-100">{input.dailyTrips}회</span>
                    <span>10회</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider font-bold opacity-50 flex items-center gap-1">
                  <CreditCard size={12} /> 카드 선택
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Mobile', 'Physical'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setInput(p => ({ ...p, cardType: type }))}
                      className={`flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-xl border transition-all ${
                        input.cardType === type 
                          ? 'bg-white border-[#141414] shadow-sm' 
                          : 'bg-white/50 border-[#141414]/10 opacity-60 hover:opacity-100'
                      }`}
                    >
                      {type === 'Mobile' ? <Smartphone size={20} /> : <CreditCard size={20} />}
                      <span className="text-sm font-bold">{type === 'Mobile' ? '모바일' : '실물카드'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="lg:col-span-7 space-y-8">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">Optimization Result</h2>
                <p className="text-sm opacity-60">가장 경제적인 이동 전략을 확인하세요.</p>
              </div>
            </div>

            <div className="space-y-6">
              <AnimatePresence mode="wait">
                {isInvalidDate ? (
                  /* 날짜 에러 시 안내 화면 */
                  <motion.div
                    key="date-error"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white border-2 border-dashed border-[#141414]/20 p-12 rounded-3xl text-center"
                  >
                    <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle size={32} />
                    </div>
                    <h3 className="text-lg font-bold mb-2">날짜를 조정 중이신가요?</h3>
                    <p className="text-sm text-[#141414]/60 leading-relaxed">
                      도착일(Paris In)이 출발일(Paris Out)보다 빠르도록<br />
                      여행 일정을 맞춰주시면 최적의 교통권을 계산해 드립니다.
                    </p>
                  </motion.div>
                ) : (
                  results.map((res, idx) => (
                    <motion.div
                      key={res.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`relative overflow-hidden rounded-2xl border p-6 transition-all bg-white ${
                        res.isRecommended 
                          ? 'border-[#141414] border-2 shadow-2xl scale-[1.02] z-10' 
                          : 'border-[#141414]/10 opacity-80 hover:opacity-100'
                      }`}
                    >
                      {res.isRecommended && (
                        <div className="absolute top-0 right-0 bg-[#141414] text-white text-[10px] font-bold px-4 py-1 rounded-bl-xl uppercase tracking-widest">
                          Recommended
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between mb-6 text-[#141414]">
                        <div className="space-y-1">
                          <p className="text-[11px] uppercase tracking-widest font-bold opacity-40">
                            Strategy {idx + 1}
                          </p>
                          <h3 className="text-xl font-bold">{res.name}</h3>
                          {res.cardName && (
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">
                              {res.cardName}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-widest font-bold opacity-40">
                            Estimated Cost
                          </p>
                          <p className="text-3xl font-bold">€{res.totalCost.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl mb-6 bg-[#F5F5F0] text-[#141414]">
                        <p className="text-sm leading-relaxed opacity-90 mb-4">
                          {res.description}
                        </p>
                        <div className="space-y-2 border-t border-current/10 pt-4">
                          <p className="text-[10px] uppercase tracking-wider font-bold opacity-50 mb-2">날짜별 상세 정보</p>
                          <div className="grid grid-cols-1 gap-1">
                            {res.dailyBreakdown.map((day, dIdx) => (
                              <div key={dIdx} className="flex justify-between text-[11px] items-center">
                                <div className="flex items-center gap-2">
                                  <span className={getDayColor(day.date)}>{day.date} ({getDayName(day.date)})</span>
                                </div>
                                <span className="font-medium flex-1 text-center px-2">{day.passType}</span>
                                <span className="font-mono w-14 text-right">€{day.cost.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-wider">
                        <div className="flex items-center gap-1">
                          <TrainFront size={14} /> {input.bagOption === 'MultiCarrier' ? 'Taxi Included' : 'RER Included'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Info size={14} /> 2026 Rates
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {!isInvalidDate && (
              <div className="bg-white rounded-2xl border border-[#141414]/10 p-8 space-y-6">
                <div className="flex items-center gap-2 text-[#5A5A40]">
                  <AlertCircle size={20} />
                  <h4 className="font-bold text-sm uppercase tracking-widest">Expert Advice</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <p className="text-xs font-bold opacity-40 uppercase tracking-wider">선정이유</p>
                    <p className="text-sm leading-relaxed">
                      {results.find(r => r.isRecommended)?.name === '최적 하이브리드' 
                        ? `도착일(${format(parseISO(input.arrivalDate), 'EEEE')})과 체류 기간을 고려했을 때, 주간권(Semaine)을 활용하는 것이 공항 이동 비용까지 커버하여 가장 경제적입니다.`
                        : `체류 기간이 짧거나 주말을 포함하고 있어, 주간권보다는 필요한 만큼만 1회권이나 일일권을 구매하는 것이 더 저렴합니다.`}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold opacity-40 uppercase tracking-wider">주의사항</p>
                    <ul className="text-sm space-y-1 list-disc list-inside opacity-80">
                      <li>실물 나비고 데쿠베르트는 증명사진이 필수</li>
                      <li>모바일 나비고는 안드로이드/아이폰 모두 지원</li>
                      <li>택시의 경우, 편도 50€ 기준으로 산정</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="border-t border-[#141414]/10 py-12 bg-white/50">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-30">
            Paris Transport Optimizer &copy; 2026
          </p>
          <div className="flex justify-center gap-8 opacity-20">
            <TrainFront size={24} />
            <Navigation size={24} />
            <ArrowRightLeft size={24} />
          </div>
        </div>
      </footer>
    </div>
  );
}
