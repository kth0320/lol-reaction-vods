# services/ingest

리액션 VOD 수집 파이프라인 placeholder.

수집 순서 (이후 페이즈):

1. `data/creators` 화이트리스트의 방송인만
2. 경기 시작~종료 전후 **시간창**으로 후보 VOD 축소
3. 제목 점수 — `data/team-aliases` 팀 별칭으로 보조 매칭
4. `data/corrections` 수동 보정 적용

**프로토타입 범위:** 리그 **LCK · LEC**. LPL은 홈에 안 올림. 플랫폼 **치지직 · 숲 · Twitch 라이브**. 방송인 **20명**. 채널 ID는 `data/creators/channels.json`. 제목에서 읽은 LCK·LEC 경기는 홈 vs 카드로 올린다. YouTube 수집 · Twitch 다시보기는 이후.

Phase 0에서는 이 README만 둔다. 크롤러, 워커, 매칭 로직, 외부 API 클라이언트를 추가하지 않는다.
