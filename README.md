# 파리 여행 최적 교통권 추천 2026

여행 일정(도착/출발일), 수하물, 하루 평균 이동 횟수, 카드 종류(모바일/실물)를 넣으면
**1회권 · 일일권 · 주간권(Navigo Semaine)** 중 가장 저렴한 조합을 계산해 주는 웹앱입니다.
by 외눈이 여행일기 ([인스타그램](https://instagram.com/eye1___) · [블로그](https://blog.naver.com/witheye1))

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 계산 로직 테스트
npm run build    # dist/ 생성
```

## 요금 갱신 (매년 1월)

1. `src/types.ts` 의 `PASS_PRICES`, `CARD_FEES` 와 `PRICE_BASIS_DATE` 수정
2. `npm test` 로 계산 결과 확인 (요금이 바뀌면 테스트 기대값도 같이 수정)
3. main 브랜치에 push 하면 Vercel이 자동 배포

기준: 2026-01-01 (1회권 2.55€ · 일일권 12.30€ · 주간권 32.40€ · 공항 티켓 14€ · 이지 2€ · 데쿠베르트 5€ · CDG 택시 정액 우안 56€/좌안 65€)

## 계산 규칙 요약

- 주간권(Semaine)은 **월~일 달력 주** 단위로만 유효하고 공항(RER) 이동까지 포함
- 주간권과 비교하는 "대안 비용"에는 공항 이동비도 포함
- 실물카드는 공항에서 데쿠베르트를 살 수 없어 도착일은 별도 계산 (이지카드 2€)
- 택시는 주간권과 별도 결제

## 배포

Vercel에 GitHub 저장소를 연결해 사용합니다 (Framework: Vite, Build: `npm run build`, Output: `dist`).
