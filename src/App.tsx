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
  AlertCircle,
  Navigation,
  Minus,
  Plus,
  Check,
  MapPin,
  House,
  Ticket,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { calculateStrategies, TravelInput, BagOption, CardType, DailyDetail, PRICE_BASIS_DATE } from './types';
import { format, parseISO, isAfter, getDay, addDays, differenceInDays, startOfWeek, endOfWeek } from 'date-fns';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// 데쿠베르트(실물 카드)를 살 수 있는 역·창구를 확인하는 공식 페이지
// 모바일 나비고 앱 가입 방법 (네이버 블로그)
const MOBILE_NAVIGO_GUIDE_URL = 'https://blog.naver.com/witheye1/224197768895';
const POINTS_OF_SALE_URL = 'https://www.iledefrance-mobilites.fr/cartes/points-de-vente';

const BAG_OPTIONS: { id: BagOption; label: string; shortLabel: string; desc: string }[] = [
  { id: 'Backpack', label: '백팩', shortLabel: '백팩', desc: '짐이 적어요. RER로 공항에 이동해요' },
  { id: 'Backpack+Carrier', label: '백팩 + 캐리어 1개', shortLabel: '백팩+캐리어1개', desc: 'RER로 공항에 이동할 수 있어요' },
  { id: 'MultiCarrier', label: '캐리어 2개 이상', shortLabel: '캐리어2개이상', desc: '공항 택시 이용을 권장해요' },
];

const CARD_OPTIONS: { id: CardType; label: string; desc: string }[] = [
  { id: 'Mobile', label: '모바일 나비고', desc: '휴대폰 앱에 충전해서 써요' },
  { id: 'Physical', label: '실물카드', desc: '이지 2€ · 데쿠베르트 5€' },
];

// 이지 vs 데쿠베르트 비교 (기본 노출 행 / 자세히 보기 행)
const CARD_COMPARE_MAIN = [
  { label: '카드값', easy: '2€', dec: '5€' },
  { label: '이런 분께', easy: '도착일·짧은 이동, 1회권·일일권', dec: '4일 이상 체류, 주간권(월~일)' },
  { label: '명의', easy: '익명 (빌려줄 수 있음)', dec: '본인 명의 (사진 필수, 양도 불가)' },
  { label: '공항 이동', easy: '공항 티켓(14€)을 따로 충전', dec: '주간권·월권은 공항 RER 포함(오를리발 제외)이라 따로 필요 없음' },
];
const CARD_COMPARE_MORE = [
  { label: '충전 가능', easy: '1회권, 일일권, 공항 티켓', dec: '일일권, 주간권, 월권' },
  { label: '구매처', easy: '공항·역 자판기·창구', dec: 'Navigo 창구·일부 RATP 창구·승인 상점 (공항 불가)' },
  { label: '분실·도난', easy: '-', dec: '재발급 불가' },
];

// 공통 카드 스타일
const CARD = 'bg-white rounded-3xl shadow-[0_2px_10px_rgba(25,31,40,0.05)]';

/** 추천 전략의 날짜별 상세를 월~일 달력 격자로 변환 (주간권 적용일 표시용) */
function buildWeekGrid(breakdown: DailyDetail[]) {
  if (breakdown.length === 0) return [];
  const first = parseISO(breakdown[0].iso);
  const last = parseISO(breakdown[breakdown.length - 1].iso);
  const start = startOfWeek(first, { weekStartsOn: 1 });
  const total = differenceInDays(endOfWeek(last, { weekStartsOn: 1 }), start) + 1;
  const byIso = new Map(breakdown.map(d => [d.iso, d]));
  return Array.from({ length: total }, (_, i) => {
    const date = addDays(start, i);
    const iso = format(date, 'yyyy-MM-dd');
    const d = byIso.get(iso);
    return { iso, label: format(date, 'd'), inTrip: !!d, covered: !!d && d.passType.includes('주간권') };
  });
}

const WEEK_HEAD = ['월', '화', '수', '목', '금', '토', '일'];

/** 번호가 붙은 선택 단계의 머리글 */
function StepHeader({
  n,
  title,
  sub,
  done,
  required = true,
  id,
}: {
  n: number;
  title: string;
  sub: string;
  done: boolean;
  required?: boolean;
  id: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`shrink-0 w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center ${
          done ? 'bg-[#2F62E0] text-white' : 'bg-[#E0F2FE] border-2 border-[#38BDF8] text-[#075985]'
        }`}
      >
        {n}
      </span>
      <div className="flex-1 min-w-0">
        <h2 id={id} className="text-[17px] font-bold leading-tight">{title}</h2>
        <p className="text-xs text-[#5B6573]">{sub}</p>
      </div>
      {required &&
        (done ? (
          <span className="text-xs font-bold text-[#2F62E0] bg-[#EAF0FF] rounded-lg px-2 py-1">선택 완료</span>
        ) : (
          <span className="text-xs font-bold text-[#075985] bg-[#E0F2FE] rounded-lg px-2 py-1">선택 필요</span>
        ))}
    </div>
  );
}

/** 라디오처럼 보이는 선택지 버튼 */
function ChoiceRow({
  selected,
  pending = false,
  onClick,
  title,
  desc,
}: {
  selected: boolean;
  pending?: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  const tone = selected
    ? 'border-[#2F62E0] bg-[#F3F7FF]'
    : pending
      ? 'border-dashed border-[#38BDF8] bg-[#F0F9FF]'
      : 'border-[#E5E8EB] bg-white hover:border-[#B0B8C1]';
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`w-full flex items-center gap-3 text-left rounded-2xl border-2 px-4 py-3.5 transition-all ${tone}`}
    >
      {selected ? (
        <span className="shrink-0 w-6 h-6 rounded-full bg-[#2F62E0] flex items-center justify-center">
          <Check size={14} strokeWidth={3.5} color="#fff" />
        </span>
      ) : (
        <span className="shrink-0 w-6 h-6 rounded-full border-2 border-[#B0B8C1] bg-white" />
      )}
      <span className="flex flex-col gap-0.5">
        <span className={`text-[15px] ${selected ? 'font-bold' : 'font-medium'}`}>{title}</span>
        <span className={`text-xs ${selected ? 'text-[#4E5968]' : 'text-[#5B6573]'}`}>{desc}</span>
      </span>
    </button>
  );
}

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

  // 교통카드는 사용자가 직접 골라야 결과가 나옵니다 (선택 전에는 계산하지 않음)
  const [cardChosen, setCardChosen] = useState(false);

  // 실물카드 비교표 '자세히 보기' 펼침 여부
  const [showCardCompare, setShowCardCompare] = useState(false);

  // 날짜 유효성 체크: 도착일이 출발일보다 뒤에 있으면 true
  const isInvalidDate = useMemo(() => {
    return isAfter(parseISO(input.arrivalDate), parseISO(input.departureDate));
  }, [input.arrivalDate, input.departureDate]);

  // 날짜가 정상이고 카드까지 골랐을 때만 계산 수행
  const results = useMemo(() => {
    if (isInvalidDate || !cardChosen) return [];
    return calculateStrategies(input);
  }, [input, isInvalidDate, cardChosen]);

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

  const changeDailyTrips = (delta: number) =>
    setInput(p => ({ ...p, dailyTrips: Math.min(10, Math.max(0, p.dailyTrips + delta)) }));

  // iso: 'yyyy-MM-dd' (연말연시에도 연도가 틀리지 않도록 전체 날짜로 계산)
  const getDayColor = (iso: string) => {
    const day = getDay(parseISO(iso));
    if (day === 0) return 'text-red-500';
    if (day === 6) return 'text-blue-500';
    return 'opacity-60';
  };

  const getDayName = (iso: string) => DAY_NAMES[getDay(parseISO(iso))];

  // --- 진행 상태 ---
  const dateDone = !isInvalidDate;
  const doneCount = (dateDone ? 1 : 0) + 1 + (cardChosen ? 1 : 0) + 1; // 날짜 / 수하물 / 카드 / 이용 횟수
  const allDone = doneCount === 4;
  const needMessage = !dateDone ? '날짜를 확인해 주세요' : '교통카드를 선택해 주세요';
  const segs = [dateDone, true, cardChosen, true];

  const nights = isInvalidDate ? 0 : differenceInDays(parseISO(input.departureDate), parseISO(input.arrivalDate));
  const bagInfo = BAG_OPTIONS.find(b => b.id === input.bagOption)!;
  const cardInfo = CARD_OPTIONS.find(c => c.id === input.cardType)!;

  const showCardTip = input.cardType === 'Physical' && input.bagOption !== 'MultiCarrier';

  // 추천 결과 아래에 보여줄 '날짜별 적용' 달력과 '다른 방법과 비교' 막대 데이터
  const recommended = results.find(r => r.isRecommended);
  const weekGrid = recommended?.semaineUsed ? buildWeekGrid(recommended.dailyBreakdown) : [];
  const maxCost = results.length > 0 ? Math.max(...results.map(r => r.totalCost)) : 0;

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#191F28] font-sans selection:bg-[#2F62E0] selection:text-white pb-24 lg:pb-0">
      <header className="border-b border-[#191F28]/5 bg-white/85 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/navigo-easy.png"
              alt="나비고 이지 카드"
              width={30}
              height={46}
              className="h-[46px] w-auto shrink-0 drop-shadow-[0_2px_4px_rgba(25,31,40,0.25)]"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-tight">파리 여행 최적 교통권 추천</h1>
              <p className="text-[10px] uppercase tracking-widest text-[#5B6573] font-semibold">2026 Edition ©외눈이</p>
            </div>
          </div>
          <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-[#4E5968] bg-white rounded-full px-3 py-2 border border-[#191F28]/5">
            <Info size={14} className="text-[#2F62E0]" /> 요금 기준 {PRICE_BASIS_DATE}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 pt-5 pb-12">
        {/* 홍보 섹션 */}
        <div className="bg-white rounded-2xl mb-5 shadow-[0_2px_10px_rgba(25,31,40,0.05)]">
          <div className="px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[13px] font-medium text-[#4E5968]">
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ===================== 선택 영역 ===================== */}
          <section id="steps" className="lg:col-span-5 space-y-3.5 scroll-mt-20">
            <div className="px-0.5">
              <h2 className="text-2xl font-bold tracking-tight">내 여행 정보 선택</h2>
              <p className="text-sm text-[#4E5968] mt-1">아래 4가지만 고르면 최적 교통권을 알려드려요</p>
            </div>

            {/* 진행 상태 */}
            <div className={`${CARD} rounded-2xl px-4 py-4`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">4단계 중 {doneCount}단계 선택 완료</span>
                {allDone ? (
                  <span className="text-[13px] font-bold text-[#2F62E0]">준비 끝!</span>
                ) : (
                  <span className="text-[13px] font-bold text-[#075985]">{needMessage}</span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {segs.map((on, i) => (
                  <div key={i} className={`h-2 rounded-full ${on ? 'bg-[#2F62E0]' : 'bg-[#BAE6FD]'}`} />
                ))}
              </div>
            </div>

            {/* 1. 날짜 */}
            <section aria-labelledby="step-date" className={`${CARD} p-5`}>
              <StepHeader id="step-date" n={1} title="파리 여행 날짜" sub="도착일과 출발일" done={dateDone} />
              <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                <label htmlFor="arrivalDate" className={`block rounded-2xl border-2 px-3.5 py-2.5 ${dateDone ? 'border-[#2F62E0] bg-[#F3F7FF]' : 'border-[#E5E8EB] bg-white'}`}>
                  <span className="flex items-center gap-1 text-xs text-[#4E5968]"><Calendar size={12} /> PARIS IN (도착)</span>
                  <input
                    type="date"
                    id="arrivalDate"
                    name="arrivalDate"
                    value={input.arrivalDate}
                    onChange={handleInputChange}
                    className="mt-0.5 w-full min-w-0 bg-transparent text-[15px] font-bold text-[#191F28] focus:outline-none box-border"
                  />
                </label>
                <label htmlFor="departureDate" className={`block rounded-2xl border-2 px-3.5 py-2.5 ${dateDone ? 'border-[#2F62E0] bg-[#F3F7FF]' : 'border-[#E5E8EB] bg-white'}`}>
                  <span className="flex items-center gap-1 text-xs text-[#4E5968]"><Calendar size={12} /> PARIS OUT (출발)</span>
                  <input
                    type="date"
                    id="departureDate"
                    name="departureDate"
                    min={input.arrivalDate}
                    value={input.departureDate}
                    onChange={handleInputChange}
                    className="mt-0.5 w-full min-w-0 bg-transparent text-[15px] font-bold text-[#191F28] focus:outline-none box-border"
                  />
                </label>
              </div>
              <div className="mt-2.5 bg-[#F4F6F9] rounded-xl px-3 py-2.5 text-[13px] leading-relaxed text-[#4E5968]">
                {isInvalidDate
                  ? '도착일(Paris In)이 출발일(Paris Out)보다 빠르도록 맞춰 주세요.'
                  : `${nights}박 ${nights + 1}일이에요. 주간권은 월~일 달력 주 단위로만 유효해요.`}
              </div>
            </section>

            {/* 2. 수하물 */}
            <section aria-labelledby="step-bag" className={`${CARD} p-5`}>
              <StepHeader id="step-bag" n={2} title="수하물" sub="1인 기준, 1개 선택" done />
              <div className="mt-3.5 space-y-2">
                {BAG_OPTIONS.map(opt => (
                  <ChoiceRow
                    key={opt.id}
                    selected={input.bagOption === opt.id}
                    onClick={() => setInput(p => ({ ...p, bagOption: opt.id }))}
                    title={opt.label}
                    desc={opt.desc}
                  />
                ))}
              </div>
            </section>

            {/* 3. 교통카드 */}
            <section aria-labelledby="step-card" className={`${CARD} p-5`}>
              <StepHeader id="step-card" n={3} title="교통카드" sub="어떤 카드를 쓸지 1개 선택" done={cardChosen} />
              <div className="mt-3.5 space-y-2">
                {CARD_OPTIONS.map(opt => (
                  <ChoiceRow
                    key={opt.id}
                    selected={cardChosen && input.cardType === opt.id}
                    pending={!cardChosen}
                    onClick={() => {
                      setCardChosen(true);
                      setInput(p => ({ ...p, cardType: opt.id }));
                    }}
                    title={opt.label}
                    desc={opt.desc}
                  />
                ))}
              </div>
              {cardChosen && input.cardType === 'Mobile' && (
                <div className="mt-2.5 space-y-2">
                  <div className="bg-sky-50 border border-sky-200 p-3 rounded-xl flex gap-2 items-start">
                    <AlertCircle className="text-sky-700 shrink-0" size={16} />
                    <p className="text-[12px] text-sky-900 leading-relaxed text-left">
                      갤럭시 일부 기종에서는 모바일 나비고가 잘 안 된다는 보고가 있어요.
                      안전하게 가려면 <strong>실물카드 구매를 추천</strong>합니다.
                    </p>
                  </div>
                  <a
                    href={MOBILE_NAVIGO_GUIDE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 bg-[#F4F6F9] rounded-xl px-4 py-3 text-[13px] font-bold hover:bg-[#EAF0FF] transition-all"
                  >
                    <span>📱 파리 교통카드(나비고) 앱 가입방법</span>
                    <span className="text-[11px] font-normal text-[#5B6573] shrink-0">블로그로 이동</span>
                  </a>
                </div>
              )}
              {cardChosen && input.cardType === 'Physical' && (
                <div className="mt-2.5 bg-[#F4F6F9] rounded-xl px-3 py-2.5 text-[13px] leading-relaxed text-[#4E5968]">
                  공항에서는 이지(2€)만 살 수 있어요. 데쿠베르트(5€)는 시내 창구에서 만드세요.
                </div>
              )}
            </section>

            {/* 4. 하루 이용 횟수 */}
            <section aria-labelledby="step-trips" className={`${CARD} p-5`}>
              <StepHeader id="step-trips" n={4} title="하루 대중교통 이용 횟수" sub="공항 이동은 빼고, 시내에서 타는 횟수" done required={false} />
              <div className="mt-3.5 flex items-center justify-between bg-[#F4F6F9] rounded-2xl p-2.5">
                <button
                  type="button"
                  aria-label="이용 횟수 줄이기"
                  onClick={() => changeDailyTrips(-1)}
                  disabled={input.dailyTrips <= 0}
                  className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center disabled:opacity-40"
                >
                  <Minus size={20} strokeWidth={2.6} />
                </button>
                <span className="text-[32px] font-bold tracking-tight" aria-live="polite">
                  {input.dailyTrips}
                  <span className="text-lg font-medium text-[#4E5968] ml-0.5">회</span>
                </span>
                <button
                  type="button"
                  aria-label="이용 횟수 늘리기"
                  onClick={() => changeDailyTrips(1)}
                  disabled={input.dailyTrips >= 10}
                  className="w-12 h-12 rounded-2xl bg-[#2F62E0] text-white flex items-center justify-center disabled:opacity-40"
                >
                  <Plus size={20} strokeWidth={2.6} />
                </button>
              </div>
              <p className="mt-2.5 text-xs text-[#5B6573]">기본값은 4회예요. 0~10회까지 고를 수 있어요.</p>

              <div className="mt-3.5 pt-3.5 border-t border-[#ECEFF3]">
                <p className="text-sm font-bold">도착일 · 출발일 시내 이용 <span className="text-xs font-normal text-[#5B6573]">(선택사항)</span></p>
                <p className="text-xs text-[#5B6573] mt-0.5">공항 이동(RER/택시)을 제외하고, 도착일·출발일에 시내에서 추가로 타는 횟수예요. 기본값은 0회입니다.</p>
                <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                  {([
                    { name: 'arrivalDayTrips', label: '도착일', value: input.arrivalDayTrips },
                    { name: 'departureDayTrips', label: '출발일', value: input.departureDayTrips },
                  ] as const).map(f => (
                    <div key={f.name}>
                      <label htmlFor={f.name} className="text-xs text-[#4E5968] block mb-1">{f.label} 시내 이용</label>
                      <select
                        id={f.name}
                        name={f.name}
                        value={f.value}
                        onChange={handleInputChange}
                        className="w-full bg-[#F4F6F9] rounded-xl px-3 py-3 min-h-[46px] text-sm font-medium text-[#191F28] focus:outline-none box-border"
                      >
                        {Array.from({ length: 11 }, (_, n) => (
                          <option key={n} value={n}>{n}회</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 결과 보기 버튼 (모바일) */}
            <div className="lg:hidden">
              {allDone ? (
                <a
                  href="#results"
                  className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-[#2F62E0] text-white text-[17px] font-bold shadow-[0_6px_16px_rgba(47,98,224,0.28)]"
                >
                  최적 교통권 보기 <ChevronRight size={20} strokeWidth={2.6} />
                </a>
              ) : (
                <div role="status" className="flex items-center justify-center h-14 rounded-2xl bg-[#E5E8EB] text-[#4E5968] text-[15px] font-bold">
                  {needMessage}
                </div>
              )}
            </div>
          </section>

          {/* ===================== 결과 영역 ===================== */}
          <section id="results" className="lg:col-span-7 space-y-5 scroll-mt-20">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">추천 결과</h2>
                <p className="text-sm text-[#4E5968] mt-1">가장 경제적인 이동 전략을 확인하세요.</p>
              </div>
              <a href="#steps" className="lg:hidden shrink-0 text-[13px] font-bold text-[#2F62E0] bg-[#EAF0FF] rounded-full px-4 py-2.5">
                선택 수정하기
              </a>
            </div>

            {/* 내가 고른 조건 */}
            {allDone && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-[#5B6573] mr-0.5">내가 고른 조건</span>
                {[
                  `${format(parseISO(input.arrivalDate), 'MM.dd')}~${format(parseISO(input.departureDate), 'MM.dd')}`,
                  bagInfo.label,
                  cardInfo.label,
                  `하루 ${input.dailyTrips}회`,
                ].map(chip => (
                  <span key={chip} className="text-xs font-bold bg-white rounded-full px-2.5 py-1.5">{chip}</span>
                ))}
              </div>
            )}

            <div className="space-y-5">
              <AnimatePresence mode="wait">
                {isInvalidDate ? (
                  <motion.div
                    key="date-error"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white border-2 border-dashed border-[#191F28]/15 p-10 rounded-3xl text-center"
                  >
                    <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle size={32} />
                    </div>
                    <h3 className="text-lg font-bold mb-2">날짜를 조정 중이신가요?</h3>
                    <p className="text-sm text-[#4E5968] leading-relaxed text-center">
                      도착일(Paris In)이 출발일(Paris Out)보다 빠르도록<br />
                      여행 일정을 맞춰주시면 최적의 교통권을 계산해 드립니다.
                    </p>
                  </motion.div>
                ) : !cardChosen ? (
                  <motion.div
                    key="need-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-[#F0F9FF] border-2 border-dashed border-[#38BDF8] p-10 rounded-3xl text-center"
                  >
                    <div className="w-16 h-16 bg-[#E0F2FE] text-[#075985] rounded-full flex items-center justify-center mx-auto mb-4">
                      <CreditCard size={30} />
                    </div>
                    <h3 className="text-lg font-bold mb-2">교통카드를 선택해 주세요</h3>
                    <p className="text-sm text-[#4E5968] leading-relaxed text-center">
                      카드 종류에 따라 요금과 추천 방법이 달라져요.<br />
                      3번에서 모바일 나비고 또는 실물카드를 고르면 결과가 나와요.
                    </p>
                    <a href="#step-card" className="inline-block mt-4 text-[13px] font-bold text-[#075985] bg-[#E0F2FE] rounded-full px-4 py-2.5 lg:hidden">
                      카드 선택하러 가기
                    </a>
                  </motion.div>
                ) : (
                  results.map((res, idx) => (
                    <React.Fragment key={res.name}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`relative overflow-hidden rounded-3xl p-6 bg-white ${
                        res.isRecommended
                          ? 'border-2 border-[#2F62E0] shadow-[0_8px_28px_rgba(47,98,224,0.15)]'
                          : 'border border-[#191F28]/10 opacity-90 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-5">
                        <div className="space-y-1.5">
                          {res.isRecommended ? (
                            <span className="inline-block text-xs font-bold text-[#2F62E0] bg-[#EAF0FF] rounded-lg px-2 py-1">추천 1위</span>
                          ) : (
                            <span className="inline-block text-xs font-bold text-[#4E5968] bg-[#F2F4F6] rounded-lg px-2 py-1">{idx + 1}위</span>
                          )}
                          <h3 className="text-xl font-bold">{res.name}</h3>
                          {res.cardName && (
                            <p className="text-[11px] font-bold tracking-wide text-[#5B6573]">{res.cardName}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-bold text-[#5B6573]">예상 비용</p>
                          <p className={`text-3xl font-bold tracking-tight ${res.isRecommended ? 'text-[#2F62E0]' : ''}`}>
                            €{res.totalCost.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {res.isRecommended && res.savingsVsNext !== undefined && res.savingsVsNext > 0.005 && (
                        <div className="flex items-center gap-2 bg-[#F4F6F9] rounded-xl px-3.5 py-3 mb-4">
                          <Check size={18} strokeWidth={3} className="text-[#2F62E0] shrink-0" />
                          <span className="text-sm font-bold">다음으로 저렴한 방법보다 €{res.savingsVsNext.toFixed(2)} 절약돼요</span>
                        </div>
                      )}

                      <div className="p-4 rounded-2xl mb-5 bg-[#F4F6F9]">
                        <p className="text-sm leading-relaxed text-[#191F28]/90 mb-4 text-left">
                          {res.description}
                        </p>
                        <div className="space-y-2 border-t border-[#191F28]/10 pt-4">
                          <p className="text-[11px] font-bold text-[#5B6573] mb-2 text-left">날짜별 상세 정보</p>
                          <div className="grid grid-cols-1 gap-1.5">
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

                      <div className="flex items-center gap-4 text-[11px] font-bold text-[#4E5968]">
                        <div className="flex items-center gap-1">
                          <TrainFront size={14} /> {input.bagOption === 'MultiCarrier' ? 'Taxi Included' : 'RER Included'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Info size={14} /> 요금 기준 {PRICE_BASIS_DATE}
                        </div>
                      </div>
                    </motion.div>

                    {idx === 0 && weekGrid.length > 0 && (
                      <div className={`${CARD} p-5`}>
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold">날짜별 적용</h3>
                          <span className="text-xs text-[#5B6573]">
                            {input.bagOption === 'MultiCarrier' ? '택시는 별도 결제' : '공항 RER 포함'}
                          </span>
                        </div>
                        <div className="mt-3.5 grid grid-cols-7 gap-1.5 text-center">
                          {WEEK_HEAD.map((w, i) => (
                            <span key={w} className={`text-xs ${i === 5 ? 'text-blue-600' : i === 6 ? 'text-red-600' : 'text-[#5B6573]'}`}>{w}</span>
                          ))}
                          {weekGrid.map(d => (
                            <span
                              key={d.iso}
                              className={`h-9 rounded-xl text-[13px] flex items-center justify-center ${
                                d.covered
                                  ? 'bg-[#2F62E0] text-white font-bold'
                                  : d.inTrip
                                    ? 'bg-white border-2 border-[#C9D3E6] text-[#191F28] font-bold'
                                    : 'bg-[#F2F4F6] text-[#5B6573]'
                              }`}
                            >
                              {d.label}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#4E5968]">
                          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#2F62E0]" /> 주간권 적용</span>
                          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-[#C9D3E6] bg-white" /> 그 외 이용일</span>
                          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#F2F4F6]" /> 여행 외</span>
                        </div>
                        <p className="mt-2.5 text-xs text-[#5B6573]">주간권은 월~일 달력 주 단위로만 유효해요.</p>
                      </div>
                    )}

                    {idx === 0 && (
                      <div className={`${CARD} p-5`}>
                        <h3 className="text-base font-bold">다른 방법과 비교</h3>
                        <div className="mt-3.5 space-y-3">
                          {results.map(r => (
                            <div key={r.name}>
                              <div className={`flex justify-between text-[13px] ${r.isRecommended ? 'font-bold' : 'text-[#4E5968]'}`}>
                                <span>{r.name}</span>
                                <span>€{r.totalCost.toFixed(2)}</span>
                              </div>
                              <div className="mt-1.5 h-2.5 rounded-full bg-[#F2F4F6]">
                                <div
                                  className={`h-2.5 rounded-full ${r.isRecommended ? 'bg-[#2F62E0]' : 'bg-[#B7C4DA]'}`}
                                  style={{ width: `${maxCost > 0 ? Math.max(4, (r.totalCost / maxCost) * 100) : 0}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    </React.Fragment>
                  ))
                )}
              </AnimatePresence>
            </div>

            {allDone && (
              <div className={`${CARD} p-6 space-y-5`}>
                <div className="flex items-center gap-2 text-[#2F62E0]">
                  <AlertCircle size={20} />
                  <h4 className="font-bold text-sm">Expert Advice</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-[#5B6573] text-left">선정이유</p>
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
                    <p className="text-xs font-bold text-[#5B6573]">주의사항</p>
                    <ul className="text-sm space-y-1 list-disc list-inside text-[#191F28]/80">
                      <li>실물 나비고 데쿠베르트는 공항구매 불가, 증명사진 필수</li>
                      <li>파리 in/out날은 공항-시내 간 이동을 기본으로 계산하고, 위에서 선택한 당일 시내 이용 횟수(기본 0회)를 더해요</li>
                      <li>택시는 2026 CDG 정액(우안 56€ 기준, 좌안은 65€)으로 산정 · 예약비 별도</li>
                      <li>요금은 {PRICE_BASIS_DATE} 기준이며 매년 1월에 바뀔 수 있어요</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* ===================== 카드 비교 · 현지 팁 ===================== */}
            <div id="tips" className="space-y-3.5 scroll-mt-20">
              <div className="px-0.5 pt-2">
                <h2 className="text-2xl font-bold tracking-tight">카드는 이렇게 달라요</h2>
                <p className="text-sm font-bold text-[#2F62E0] mt-1">이지 vs 데쿠베르트</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'easy', title: '나비고 이지', highlight: false },
                  { key: 'dec', title: '나비고 데쿠베르트', highlight: true },
                ] as const).map(col => (
                  <div
                    key={col.key}
                    className={`${CARD} p-4 space-y-3 ${col.highlight ? 'border-2 border-[#2F62E0]' : 'border-2 border-transparent'}`}
                  >
                    <div>
                      <p className="text-[13px] text-[#5B6573]">{col.title}</p>
                      <p className="text-2xl font-bold tracking-tight">{col.key === 'easy' ? '2€' : '5€'}</p>
                    </div>
                    {[...CARD_COMPARE_MAIN.slice(1), ...(showCardCompare ? CARD_COMPARE_MORE : [])].map(row => (
                      <div key={row.label}>
                        <p className="text-[11px] text-[#5B6573]">{row.label}</p>
                        <p className="text-[13px] leading-snug">{row[col.key]}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <button
                type="button"
                aria-expanded={showCardCompare}
                onClick={() => setShowCardCompare(v => !v)}
                className="w-full flex items-center justify-between gap-2 bg-white rounded-2xl px-4 py-3.5 text-[13px] font-bold shadow-[0_2px_10px_rgba(25,31,40,0.05)] hover:bg-[#F3F7FF] transition-all"
              >
                <span>{showCardCompare ? '간단히 보기' : '충전 가능 · 구매처 · 분실·도난 자세히 보기'}</span>
                <ChevronRight size={16} className={`transition-transform ${showCardCompare ? 'rotate-90' : ''}`} />
              </button>

              {showCardCompare && (
                <ul className="bg-white rounded-2xl p-4 text-[12px] text-[#191F28]/75 space-y-1.5 list-disc list-inside shadow-[0_2px_10px_rgba(25,31,40,0.05)]">
                  <li>공항 티켓(14€)과 1회권은 같은 이지카드에 동시에 담을 수 없어요. 공항 티켓을 다 쓴 뒤에 1회권을 충전하세요.</li>
                  <li>일일권은 공항 구간에서는 쓸 수 없어요. 공항 이동 비용은 따로 계산돼요.</li>
                  <li>데쿠베르트는 공항에서 살 수 없어요. 도착일에는 이지카드로 시내에 들어온 뒤 창구에서 만드세요(증명사진 필수).</li>
                  <li>주간권은 월요일 0시~일요일 24시까지만 유효해요.</li>
                </ul>
              )}

              {/* 현지 팁 */}
              <div className={`rounded-3xl p-5 flex gap-3 items-start ${showCardTip ? 'bg-[#D7EEFC] ring-2 ring-[#38BDF8]' : 'bg-[#E8F5FD]'}`}>
                <div className="shrink-0 w-10 h-10 rounded-xl bg-[#BAE6FD] flex items-center justify-center text-[#075985]">
                  <MapPin size={22} />
                </div>
                <div className="space-y-1.5 text-left">
                  <p className="text-[15px] font-bold text-[#0C4A6E]">공항에서는 데쿠베르트를 못 사요</p>
                  <p className="text-[13px] leading-relaxed text-[#0B4F73]">
                    파리 공항(CDG)에서는 실물 나비고 데쿠베르트(장기권)를 판매하지 않습니다!
                    공항에서는 우선 <strong>나비고 이지(2€)</strong>를 사서 공항용 티켓을 충전해 시내로 이동하신 후,
                    숙소 근처 역에서 데쿠베르트를 만드실 수 있습니다(증명 사진 필수).
                  </p>
                  <p className="text-[13px] leading-relaxed text-[#0B4F73]">
                    <strong>지도 보는 법:</strong> 공식 지도에서 <strong>파란색 핀(Guichets Navigo)</strong>은 직원이 있는
                    나비고 전용 창구라서 데쿠베르트를 구매할 확률이 높습니다. 회색 핀(Points de vente)은 판매만 하는 곳이라
                    발급이 안 될 수 있어요.
                  </p>
                </div>
              </div>

              <a
                href={POINTS_OF_SALE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${CARD} flex items-center justify-between px-5 py-4 hover:bg-[#F3F7FF] transition-all`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF0FF] flex items-center justify-center text-[#2F62E0]">
                    <MapPin size={22} />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold">구매 가능한 역·창구 지도</p>
                    <p className="text-xs text-[#5B6573]">IDFM 공식 지도로 이동</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-[#8B95A1]" />
              </a>

              <a
                href={MOBILE_NAVIGO_GUIDE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${CARD} flex items-center justify-between px-5 py-4 hover:bg-[#F3F7FF] transition-all`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF0FF] flex items-center justify-center text-[#2F62E0]">
                    <Smartphone size={22} />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold">모바일 나비고 앱 가입 방법</p>
                    <p className="text-xs text-[#5B6573]">외눈이 블로그로 이동</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-[#8B95A1]" />
              </a>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-[#191F28]/5 py-10 bg-white/60">
        <div className="max-w-4xl mx-auto px-5 text-center space-y-4">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#191F28]/40">
            Paris Transport Optimizer &copy; 2026
          </p>
          <div className="flex justify-center gap-8 text-[#191F28]/20">
            <TrainFront size={24} />
            <Navigation size={24} />
            <Briefcase size={24} />
          </div>
        </div>
      </footer>

      {/* 모바일 하단 탭: 각 구역으로 이동 */}
      <nav aria-label="바로가기" className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-[#ECEFF3] h-[68px] flex items-center justify-around">
        <a href="#steps" className="flex flex-col items-center gap-1 text-[11px] font-bold text-[#191F28]">
          <House size={24} /> <span>홈</span>
        </a>
        <a href="#results" className="flex flex-col items-center gap-1 text-[11px] font-medium text-[#5B6573]">
          <Ticket size={24} /> <span>추천 결과</span>
        </a>
        <a href="#tips" className="flex flex-col items-center gap-1 text-[11px] font-medium text-[#5B6573]">
          <CreditCard size={24} /> <span>카드·팁</span>
        </a>
        <a href={POINTS_OF_SALE_URL} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 text-[11px] font-medium text-[#5B6573]">
          <MapPin size={24} /> <span>구매처</span>
        </a>
      </nav>
    </div>
  );
}
