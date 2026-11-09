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
import { calculateStrategies, TravelInput, CardType, StrategyResult, PRICE_BASIS_DATE } from './types';
import { format, parseISO, isAfter, getDay, addDays } from 'date-fns';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// 데쿠베르트(실물 카드)를 살 수 있는 역·창구를 확인하는 공식 페이지
// 모바일 나비고 앱 가입 방법 (네이버 블로그)
const MOBILE_NAVIGO_GUIDE_URL = 'https://blog.naver.com/witheye1/224197768895';
const POINTS_OF_SALE_URL = 'https://www.iledefrance-mobilites.fr/cartes/points-de-vente';

export default function App() {
  const [input, setInput] = useState<TravelInput>({
    arrivalDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    departureDate: format(addDays(new Date(), 11), 'yyyy-MM-dd'),
    bagOption: 'Backpack+Carrier',
    dailyTrips: 4,
    arrivalDayTrips: 0,
    departureDayTrips: 0,
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
    setInput(prev => {
      const next = { ...prev, [name]: ['dailyTrips', 'arrivalDayTrips', 'departureDayTrips'].includes(name) ? parseInt(value) : value } as TravelInput;
      // 도착일을 출발일보다 뒤로 옮기면 출발일을 도착일로 맞춰줍니다.
      if (name === 'arrivalDate' && value && isAfter(parseISO(value), parseISO(prev.departureDate))) {
        next.departureDate = value;
      }
      return next;
    });
  };

  // iso: 'yyyy-MM-dd' (연말연시에도 연도가 틀리지 않도록 전체 날짜로 계산)
  const getDayColor = (iso: string) => {
    const day = getDay(parseISO(iso));
    if (day === 0) return 'text-red-500';
    if (day === 6) return 'text-blue-500';
    return 'opacity-60';
  };

  const getDayName = (iso: string) => DAY_NAMES[getDay(parseISO(iso))];

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

      <main className="max-w-4xl mx-auto px-6 pt-6 pb-12">
          {/* 홍보 섹션: 헤더 바로 아래 배치 */}
          <div className="bg-white border border-[#141414]/10 rounded-2xl mb-6 shadow-sm">
            <div className="max-w-4xl mx-auto px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[13px] font-medium text-[#141414]/70">
                🇫🇷 더 많은 파리 여행 정보가 궁금하다면?
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
            
            <div className="space-y-5 w-full"> {/* overflow-hidden을 제거하여 테두리가 잘리지 않게 합니다 */}
              
              {/* PARIS IN 섹션 */}
              <div className="space-y-2 w-full">
                <label htmlFor="arrivalDate" className="text-[11px] uppercase tracking-wider font-bold opacity-30 flex items-center gap-1.5 ml-1">
                  <Calendar size={13} /> PARIS IN
                </label>
                {/* flex와 min-w-0 조합이 상자가 부모를 뚫고 나가는 것을 물리적으로 막아줍니다 */}
                <div className="w-full flex min-w-0">
                  <input 
                    type="date" 
                    id="arrivalDate"
                    name="arrivalDate"
                    value={input.arrivalDate}
                    onChange={handleInputChange}
                    /* px-3.5로 여백을 살짝 줄여 좁은 화면에서도 텍스트 공간을 확보하고, box-border로 테두리를 안으로 넣었습니다 */
                    className="flex-1 min-w-0 w-full bg-white border border-[#141414]/10 rounded-[18px] px-3.5 py-3.5 min-h-[52px] text-sm font-normal text-[#141414] focus:outline-none block box-border"
                  />
                </div>
              </div>
            
              {/* PARIS OUT 섹션 */}
              <div className="space-y-2 w-full">
                <label htmlFor="departureDate" className="text-[11px] uppercase tracking-wider font-bold opacity-30 flex items-center gap-1.5 ml-1">
                  <Calendar size={13} /> PARIS OUT
                </label>
                <div className="w-full flex min-w-0">
                  <input 
                    type="date" 
                    id="departureDate"
                    name="departureDate"
                    min={input.arrivalDate}
                    value={input.departureDate}
                    onChange={handleInputChange}
                    className="flex-1 min-w-0 w-full bg-white border border-[#141414]/10 rounded-[18px] px-3.5 py-3.5 min-h-[52px] text-sm font-normal text-[#141414] focus:outline-none block box-border"
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
                        aria-pressed={input.bagOption === opt.id}
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

                <div className="grid grid-cols-2 gap-3">
                  {([
                    { name: 'arrivalDayTrips', label: '파리 IN 당일 대중교통 이용 계획', value: input.arrivalDayTrips },
                    { name: 'departureDayTrips', label: '파리 OUT 당일 대중교통 이용 계획', value: input.departureDayTrips },
                  ] as const).map(f => (
                    <div key={f.name} className="space-y-2">
                      <label htmlFor={f.name} className="text-[11px] tracking-wider font-bold opacity-50 flex items-center gap-1 leading-tight">
                        {f.label}
                      </label>
                      <select
                        id={f.name}
                        name={f.name}
                        value={f.value}
                        onChange={handleInputChange}
                        className="w-full bg-white border border-[#141414]/10 rounded-[14px] px-3 py-3 min-h-[48px] text-sm font-normal text-[#141414] focus:outline-none box-border"
                      >
                        {Array.from({ length: 11 }, (_, n) => (
                          <option key={n} value={n}>{n}회</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] italic opacity-50">
                  공항 이동(RER/택시)을 제외하고, 도착일·출발일에 시내에서 추가로 타는 횟수예요. 기본값은 0회입니다.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider font-bold opacity-50 flex items-center gap-1">
                  <CreditCard size={12} /> 카드 선택
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Mobile', 'Physical'] as const).map(type => (
                    <button
                      key={type}
                      aria-pressed={input.cardType === type}
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
                {input.cardType === 'Mobile' && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex gap-2 items-start">
                    <AlertCircle className="text-amber-500 shrink-0" size={16} />
                    <p className="text-[11px] text-amber-800 leading-relaxed text-left">
                      갤럭시 일부 기종에서는 모바일 나비고가 잘 안 된다는 보고가 있어요. 
                      안전하게 가려면 <strong>실물카드 구매를 추천</strong>합니다.
                    </p>
                  </div>
                )}
                {input.cardType === 'Mobile' && (
                  <a
                    href={MOBILE_NAVIGO_GUIDE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 bg-white border border-[#141414]/10 rounded-xl px-4 py-3 text-[12px] font-bold hover:bg-[#141414]/5 transition-all"
                  >
                    <span>📱 파리 교통카드(나비고) 앱 가입방법</span>
                    <span className="text-[10px] font-normal opacity-50 shrink-0">블로그로 이동</span>
                  </a>
                )}
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
            
            {/* 실물 카드를 선택했고, 수하물 옵션이 택시(MultiCarrier)가 아닐 때만 표시 */}
            <AnimatePresence>
              {input.cardType === 'Physical' && input.bagOption !== 'MultiCarrier' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white border border-[#141414]/10 p-4 rounded-xl mb-4 text-left">
                    <p className="text-[11px] font-bold mb-3 opacity-60">실물카드별로 충전할 수 있는 것</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
                      <div className="rounded-lg bg-[#F5F5F0] p-3">
                        <p className="font-bold mb-1">나비고 이지 (카드값 2€)</p>
                        <ul className="list-disc list-inside space-y-0.5 opacity-80">
                          <li>1회권(t+) 최대 20장</li>
                          <li>일일권(Navigo Jour)</li>
                          <li>공항 티켓(CDG/Orly RER)</li>
                          <li>사진 필요 없음</li>
                        </ul>
                        <p className="text-[10px] opacity-60 mt-2">※ 공항 티켓은 1회권(t+)과 같은 카드에 같이 담을 수 없어요.</p>
                      </div>
                      <div className="rounded-lg bg-[#F5F5F0] p-3">
                        <p className="font-bold mb-1">나비고 데쿠베르트 (카드값 5€)</p>
                        <ul className="list-disc list-inside space-y-0.5 opacity-80">
                          <li>주간권(Navigo Semaine) 충전</li>
                          <li>증명사진 필수, 공항에서는 구매 불가</li>
                        </ul>
                        <p className="text-[10px] opacity-60 mt-2">※ 1회권, 일일권 충전 가능 여부는 확인하지 못했어요. 이지에 담는 걸 기준으로 계산했습니다.</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6 flex gap-3 items-start">
                    <AlertCircle className="text-amber-500 shrink-0" size={18} />
                    <p className="text-xs text-amber-800 leading-relaxed text-left">
                      <strong>현지 팁:</strong> 파리 공항(CDG)에서는 실물 나비고 데쿠베르트(장기권)를 판매하지 않습니다!
                      공항에서는 우선 <strong>나비고 이지(2€)</strong>를 사서 공항용 티켓을 충전해 시내로 이동하신 후, 
                      숙소 근처 역에서 데쿠베르트를 만드실 수 있습니다(증명 사진 필수).
                      <br />
                      <strong>지도 보는 법:</strong> 공식 지도에서 <strong>파란색 핀(Guichets Navigo)</strong>은 직원이 있는
                      나비고 전용 창구라서 데쿠베르트를 구매할 확률이 높습니다. 회색 핀(Points de vente)은 판매만 하는 곳이라
                      발급이 안 될 수 있어요.
                      <br />
                      <a
                        href={POINTS_OF_SALE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 font-bold underline underline-offset-2"
                      >
                        🗺️ 데쿠베르트 구매 가능한 역·창구 확인하기 (IDFM 공식 지도)
                      </a>
                      <span className="block mt-1 text-[10px] opacity-70">클릭하면 공식 지도 사이트로 이동합니다.</span>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="space-y-6">
              <AnimatePresence mode="wait">
                {isInvalidDate ? (
                  /* --- 수정된 날짜 에러 안내 섹션 --- */
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
                    <h3 className="text-lg font-bold mb-2 text-[#141414]">날짜를 조정 중이신가요?</h3>
                    <p className="text-sm text-[#141414]/60 leading-relaxed text-center">
                      도착일(Paris In)이 출발일(Paris Out)보다 빠르도록<br />
                      여행 일정을 맞춰주시면 최적의 교통권을 계산해 드립니다.
                    </p>
                  </motion.div>
                ) : (
                  /* --- 정상 결과 출력 섹션 --- */
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
                        <p className="text-sm leading-relaxed opacity-90 mb-4 text-left">
                          {res.description}
                        </p>
                        <div className="space-y-2 border-t border-current/10 pt-4">
                          <p className="text-[10px] uppercase tracking-wider font-bold opacity-50 mb-2 text-left">날짜별 상세 정보</p>
                          <div className="grid grid-cols-1 gap-1">
                            {res.dailyBreakdown.map((day, dIdx) => (
                              <div key={dIdx} className="flex justify-between text-[11px] items-center">
                                <div className="flex items-center gap-2">
                                  <span className={getDayColor(day.iso)}>{day.date} ({getDayName(day.iso)})</span>
                                </div>
                                <span className="font-medium flex-1 text-center px-2">{day.passType}</span>
                                <span className="font-mono w-14 text-right">€{day.cost.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                        

                      {res.isRecommended && res.savingsVsNext !== undefined && res.savingsVsNext > 0.005 && (
                        <p className="text-xs font-bold text-[#5A5A40] mb-4">
                          다음으로 저렴한 방법보다 €{res.savingsVsNext.toFixed(2)} 절약돼요
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-wider">
                        <div className="flex items-center gap-1">
                          <TrainFront size={14} /> {input.bagOption === 'MultiCarrier' ? 'Taxi Included' : 'RER Included'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Info size={14} /> 요금 기준 {PRICE_BASIS_DATE}
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
                  <h4 className="font-bold text-sm uppercase tracking-widest text-left">Expert Advice</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <p className="text-xs font-bold opacity-40 uppercase tracking-wider text-left">선정이유</p>
                    <p className="text-sm leading-relaxed text-left">
                      {(() => {
                        const rec = results.find(r => r.isRecommended);
                        const arrivalDay = DAY_NAMES[getDay(parseISO(input.arrivalDate))];
                        return rec?.semaineUsed
                          ? `도착일(${arrivalDay}요일)과 체류 기간을 고려했을 때, 주간권(Semaine)을 활용하는 것이 공항 이동 비용까지 커버하여 가장 경제적입니다. (주간권은 월~일 달력 기준이라 주 중반에 사도 일요일까지만 유효해요.)`
                          : `체류 기간이 짧거나 이동이 적어, 주간권보다는 필요한 만큼만 1회권이나 일일권을 구매하는 것이 더 저렴합니다.`;
                      })()}
                    </p>
                  </div>
                  <div className="space-y-2 text-left">
                    <p className="text-xs font-bold opacity-40 uppercase tracking-wider">주의사항</p>
                    <ul className="text-sm space-y-1 list-disc list-inside opacity-80">
                      <li>실물 나비고 데쿠베르트는 공항구매 불가, 증명사진 필수</li>
                      <li>파리 in/out날은 공항-시내 간 이동을 기본으로 계산하고, 위에서 선택한 당일 시내 이용 횟수(기본 0회)를 더해요</li>
                      <li>택시는 2026 CDG 정액(우안 56€ 기준, 좌안은 65€)으로 산정 · 예약비 별도</li>
                      <li>요금은 {PRICE_BASIS_DATE} 기준이며 매년 1월에 바뀔 수 있어요</li>
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
