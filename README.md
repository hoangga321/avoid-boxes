Avoid Boxes 게임 제작 보고서

1. 프로젝트 개요
◆ 게임 제목 : Avoid Boxes
◆ 제작자 : 리슝호앙-202395036
◆ 제작 기간 : 2025/10
◆ 사용 언어 : HTML,CSS,JavaScript
◆ 팀 구성 : 개인
◆ 플랫폼 : Web browser


2. 게임 기획 및 컨셉
◆ 기획 의도 : 어떤 게임을 만들고자 했는가?
간단한 조작으로 “피하고 살아남기”의 즉각적 재미를 주고, 짧은 플레이에도 보스 라운드·미션 보상·스킨 수집으로 뚜렷한 성취를 제공한다. 반복 플레이(빠른 리트라이)와 점수 경쟁을 핵심 루프로 둔다.
◆ 장르 : 생존, 러너, 퍼즐 등
◆ 핵심 아이디어 : 
1. 10초 보스 생존전(UFO/뇌신/드래곤) — 패턴은 강하지만 항상 회피 빈공간 보장
2. Near-miss 콤보로 위험하게 피할수록 보상 상승
3. 스킨 수집/상점 탭(플레이어/장애물 분리)과 보상 경제
4. 짧은 세션 + 빠른 재도전 UX, i18n(한/영) 지원
◆ 타겟 유저/플레이 스타일 : 
짧은 시간에 몰입하려는 캐주얼–미드코어 유저
 점수 경쟁·미션 달성·수집 요소를 선호하는 유저
 데스크톱/모바일 웹 모두, 한 손 조작도 가능한 간단한 컨트롤
 난이도 곡선은 완만하게 시작하여 보스에서 스파이크, 실패 후 즉시 리트라이


3. 게임 시스템 구조
◆ 게임 진행 방식 : 
Ready
캔버스 중앙 대기, 버튼/키 입력 시 시작. UI/HUD 초기화.
Playing (Stage)
spawner가 장애물/토큰을 주기적으로 생성.
player 이동(키보드/마우스), 충돌/near-miss 판정 수행.
미션 진행도(missions) 갱신: 생존 시간, 근접회피 수, 코인 등.
스킬(1–4) 사용 → 쿨다운/재고 소모, audio SFX 재생.
Stage Clear
레벨 미션 충족 시 스폰 일시 정지, 경고 연출 준비.
Boss Fight (10초 생존)
bosses가 패턴 시작:
LV1 UFO: 수평/대각 레이저 교대, 최소 회피 공간 보장.
LV2 뇌신: 추적 낙뢰 + 랜덤 낙뢰 혼합, 빈공간 유지.
LV3 드래곤: 화염 브레스–빈공간–화염 사이클.
타이머 0초 → 클리어 처리.
Result & Progress
레벨 업/다음 스테이지 진입 또는 Game Over(충돌 시).
progress에 코인/구매/장착/베스트 기록 저장.
Restart로 Ready 복귀(빠른 리트라이).
메인 루프: state(상태머신) → update()(물리/판정) → render()(HUD/캔버스) 60fps.
◆ 다이어그램 :


4. 기술적 구현 내용
◆ 주요 스크립트 설명 : 
state.js
전역 상태머신(Ready → Playing → BossFight → NextLevel / GameOver). 루프에서 update()(논리) → render()(HUD/캔버스) 순으로 호출.
spawner.js
장애물/토큰 스폰 주기·속도·밀도 관리. 레벨에 따른 파라미터 스케일링.
bosses.js
보스 10초 타이머와 패턴( U̲F̲O̲ 수평/대각 스트립, 뇌신 추적+랜덤 낙뢰, 드래곤 화염) 생성. 빈공간 보장 로직 포함.
player.js
입력(WASD/마우스) → 이동, 스킬(1–4: Repel/Shield/Bomb/Freeze) 재고·쿨다운, 스킨 드로잉(Blue/Red/Yakuza/Panda/Superman).
collision.js
원/상자 근사 충돌 + near-miss(근접회피) 판정(완충거리 적용).
hud.js
상단 타이머/점수/베스트/코인, 미션 바(레벨·보너스 near-miss), 경고/알림.
missions.js
레벨 미션·데일리·위클리 집계 및 진행도 저장/로드.
shop.js + progress.js
탭 분리(Player/Obstacle), 구매/장착/아이콘, 상태 영속화(LocalStorage).
audio.js
Music/SFX 분리, 볼륨/뮤트, 보스·공격 SFX. 사용자 제스처 이후 unlock() 처리.
i18n.js
한/영/베 전환, DOM 라벨 실시간 갱신.
renderer.js
배경/오브젝트/플레이어 레이어링, 보스 경고 플래시/오버레이 호출.
◆ 클래스/컴포넌트 설명 + 간단한 코드 스냅샷
(1) 상태머신 전이:
// state.js
switch (game.state) {
  case 'Ready':
    if (input.startPressed()) toPlaying();
    break;
  case 'Playing':
    updateStage();
    if (missions.levelCleared()) toBossFight();
    if (collision.hit) toGameOver();
    break;
  case 'BossFight':
    bosses.update(dt);
    if (bosses.cleared) toNextLevel();
    if (collision.hit) toGameOver();
    break;
}
(2) UFO 수평/대각 스트립 + 안전 레인 보장
// bosses.js (개념 축약)
function spawnLaserBundle(kind) {
  const lanes = grid.makeLanes();              
  const safe = lanes.pickSafeRun(1, 2);        
  for (const lane of lanes) {
    if (safe.has(lane)) continue;              
    obstacles.push(makeLaser(kind, lane));
  }
}

(3) 근접회피(near-miss) 판정
// collision.js
const d = dist(player, obj);
if (d < hitRadius) hit();
else if (d < nearMissRadius) { combo++; score += base*comboMul; }
(4) 상점 장착/해제 & 저장
// shop.js
equip(itemId) {
  progress.setEquipped(item.slot, itemId);  // 'player' | 'obstacle'
  applyEquipToRuntime(item);                 // 즉시 반영(재시작 불필요)
  ui.refreshShop();
}
(5) 오디오 unlock & 토글
// audio.js
export function unlock() {
  if (unlocked) return;
  const b = new AudioContext();
  const o = b.createOscillator();
  o.connect(b.destination); o.start(0); o.stop(0.01);
  unlocked = true;
}
export function toggleMuted(kind){ /* 'music' | 'sfx' */ }

◆ 문제 해결 경험 :
1. audio.unlock is not a function 콘솔 에러
원인: audio 네임스페이스에 unlock 미구현/이름 불일치.
해결: audio.js에 export function unlock() 구현 후 main.js에서 첫 사용자 입력 시 호출.

2. 뮤트 버튼 audio.toggleMuted TypeError
원인: DOM 핸들러가 audio.toggleMuted가 아닌 로컬 함수 참조.
해결: import * as audio 사용, 버튼에서 audio.toggleMuted('music')로 직접 바인딩.
3. 설정 모달이 항상 뜸(닫히지 않음)
원인: CSS .settings--open 플래그 초기값/토글 누락.
해결: 오픈/클로즈에서 classList.toggle('is-open') 일원화, 바깥 클릭시 닫기.
4. 미션 진행도 바가 중앙 캔버스에 겹침
원인: HUD 위치 CSS 오버라이드 충돌.
해결: 기존 규칙 정리(중복 제거) + .missions-panel .progress로 스코프 제한.
5. Shop 버튼(Equip/Unequip) 오버플로우
원인: 고정 폭/줄바꿈 미지정.
해결: .shop-item{display:grid;grid-template-columns:auto 1fr auto} + 버튼 white-space:nowrap 적용.



5. 디자인
◆ UI 구성 :  
레이아웃
상단: Top Header(게임 타이틀, Reset, 언어/도시, 설정·뮤트 아이콘)
좌측: Guide 패널(조작·스킬 설명, 스크롤)
중앙: 게임 캔버스(HUD 오버레이: 시간/점수/베스트/코인/콤보·피버바)
우측: Missions 패널(Level/Daily/Weekly, 진행도 바) + Shop(Coins, 탭: Player Skins / Obstacle Skins)
하단 중앙: 결과/재시작 버튼(게임오버 시)
핵심 컴포넌트
HUD 메트릭 칩: Pill 모양(둥근 라운드, 진한 외곽선), 그림자 1단계
진행도 바: 배경(연한 회색) + 채움(녹황·강조 컬러), 텍스트는 좌측 정렬
설정 모달: 중앙 팝업(반투명 딤 + 소프트 그림자), 슬라이더 2종(SFX/Music)
Shop 카드: 아이콘(48–56px) · 제목/설명 · Buy/Equip/Unequip 버튼(우측, 고정폭, nowrap)
경고 연출: “WARNING” 배너 + 화면 플래시(보스 진입), 공격 직전 느낌표 토스트
토스트/칭호: 미션 완료·코인 획득 등 짧은 피드백 배지
색/타이포(톤앤매너)
베이스: 파스텔 샌드 배경 + 진한 외곽선(Outline)
포인트: 성공/진행(녹색/황금 계열), 경고/보스(적·주황)
본문/라벨: 둥근 산세리프(게임 느낌), 굵은 제목 + 가독성 높은 본문 두께
인터랙션/애니메이션
버튼/카드 호버 시 미세 스케일(1.02) + 음영 강화
클릭 시 눌림(press) 애니메이션(짧은 120–160ms)
아이콘은 SVG 또는 Canvas 드로잉(픽셀 블러 방지)
캔버스 위 HUD는 레이어 고정(레이아웃 이동 없이 z-index로만 표현)
반응형
폭 ≥ 1200px: 좌/중앙/우 3열
960–1199px: 우측 패널 폭 축소(콘텐츠 줄바꿈 유지)
≤ 959px: 우측 패널을 아코디언 또는 탭으로 접기(Shop/Missions 전환)
접근성
색 대비 4.5:1 이상(텍스트/배경)
버튼 포커스 링 표시, 키보드 네비게이션 가능(Tab/Enter/Esc)
SFX/Music 기본 60–70%로 시작, 모달 닫기(ESC/바깥 클릭) 지원
아이콘/일관성
상단 우측: ⚙ Settings /  Mute 아이콘 크기 20–22px, 동일 선 굵기
Shop 아이콘: 플레이어/장애물 테두리 두께 통일(캔버스 드로잉 기준)
상태 색상 일관: 성공(녹), 경고(주·적), 정보(청)


6. 테스트 및 피드백
◆ 테스트 방법 : 자가 테스트, 친구/학생 대상 테스트 등
자가 테스트: 기능 단위(스폰/충돌/미션/보스/상점/오디오) 시나리오별 체크리스트로 반복 실행.
동료/지인 플레이 테스트: 10–15분 세션, 난이도 체감·조작 불편 항목 수집.
디바이스/브라우저 매트릭스: Chrome/Edge/Firefox/Safari, 데스크톱 FHD/QHD, 모바일 크롬(안드로이드)에서 레이아웃/터치 조작 확인.
성능 측정: DevTools Performance(프레임 타임, GC), CPU Throttling 4×로도 60fps 유지 여부 점검.
테스트(회귀): 주요 버그 수정 후 동일 시나리오 재검증(Shop, Audio, Boss, HUD).
◆ 발견된 문제점 및 개선 : 
1. 오디오 초기화 오류(audio.unlock is not a function)
→ audio.js에 unlock() 구현, 첫 사용자 입력 시 호출. 해결.
2. 뮤트 버튼 TypeError(toggleMuted)
→ 네임스페이스 통일(import * as audio), 핸들러 직접 바인딩. 해결.
3. 설정 모달이 항상 표시
→ .is-open 플래그 단일화, 바깥 클릭/ESC 닫기 추가. 해결.
4. 미션 진행도 바 위치 틀어짐(캔버스 중앙에 겹침)
→ 중복 CSS 제거, .missions-panel 스코프화. 해결.
5. Shop 버튼(Equip/Unequip) 오버플로우
→ 그리드 레이아웃과 white-space: nowrap 적용. 해결.
6. Slime(All) 장착 후 녹색만 등장(재시작까지 지속)
→ 장착 직후 스폰 테이블 갱신(spawner.applyObstacleSkin). 해결.
7. Boss1 패턴이 한쪽만 나오거나 지나치게 촘촘
→ 짝수/홀수 교대 패턴 강제, minGap 하한·쿨다운 보장. 해결.
8. Boss2 추적 낙뢰가 너무 관대/혹은 과밀
→ 추적+랜덤 혼합, safeGap 유지로 항상 회피 공간 보장. 해결.
9. 헤더/캔버스 레이아웃 밀림(효과 CSS 충돌)
→ 효과는 ::before/::after로, 플로우 불변·z-index만 변경. 해결.



7. 회고 및 느낀 점
가장 어려웠던 점 / 해결
보스 패턴에서 도전적이지만 공정한 난이도 유지 → 안전 공간 보장(minGap, safe corridor) 알고리즘으로 해결.
CSS 오버라이드 누적으로 레이아웃 붕괴 → 스타일 스코프화·중복 제거·토큰화로 정리.
오디오 초기화 정책(브라우저 잠금) → 첫 사용자 입력 시 audio.unlock() 트리거로 해결.
i18n 전환 시 일부 레이블 미갱신 → 전환 훅에서 HUD/Shop/Settings 일괄 리프레시 설계.
성취감을 느낀 부분
10초 보스 생존전이 짧고 강렬한 하이라이트로 작동한 점.
스킨 탭 분리·아이콘 표준화·버튼 정렬로 상점 UX가 깔끔해진 점.
near-miss 콤보와 미션 진행도가 재도전 동기를 확실히 만들어 준 점.
다음에 만들고 싶은 게임 아이디어
패턴 에디터 기반 보스 러시: 데이터 주도 편집기로 커뮤니티 챌린지 공유.
로그라이트 회피 액션: 스킬 랜덤 드래프트, 메타 진화(유물/시너지).
협동 2인 회피: 서로의 보호막/스킬 연계, 온라인 랭킹.
학습적 성장
상태머신 분리, 스폰·충돌·렌더 모듈 경계 설계의 중요성 체득.
브라우저 오디오 정책, 성능 프로파일링(프레임 타임/GC) 실무 감각 향상.
CSS 시스템화(토큰·레이어·스코프)로 디자인 변경 내성을 높이는 방법 습득.
사용자 피드백을 빠르게 반영하며 밸런싱 루프(측정→조정→검증)를 경험.



8. 스크린샷 및 게임 URL
◆ 주요 장면 스크린샷

◆ 기능별 화면 

Tophead bar: language, stages, volume setting, reset progress function
mission Panel


Store

Game Canvas
◆ URL 주소 : https://hoangga321.github.io/avoid-boxes/


9. 코드
◆ js (파일명 :   )


◆ html (파일명 : index.html  )
◆ css (파일명 : style.css  )



