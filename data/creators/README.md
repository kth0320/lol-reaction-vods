# data/creators

방송인 **화이트리스트**.

- `whitelist.json` — 이름, 수집 여부(`ingestEnabled`), 기본 응원 팀
- `channels.json` — 프로토타입 수집용 플랫폼·채널 ID. 한 번 저장하고 재사용한다.

지금은 **수동** 목록이다. 롤 대회 중계를 거의 안 하는 채널(괴물쥐·랄로·앰비션·따효니·풍월량·러너)은 `ingestEnabled: false`로 빼 둔다. 이후 자동 수집 API에서 다시 켤 수 있다.

수집 프로토타입 (`ingestEnabled: true`, 홈은 LCK·LEC만):

- 치지직: 운타라, 울프, 강퀴, 탬탬버린, 베릴, 와디드
- 숲: 김민교, 롱다리코치, 훈수킹, 아뚱, 클리드, 이상호, 김군, 안녕수야
- Twitch: Caedrel, Jankos, YamatoCannon, Kameto, Ibai, Obsess

팀 코스트리머 기본 응원: 운타라 → T1, 안녕수야 → GEN, 와디드·Jankos → G2, Kameto → KC, Ibai → KOI, Obsess → FNC, YamatoCannon → SK.
Caedrel은 Los Ratones가 있어도 LEC 풀 슬레이트라 기본 응원 팀을 비운다.
