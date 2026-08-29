# services/ingest

리액션 VOD 수집 파이프라인 placeholder.

수집 순서 (이후 페이즈):

1. `data/creators` 화이트리스트의 방송인만
2. 경기 시작~종료 전후 **시간창**으로 후보 VOD 축소
3. 제목 점수 — `data/team-aliases` 팀 별칭으로 보조 매칭
4. `data/corrections` 수동 보정 적용

**프로토타입 범위:** 리그 **LCK · LEC**. LPL은 홈에 안 올림. 플랫폼 **치지직 · 숲 · Twitch 라이브**. 대회 중계를 자주 하는 채널만 수동 화이트리스트. 채널 ID는 `data/creators/channels.json`.

홈 vs 카드는 **lolesports 공식 일정**(`getLeagues` slug 조회 후 `getSchedule`). 방송 제목은 공식 경기에 중계진을 붙이는 보조 매칭이다. 공개 사이트 키는 lolesports.com이 쓰는 값이며 비밀이 아니다. YouTube 다시보기는 이후. Twitch 원본 VOD는 가져오지 않는다.

`npm run ingest:schedule` 로 일정만 맞출 수 있다.
