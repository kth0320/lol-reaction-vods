# 페이즈

## Phase 0

- 루트 README (제품 정의)
- 폴더/placeholder 구조

## Phase 1

- Next.js + Prisma(SQLite) 로컬 앱
- 메인 **위**: 프로토타입은 **LCK · LEC** 생중계 vs 카드. **5초** 전환, 호버 정지, 탭 선택. 라이브 없는 리그는 건너뜀. LPL은 이 페이즈에서 비활성
- vs 카드를 누른 경기 화면: 지금 중계 중인 방송인(프로필·플랫폼·응원 팀·시청자 수) + 응원 팀 / 플랫폼 필터
- 메인 **아래**: 지난 경기 다시보기. YouTube·숲 iframe, 치지직 링크 아웃
- `data/` JSON 시드 (라이브는 플레이스홀더 vs 카드)
- 수집 워커·관리 화면·공식 vs 에셋 파이프라인 **없음**

Phase 1 UI의 홈 vs 카드는 시드 대신 **LCK·LEC 공식 일정**입니다. 방송 제목은 그 경기에 중계진을 붙일 때만 씁니다.

## Phase 2 — 수집 프로토타입 (현재)

- 화이트리스트: 대회 중계를 자주 하는 채널만 **수동** 등록. LCK 국내 + LEC 해외 Twitch
- 홈에서 켜는 리그: **LCK · LEC**. LPL은 카드를 만들지 않음
- 플랫폼: **치지직 · 숲 · Twitch 라이브**(원본 링크). YouTube 수집과 Twitch 다시보기는 이후
- **홈 vs 카드: lolesports 공식 일정.** `inProgress`와 시작 90분 전~시리즈 예상 시간 안의 `unstarted`. TBD 슬롯은 건너뜀. 리그 ID는 slug로 조회하고 하드코딩하지 않음
- 제목 추론은 **보조**. 화이트리스트 라이브 제목의 리그·두 팀을 공식 경기에 매칭해 `LiveCandidate.matchId`만 붙인다. ingest 경기를 만들어 홈에 올리지 않음
- 파이프라인: `getLeagues` → `getSchedule` → `Match(source=schedule)` → 채널 조회 → `LiveCandidate`

성공: 공식 LCK 또는 LEC 경기가 시드·방송 제목이 아니라 일정 API로 홈 카드가 된다. 중계 중인 화이트리스트는 그 경기 화면에 붙는다.

## 이후

| 이후 | 내용 |
| --- | --- |
| LPL | 프로토타입과 같은 파이프라인에 LPL 중계진·탭 추가 |
| YouTube | 수집 대상에 추가 |
| Twitch VOD | 다시보기 (휘발 때문에 후순위) |
| 보정 | `apps/ops` 관리 화면 |
| 그래픽 | 리그 공식 vs 이미지 연동 |
| 재생 | 치지직 인페이지 임베드(후순위), Twitch(후순위) |
