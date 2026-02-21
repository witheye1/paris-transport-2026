import { addDays, differenceInDays, format, isAfter, isBefore, parseISO, startOfWeek, endOfWeek, getDay } from 'date-fns';

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

  const getDayList = () => {
    const list = [];
    for (let i = 0; i < totalDays; i++) {
      list.push(addDays(start, i));
    }
    return list;
  };

  const days = getDayList();

  // 1. Single Ticket Strategy
  const singleBreakdown: DailyDetail[] = days.map((day, i) => {
    const isArrival = i === 0;
    const isDeparture = i === days.length - 1;
    if (isArrival || isDeparture) {
      return { date: format(day, 'MM/dd'), passType: useTaxi ? '공항 택시' : '공항 RER', cost: airportTransferCost };
    }
    return { date: format(day, 'MM/dd'), passType: `1회권 ${input.dailyTrips}회`, cost: input.dailyTrips * PASS_PRICES.SINGLE };
  });
  const singleCost = singleBreakdown.reduce((acc, curr) => acc + curr.cost, 0) + (input.cardType === 'Physical' ? CARD_FEES.Easy : 0);

  // 2. Daily Pass Strategy
  const dailyBreakdown: DailyDetail[] = days.map((day, i) => {
    const isArrival = i === 0;
    const isDeparture = i === days.length - 1;
    if (isArrival || isDeparture) {
      return { date: format(day, 'MM/dd'), passType: useTaxi ? '공항 택시' : '공항 RER', cost: airportTransferCost };
    }
    const cost = Math.min(input.dailyTrips * PASS_PRICES.SINGLE, PASS_PRICES.JOUR);
    return { date: format(day, 'MM/dd'), passType: cost === PASS_PRICES.JOUR ? '일일권(Jour)' : `1회권 ${input.dailyTrips}회`, cost };
  });
  const dailyCost = dailyBreakdown.reduce((acc, curr) => acc + curr.cost, 0) + (input.cardType === 'Physical' ? CARD_FEES.Easy : 0);

  // 3. Hybrid / Weekly Strategy
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  days.forEach((day, index) => {
    if (index > 0 && getDay(day) === 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  });
  weeks.push(currentWeek);

  let hybridBreakdown: DailyDetail[] = [];
  let semaineUsed = false;
  let semaineFirstDayIndex = -1;

  weeks.forEach((weekDays, weekIdx) => {
    const isArrivalWeek = weekIdx === 0;
    const arrivalDayOfWeek = getDay(weekDays[0]);
    const canBuySemaine = isArrivalWeek ? (arrivalDayOfWeek >= 1 && arrivalDayOfWeek <= 4) : true;

    let weekBasicCost = 0;
    const weekBasicDetails: DailyDetail[] = weekDays.map((day) => {
      const isArrivalDay = day.getTime() === start.getTime();
      const isDepartureDay = day.getTime() === end.getTime();
      if (isArrivalDay || isDepartureDay) {
        return { date: format(day, 'MM/dd'), passType: useTaxi ? '공항 택시' : '공항 RER', cost: airportTransferCost };
      }
      const cost = Math.min(input.dailyTrips * PASS_PRICES.SINGLE, PASS_PRICES.JOUR);
      return { date: format(day, 'MM/dd'), passType: cost === PASS_PRICES.JOUR ? '일일권(Jour)' : `1회권 ${input.dailyTrips}회`, cost };
    });
    weekBasicCost = weekBasicDetails.reduce((acc, curr) => acc + curr.cost, 0);

    if (canBuySemaine) {
      let semaineWeekCost = PASS_PRICES.SEMAINE;
      const semaineDetails: DailyDetail[] = weekDays.map((day, dIdx) => {
        const isArrivalDay = day.getTime() === start.getTime();
        const isDepartureDay = day.getTime() === end.getTime();
        
        // Cost logic for Semaine in breakdown: first day shows full price, others 0
        const isFirstDayOfSemaineInThisWeek = dIdx === 0;
        const displayCost = isFirstDayOfSemaineInThisWeek ? PASS_PRICES.SEMAINE : 0;

        if (useTaxi && (isArrivalDay || isDepartureDay)) {
          return { date: format(day, 'MM/dd'), passType: '공항 택시 + 주간권', cost: PASS_PRICES.AIRPORT_TAXI + displayCost };
        }
        return { date: format(day, 'MM/dd'), passType: '주간권(Semaine)', cost: displayCost };
      });
      
      if (semaineWeekCost < weekBasicCost) {
        hybridBreakdown = hybridBreakdown.concat(semaineDetails);
        semaineUsed = true;
      } else {
        hybridBreakdown = hybridBreakdown.concat(weekBasicDetails);
      }
    } else {
      hybridBreakdown = hybridBreakdown.concat(weekBasicDetails);
    }
  });

  let hybridTotal = hybridBreakdown.reduce((acc, curr) => acc + curr.cost, 0);
  
  // Card fee logic
  let hybridCardFee = 0;
  let hybridCardName = input.cardType === 'Mobile' ? '모바일 나비고' : '나비고 이지';
  if (input.cardType === 'Physical') {
    if (semaineUsed) {
      hybridCardFee = CARD_FEES.Decouverte;
      hybridCardName = '나비고 데쿠베르트';
    } else {
      hybridCardFee = CARD_FEES.Easy;
      hybridCardName = '나비고 이지';
    }
  }
  hybridTotal += hybridCardFee;

  const results: StrategyResult[] = [
    {
      name: "1회권 조합",
      totalCost: singleCost,
      description: `공항 왕복(${useTaxi ? '택시' : 'RER'}) + 시내 이동 1회권 결제.`,
      dailyBreakdown: singleBreakdown,
      cardName: input.cardType === 'Mobile' ? '모바일 나비고' : '나비고 이지'
    },
    {
      name: "일일권(1 Day) 조합",
      totalCost: dailyCost,
      description: `공항 왕복(${useTaxi ? '택시' : 'RER'}) + 시내 체류일 일일권 이용.`,
      dailyBreakdown: dailyBreakdown,
      cardName: input.cardType === 'Mobile' ? '모바일 나비고' : '나비고 이지'
    },
    {
      name: "최적 하이브리드",
      totalCost: hybridTotal,
      description: semaineUsed 
        ? "일정 중 나비고 주간권(Semaine)을 포함하여 공항 이동 및 시내 교통비를 절감하는 최적안입니다."
        : "체류 기간이 짧거나 주말을 끼고 있어 주간권보다 1회권/일일권 조합이 더 저렴합니다.",
      dailyBreakdown: hybridBreakdown,
      cardName: hybridCardName
    }
  ].sort((a, b) => a.totalCost - b.totalCost);

  results[0].isRecommended = true;
  return results;
}
