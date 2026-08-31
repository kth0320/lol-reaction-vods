# services/ingest

리액션 VOD 수집 파이프라인 placeholder.

수집 순서:

1. `data/creators` 화이트리스트 + 라이브 검색으로 붙은 방송인
2. 경기 시작~종료 전후 **시간창**으로 후보 VOD 축소
3. 제목 점수 — 팀 별칭으로 공식 LCK·LPL·LEC 경기에 붙임. 라이브 때 저장한 제목도 씀
4. Twitch 원본 VOD는 건너뛴다. 그 방송인은 YouTube RSS·채널 페이지만

**프로토타입 범위:** 리그 **LCK · LPL · LEC**. 라이브는 **치지직 · 숲 · Twitch**. 다시보기는 **YouTube · 치지직 · 숲**. 채널 ID는 `data/creators/channels.json`.

홈 vs 카드는 **lolesports 공식 일정**(`getLeagues` slug 조회 후 `getSchedule`). 지난 시즌 칸은 `getTournamentsForLeague` + `getCompletedEvents`. 방송 제목은 공식 경기에 중계진을 붙이는 보조 매칭이다. 공개 사이트 키는 lolesports.com이 쓰는 값이며 비밀이 아니다.

`npm run ingest:schedule` 일정(아카이브 포함). `npm run ingest:live` 라이브. `npm run ingest:vods` 다시보기(치지직·숲·YouTube 지난 시즌 페이지).
