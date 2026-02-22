import { addDays, differenceInDays, format, parseISO, getDay } from 'date-fns';

export type CardType = 'Mobile' | 'Physical';
export type BagOption = 'Backpack' | 'Backpack+Carrier' | 'MultiCarrier';

export interface DailyDetail {
  date: string;
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
}

export const PASS_PRICES = {
  SINGLE: 2.55,
  JOUR: 12.30,
  SEMAINE: 32.40,
  AIRPORT_RER: 14.00,
  AIRPORT_TAXI: 55.00,
};

export const CARD_FEES = {
  Easy: 2.00,
  Decouverte: 5.00,
  Mobile: 0.00,
};

export function calculateStrategies(input: TravelInput): StrategyResult[] {
  const start = parseISO(input.arrivalDate);
  const end = parseISO(input.departureDate);
  const totalDays = differenceInDays(end, start) + 1;

  if (totalDays <= 0) return [];

  const useTaxi = input.bagOption === 'MultiCarrier';
  const airportTransferCost = useTaxi ? PASS_PRICES.AIRPORT_TAXI : PASS_PRICES.AIRPORT_RER;
  const days = Array.from({ length: totalDays }, (_, i) => addDays(start, i));

  // --- 1. Single Ticket Strategy ---
  const singleBreakdown: DailyDetail[] = days.map((day, i) => {
    const isAirportDay = i === 0 || i === days.length - 1;
    if (isAirportDay) return { date: format(day, 'MM/dd'), passType: useTaxi ? '공항 택시' : '공항 RER', cost: airportTransferCost };
    return { date: format(day, 'MM/dd'), passType: `1회권 ${input.dailyTrips}회`, cost: input.dailyTrips * PASS_PRICES.SINGLE };
  });
  const singleTotal = singleBreakdown.reduce((acc, curr) => acc + curr.cost, 0) + (input.cardType === 'Physical' ? CARD_FEES.Easy : 0);

  // --- 2. Daily Pass Strategy ---
  const dailyBreakdown: DailyDetail[] = days.map((day, i) => {
    const isAirportDay = i === 0 || i === days.length - 1;
    if (isAirportDay) return { date: format(day, 'MM/dd'), passType: useTaxi ? '공항 택시' : '공항 RER', cost: airportTransferCost };
    return { date: format(day, 'MM/dd'), passType: '일일권(Jour)', cost: PASS_PRICES.JOUR };
  });
  const dailyTotal = dailyBreakdown.reduce((acc, curr) => acc + curr.cost, 0) + (input.cardType === 'Physical' ? CARD_FEES.Easy : 0);

  // --- 3. Hybrid Strategy (The Core Logic) ---
  let hybridBreakdown: DailyDetail[] = [];
  let decouverteRequired = false;
  let semaineUsed = false;

  // 요일별 그룹화
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  days.forEach((day, i) => {
    if (i > 0 && getDay(day) === 1) { weeks.push(currentWeek); currentWeek = []; }
    currentWeek.push(day);
  });
  weeks.push(currentWeek);

  weeks.forEach((weekDays, weekIdx) => {
    const isFirstWeek = weekIdx === 0;
    const startDayOfWeek = getDay(weekDays[0]); // 1:월, 2:화, 3:수, 4:목...

    if (input.cardType === 'Physical') {
      if (isFirstWeek) {
        // 첫날: 무조건 이지카드로 공항 이동 (14€)
        hybridBreakdown.push({ date: format(weekDays[0], 'MM/dd'), passType: useTaxi ? '공항 택시' : '공항 RER (이지카드)', cost: airportTransferCost });
        
        const restOfWeek = weekDays.slice(1);
        // 월~수 도착인 경우 다음날부터 주간권 검토 (목요일은 가성비 낮아 제외)
        const canBuySemaine = startDayOfWeek >= 1 && startDayOfWeek <= 3 && restOfWeek.length > 0;
        
        if (canBuySemaine) {
          const semaineCost = PASS_PRICES.SEMAINE + CARD_FEES.Decouverte;
          const alternatives = restOfWeek.reduce((acc, d) => acc + Math.min(input.dailyTrips * PASS_PRICES.SINGLE, PASS_PRICES.JOUR), 0);
          
          if (semaineCost < alternatives) {
            decouverteRequired = true;
            semaineUsed = true;
            restOfWeek.forEach((d, idx) => {
              const isEnd = d.getTime() === end.getTime();
              hybridBreakdown.push({ 
                date: format(d, 'MM/dd'), 
                passType: isEnd && useTaxi ? '공항 택시 + 주간권' : (idx === 0 ? '주간권 시작 (데쿠베르트)' : '주간권(Semaine)'), 
                cost: idx === 0 ? PASS_PRICES.SEMAINE : 0 
              });
            });
          } else {
            restOfWeek.forEach(d => {
              const isEnd = d.getTime() === end.getTime();
              if (isEnd) hybridBreakdown.push({ date: format(d, 'MM/dd'), passType: useTaxi ? '공항 택시' : '공항 RER', cost: airportTransferCost });
              else hybridBreakdown.push({ date: format(d, 'MM/dd'), passType: '1회권/일일권 조합', cost: Math.min(input.dailyTrips * PASS_PRICES.SINGLE, PASS_PRICES.JOUR) });
            });
          }
        } else {
          // 목~일 도착은 이번 주 주간권 없이 개별 결제
          restOfWeek.forEach(d => {
            const isEnd = d.getTime() === end.getTime();
            if (isEnd) hybridBreakdown.push({ date: format(d, 'MM/dd'), passType: useTaxi ? '공항 택시' : '공항 RER', cost: airportTransferCost });
            else hybridBreakdown.push({ date: format(d, 'MM/dd'), passType: '1회권/일일권 조합', cost: Math.min(input.dailyTrips * PASS_PRICES.SINGLE, PASS_PRICES.JOUR) });
          });
        }
      } else {
        // 2주차 이후 로직 (월~일 전체 주간권 검토)
        const weekAlternative = weekDays.reduce((acc, d) => acc + Math.min(input.dailyTrips * PASS_PRICES.SINGLE, PASS_PRICES.JOUR), 0);
        const semaineEffectiveCost = decouverteRequired ? PASS_PRICES.SEMAINE : PASS_PRICES.SEMAINE + CARD_FEES.Decouverte;
        
        if (semaineEffectiveCost < weekAlternative) {
          if (!decouverteRequired) { decouverteRequired = true; }
          semaineUsed = true;
          weekDays.forEach((d, idx) => {
            const isEnd = d.getTime() === end.getTime();
            hybridBreakdown.push({ 
              date: format(d, 'MM/dd'), 
              passType: isEnd && useTaxi ? '공항 택시 + 주간권' : '주간권(Semaine)', 
              cost: idx === 0 ? PASS_PRICES.SEMAINE : 0 
            });
          });
        } else {
          weekDays.forEach(d => {
            const isEnd = d.getTime() === end.getTime();
            if (isEnd) hybridBreakdown.push({ date: format(d, 'MM/dd'), passType: useTaxi ? '공항 택시' : '공항 RER', cost: airportTransferCost });
            else hybridBreakdown.push({ date: format(d, 'MM/dd'), passType: '1회권/일일권 조합', cost: Math.min(input.dailyTrips * PASS_PRICES.SINGLE, PASS_PRICES.JOUR) });
          });
        }
      }
    } else {
      // 모바일(Mobile) 로직: 기존 주간권 중심 최적화
      const canBuy = isFirstWeek ? (startDayOfWeek >= 1 && startDayOfWeek <= 4) : true;
      const weekAlternative = weekDays.reduce((acc, d) => acc + Math.min(input.dailyTrips * PASS_PRICES.SINGLE, PASS_PRICES.JOUR), 0);
      
      if (canBuy && PASS_PRICES.SEMAINE < weekAlternative) {
        semaineUsed = true;
        weekDays.forEach((d, idx) => {
          const isStart = d.getTime() === start.getTime();
          const isEnd = d.getTime() === end.getTime();
          const cost = idx === 0 ? PASS_PRICES.SEMAINE : 0;
          if (useTaxi && (isStart || isEnd)) hybridBreakdown.push({ date: format(d, 'MM/dd'), passType: '공항 택시 + 주간권', cost: PASS_PRICES.AIRPORT_TAXI + cost });
          else hybridBreakdown.push({ date: format(d, 'MM/dd'), passType: '주간권(Semaine)', cost });
        });
      } else {
        weekDays.forEach(d => {
          const isStart = d.getTime() === start.getTime();
          const isEnd = d.getTime() === end.getTime();
          if (isStart || isEnd) hybridBreakdown.push({ date: format(d, 'MM/dd'), passType: useTaxi ? '공항 택시' : '공항 RER', cost: airportTransferCost });
          else hybridBreakdown.push({ date: format(d, 'MM/dd'), passType: '1회권/일일권 조합', cost: Math.min(input.dailyTrips * PASS_PRICES.SINGLE, PASS_PRICES.JOUR) });
        });
      }
    }
  });

  const hybridTotal = hybridBreakdown.reduce((acc, curr) => acc + curr.cost, 0) + 
    (input.cardType === 'Physical' ? (CARD_FEES.Easy + (decouverteRequired ? CARD_FEES.Decouverte : 0)) : 0);

  return [
    {
      name: "1회권 조합",
      totalCost: singleTotal,
      description: "공항 왕복 + 시내 이동 시마다 1회권 결제.",
      dailyBreakdown: singleBreakdown,
      cardName: input.cardType === 'Mobile' ? '모바일 나비고' : '나비고 이지'
    },
    {
      name: "일일권 조합",
      totalCost: dailyTotal,
      description: "공항 왕복 + 시내 체류일 일일권(Jour) 이용.",
      dailyBreakdown: dailyBreakdown,
      cardName: input.cardType === 'Mobile' ? '모바일 나비고' : '나비고 이지'
    },
    {
      name: "최적 하이브리드",
      totalCost: hybridTotal,
      description: semaineUsed ? "주간권(Semaine)을 포함한 가장 경제적인 조합입니다." : "일정이 짧아 1회권/일일권 조합이 더 유리합니다.",
      dailyBreakdown: hybridBreakdown,
      cardName: input.cardType === 'Mobile' ? '모바일 나비고' : (decouverteRequired ? '데쿠베르트 + 이지카드' : '나비고 이지'),
      isRecommended: true
    }
  ].sort((a, b) => a.totalCost - b.totalCost);
}
