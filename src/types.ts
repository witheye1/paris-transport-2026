import { addDays, differenceInDays, format, parseISO, getDay } from 'date-fns';

export type CardType = 'Mobile' | 'Physical';
export type BagOption = 'Backpack' | 'Backpack+Carrier' | 'MultiCarrier';

export interface DailyDetail {
  /** 화면 표시용 (MM/dd) */
  date: string;
  /** 요일 계산용 (yyyy-MM-dd) - 연말연시에도 연도가 틀리지 않도록 별도 저장 */
  iso: string;
  passType: string;
  cost: number;
}

export interface TravelInput {
  arrivalDate: string;
  departureDate: string;
  bagOption: BagOption;
  dailyTrips: number;
  cardType: CardType;
}

export interface StrategyResult {
  name: string;
  totalCost: number;
  description: string;
  dailyBreakdown: DailyDetail[];
  cardName?: string;
  isRecommended?: boolean;
  /** 주간권(Semaine)을 실제로 사용했는지 */
  semaineUsed?: boolean;
  /** 다음으로 저렴한 전략 대비 절약액 (추천 전략에만 설정) */
  savingsVsNext?: number;
}

/** 요금 기준일 - 매년 1월에 개정되므로 갱신 시 이 값과 아래 가격을 같이 수정하세요. */
export const PRICE_BASIS_DATE = '2026-01-01';

export const PASS_PRICES = {
  SINGLE: 2.55,
  JOUR: 12.30,
  SEMAINE: 32.40,
  AIRPORT_RER: 14.00,
  /** 2026 파리 택시 CDG 정액(우안 56€ / 좌안 65€) 중 우안 기준. 예약비(4~7€)는 별도 */
  AIRPORT_TAXI: 56.00,
  AIRPORT_TAXI_LEFT_BANK: 65.00,
};

export const CARD_FEES = {
  Easy: 2.00,
  Decouverte: 5.00,
  Mobile: 0.00,
};

const dayLabel = (d: Date) => format(d, 'MM/dd');
const dayIso = (d: Date) => format(d, 'yyyy-MM-dd');
const sameDay = (a: Date, b: Date) => a.getTime() === b.getTime();

export function calculateStrategies(input: TravelInput): StrategyResult[] {
  const start = parseISO(input.arrivalDate);
  const end = parseISO(input.departureDate);
  const totalDays = differenceInDays(end, start) + 1;

  if (totalDays <= 0) return [];

  const useTaxi = input.bagOption === 'MultiCarrier';
  const airportTransferCost = useTaxi ? PASS_PRICES.AIRPORT_TAXI : PASS_PRICES.AIRPORT_RER;
  const days = Array.from({ length: totalDays }, (_, i) => addDays(start, i));
  const lastIdx = days.length - 1;

  /** 그날 공항 이동 횟수 (도착일 1 + 출발일 1, 당일 입출국이면 2) */
  const airportTrips = (i: number) => (i === 0 ? 1 : 0) + (i === lastIdx ? 1 : 0);
  const isAirportDay = (i: number) => airportTrips(i) > 0;

  /** 시내 이동 하루 비용: 1회권 N회 vs 일일권 중 저렴한 쪽 */
  const cityDayCost = Math.min(input.dailyTrips * PASS_PRICES.SINGLE, PASS_PRICES.JOUR);

  /** 주간권 없이 보낼 때 그날의 비용 (공항 이동일은 공항비) */
  const normalDayCost = (i: number) =>
    isAirportDay(i) ? airportTransferCost * airportTrips(i) : cityDayCost;

  /** 공항 이동 라벨: 도착일은 공항→시내, 출발일은 시내→공항 (당일 입출국이면 둘 다) */
  const airportLabel = (i: number) => {
    const mode = useTaxi ? '택시' : 'RER';
    if (i === 0 && i === lastIdx) return `${mode} (공항→시내 + 시내→공항)`;
    return i === 0 ? `${mode} (공항→시내)` : `${mode} (시내→공항)`;
  };

  const normalDayLabel = (i: number) =>
    isAirportDay(i) ? airportLabel(i) : '1회권/일일권 조합';

  // --- 1. Single Ticket Strategy ---
  const singleBreakdown: DailyDetail[] = days.map((day, i) => ({
    date: dayLabel(day),
    iso: dayIso(day),
    passType: isAirportDay(i) ? airportLabel(i) : `1회권 ${input.dailyTrips}회`,
    cost: isAirportDay(i)
      ? airportTransferCost * airportTrips(i)
      : input.dailyTrips * PASS_PRICES.SINGLE,
  }));
  // 택시 이용 시 시내 이동이 없으면 이지카드 불필요
  const needsEasySingle = input.cardType === 'Physical' && (!useTaxi || input.dailyTrips > 0);
  const singleTotal =
    singleBreakdown.reduce((acc, cur) => acc + cur.cost, 0) + (needsEasySingle ? CARD_FEES.Easy : 0);

  // --- 2. Daily Pass Strategy ---
  const dailyBreakdown: DailyDetail[] = days.map((day, i) => ({
    date: dayLabel(day),
    iso: dayIso(day),
    passType: isAirportDay(i) ? airportLabel(i) : '일일권(Jour)',
    cost: isAirportDay(i) ? airportTransferCost * airportTrips(i) : PASS_PRICES.JOUR,
  }));
  const needsEasyDaily = input.cardType === 'Physical' && (!useTaxi || input.dailyTrips > 0);
  const dailyTotal =
    dailyBreakdown.reduce((acc, cur) => acc + cur.cost, 0) + (needsEasyDaily ? CARD_FEES.Easy : 0);

  // --- 3. Hybrid Strategy (주간권 최적화) ---
  // 주간권(Navigo Semaine)은 월~일 달력 주 단위로만 유효하므로 주 단위로 나눠서 판단합니다.
  // 핵심: 주간권과 비교할 "대안 비용"에는 공항 이동일의 공항비도 반드시 포함합니다.
  // (주간권은 RER 공항 이동까지 포함하므로, 공항비가 큰 짧은 일정에서도 주간권이 유리할 수 있음)
  const isPhysical = input.cardType === 'Physical';

  interface WeekSegment {
    indices: number[]; // 이 주 안에서 주간권으로 덮을 수 있는 날(days의 인덱스)
    excluded: number[]; // 주간권으로 덮지 못하는 날 (실물카드 도착일 등)
  }

  const segments: WeekSegment[] = [];
  let current: number[] = [];
  days.forEach((day, i) => {
    if (i > 0 && getDay(day) === 1) {
      segments.push({ indices: current, excluded: [] });
      current = [];
    }
    current.push(i);
  });
  segments.push({ indices: current, excluded: [] });

  // 실물카드: 도착일(공항)에는 데쿠베르트를 살 수 없으므로 첫 주의 도착일은 주간권에서 제외
  if (isPhysical) {
    const first = segments[0];
    first.excluded = [0];
    first.indices = first.indices.filter(i => i !== 0);
  }

  // 각 주의 비용: 주간권을 쓸 때 vs 안 쓸 때
  const segInfo = segments.map(seg => {
    const alternative = seg.indices.reduce((acc, i) => acc + normalDayCost(i), 0);
    // 택시는 주간권이 있어도 별도 결제
    const taxiExtra = useTaxi
      ? seg.indices.reduce((acc, i) => acc + PASS_PRICES.AIRPORT_TAXI * airportTrips(i), 0)
      : 0;
    const withSemaine = seg.indices.length > 0 ? PASS_PRICES.SEMAINE + taxiExtra : Infinity;
    return { seg, alternative, withSemaine, delta: withSemaine - alternative };
  });

  // 데쿠베르트(5€)는 한 번만 사면 되므로: 이득인 주를 모두 쓴 합계가 카드비보다 클 때만 주간권 사용
  const beneficial = segInfo.filter(s => s.delta < 0);
  const totalGain = -beneficial.reduce((acc, s) => acc + s.delta, 0);
  const decouverteFee = isPhysical ? CARD_FEES.Decouverte : 0;
  const useSemaineWeeks = new Set<WeekSegment>(
    totalGain > decouverteFee ? beneficial.map(s => s.seg) : []
  );
  const semaineUsed = useSemaineWeeks.size > 0;

  const hybridBreakdown: DailyDetail[] = [];
  const passByIndex = new Map<number, DailyDetail>();

  segInfo.forEach(({ seg }) => {
    const covered = useSemaineWeeks.has(seg);
    seg.indices.forEach((i, idx) => {
      const day = days[i];
      let passType: string;
      let cost: number;
      if (covered) {
        const isFirstOfPass = idx === 0;
        const taxiToday = useTaxi && isAirportDay(i) ? PASS_PRICES.AIRPORT_TAXI * airportTrips(i) : 0;
        if (isFirstOfPass) {
          passType = isPhysical && i === 1 && !isAirportDay(i)
            ? '주간권 시작 (데쿠베르트)'
            : '주간권 시작 (Semaine)';
        } else {
          passType = '주간권(Semaine)';
        }
        if (taxiToday > 0) passType = `${airportLabel(i)} + ${passType}`;
        else if (isAirportDay(i)) passType = `${passType} · ${airportLabel(i)} 포함`;
        cost = (isFirstOfPass ? PASS_PRICES.SEMAINE : 0) + taxiToday;
      } else {
        passType = normalDayLabel(i);
        cost = normalDayCost(i);
      }
      passByIndex.set(i, { date: dayLabel(day), iso: dayIso(day), passType, cost });
    });
    seg.excluded.forEach(i => {
      const day = days[i];
      passByIndex.set(i, {
        date: dayLabel(day),
        iso: dayIso(day),
        passType: useTaxi ? airportLabel(i) : `${airportLabel(i)} · 이지카드`,
        cost: normalDayCost(i),
      });
    });
  });
  for (let i = 0; i < days.length; i++) {
    const d = passByIndex.get(i);
    if (d) hybridBreakdown.push(d);
  }

  // 카드비: 이지카드는 주간권이 덮지 않는 날에 돈이 드는 이동(RER/1회권/일일권)이 있을 때만 필요
  let hybridCardFee = 0;
  let finalHybridCardName = isPhysical ? '나비고 이지(2€)' : '모바일 나비고';

  if (isPhysical) {
    const coveredIdx = new Set<number>();
    segInfo.forEach(({ seg }) => {
      if (useSemaineWeeks.has(seg)) seg.indices.forEach(i => coveredIdx.add(i));
    });
    const usesEasy = days.some((_, i) => {
      if (coveredIdx.has(i)) return false;
      if (isAirportDay(i)) return !useTaxi; // 택시 공항 이동은 카드 불필요
      return cityDayCost > 0;
    });
    if (usesEasy) hybridCardFee += CARD_FEES.Easy;
    if (semaineUsed) hybridCardFee += CARD_FEES.Decouverte;

    if (usesEasy && semaineUsed) finalHybridCardName = '데쿠베르트(5€) + 이지카드(2€)';
    else if (semaineUsed) finalHybridCardName = '나비고 데쿠베르트(5€)';
    else finalHybridCardName = '나비고 이지(2€)';
  }

  const hybridTotal = hybridBreakdown.reduce((acc, cur) => acc + cur.cost, 0) + hybridCardFee;

  const cardNameBasic = isPhysical ? '나비고 이지(2€)' : '모바일 나비고';

  const results: StrategyResult[] = [
    {
      name: '1회권 조합',
      totalCost: singleTotal,
      description: '공항 왕복 + 시내 이동 시마다 1회권 결제.',
      dailyBreakdown: singleBreakdown,
      cardName: cardNameBasic,
    },
    {
      name: '일일권 조합',
      totalCost: dailyTotal,
      description: '공항 왕복 + 시내 체류일 일일권(Jour) 이용.',
      dailyBreakdown,
      cardName: cardNameBasic,
    },
    {
      name: '최적 하이브리드',
      totalCost: hybridTotal,
      description: semaineUsed
        ? '주간권(Semaine)을 포함한 가장 경제적인 조합입니다.'
        : '일정이 짧아 1회권/일일권 조합이 더 유리합니다.',
      dailyBreakdown: hybridBreakdown,
      cardName: finalHybridCardName,
      semaineUsed,
    },
  ];

  const priority: Record<string, number> = { '1회권 조합': 1, '일일권 조합': 2, '최적 하이브리드': 3 };
  const sorted = results
    .sort((a, b) => {
      // 1. 비용이 다르면 저렴한 순서
      if (Math.abs(a.totalCost - b.totalCost) > 0.01) return a.totalCost - b.totalCost;
      // 2. 비용이 같으면 '1회권 > 일일권 > 하이브리드' 순
      return priority[a.name] - priority[b.name];
    })
    .map((res, idx) => ({ ...res, isRecommended: idx === 0 }));

  // 추천 전략의 절약액 (2위 대비)
  if (sorted.length > 1) {
    sorted[0].savingsVsNext = Math.max(0, sorted[1].totalCost - sorted[0].totalCost);
  }
  return sorted;
}
