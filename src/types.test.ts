import { describe, it, expect } from 'vitest';
import { calculateStrategies, PASS_PRICES } from './types';

const base = { bagOption: 'Backpack+Carrier', cardType: 'Mobile' } as const;
const rec = (input: Parameters<typeof calculateStrategies>[0]) =>
  calculateStrategies(input).find(r => r.isRecommended)!;

describe('calculateStrategies', () => {
  it('목~일 짧은 일정은 하루 이동 횟수가 적어도 주간권(공항 포함)이 유리하다', () => {
    for (const dailyTrips of [1, 2, 3]) {
      const r = rec({ ...base, dailyTrips, arrivalDate: '2026-11-12', departureDate: '2026-11-15' });
      expect(r.name).toBe('최적 하이브리드');
      expect(r.totalCost).toBeCloseTo(PASS_PRICES.SEMAINE, 2);
      expect(r.semaineUsed).toBe(true);
    }
  });

  it('월~일 한 주는 주간권 32.40€', () => {
    const r = rec({ ...base, dailyTrips: 4, arrivalDate: '2026-11-09', departureDate: '2026-11-15' });
    expect(r.totalCost).toBeCloseTo(32.4, 2);
  });

  it('당일 입출국은 공항 이동을 2회로 계산한다', () => {
    const r = rec({ ...base, dailyTrips: 4, arrivalDate: '2026-11-09', departureDate: '2026-11-09' });
    expect(r.totalCost).toBeCloseTo(PASS_PRICES.AIRPORT_RER * 2, 2);
  });

  it('연말연시 일정에서 날짜(iso)의 연도가 올바르다', () => {
    const r = rec({ ...base, dailyTrips: 4, arrivalDate: '2026-12-28', departureDate: '2027-01-04' });
    expect(r.dailyBreakdown[0].iso).toBe('2026-12-28');
    expect(r.dailyBreakdown[7].iso).toBe('2027-01-04');
  });

  it('실물카드 월~일: 도착일 RER + 이지카드 + 데쿠베르트 + 주간권', () => {
    const r = rec({ ...base, cardType: 'Physical', dailyTrips: 4, arrivalDate: '2026-11-09', departureDate: '2026-11-15' });
    // 14(공항 RER) + 32.40(주간권) + 2(이지) + 5(데쿠베르트)
    expect(r.totalCost).toBeCloseTo(53.4, 2);
  });

  it('택시는 주간권이 있어도 별도 결제한다', () => {
    const r = calculateStrategies({
      ...base, bagOption: 'MultiCarrier', dailyTrips: 4,
      arrivalDate: '2026-11-09', departureDate: '2026-11-15',
    }).find(x => x.name === '최적 하이브리드')!;
    // 주간권 32.40 + 택시 2회
    expect(r.totalCost).toBeCloseTo(PASS_PRICES.SEMAINE + PASS_PRICES.AIRPORT_TAXI * 2, 2);
  });
});
