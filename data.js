/* =========================================================================
   올팍 Go! 데이터 정의
   - 활용 공공데이터: 한국체육산업개발(주) 15164822 / 3037877 / 15100884 + 기상청 단기예보
   - 프로토타입 주석: 대표값(시드)과 실데이터(공식 발표값)를 구분해 표기함
   ========================================================================= */

const CAPACITY_TOTAL = 2799;          // 공원 전체 주차면(공식 안내 약 2,800면 기준)
const CAPACITY_3GATE = 2200;          // 실시간 주차현황 API 대상(동2문·남2문·북2문)

/* ---- 실시간 주차현황 (한국체육산업개발 공개 API) ------------------------- */
const LIVE_API = 'https://www.ksponco.or.kr/online/main/parkingorsApi.do?apiKey=PARKING21803504';

/* ---- 공연장 (좌석수는 KSPO 공연장안내 공식값) ---------------------------- */
const VENUES = {
  KSPO:  { name: 'KSPO DOME',        seats: 14594, label: 'KSPO DOME(올림픽체조경기장)', gates: ['동2문', '북2문'] },
  HALL:  { name: '올림픽홀',          seats: 2454,  label: '올림픽홀',                     gates: ['동2문', '남2문'] },
  ARENA: { name: '티켓링크 라이브 아레나', seats: 5003, label: '티켓링크 라이브 아레나(핸드볼경기장)', gates: ['남2문'] },
  WOORI: { name: '우리금융아트홀',    seats: 1184,  label: '우리금융아트홀(올림픽역도경기장)', gates: ['남2문'] },
  LAWN:  { name: '88잔디마당',        seats: 8000,  label: '88잔디마당(야외)',               gates: ['남2문', '동2문'] }
};

/* ---- 공연 일정 -----------------------------------------------------------
   출처: 올림픽공원 문화공간 > 일정안내(2026-11-21 확인).
   ※ 공공데이터 3037877(올림픽공원 공연정보) API 연동 대상이며, 프로토타입에는
      공개된 2026년 11월~12월 일정을 수록함. 관람객 수는 좌석수·공연형태 기반 추정치.
   ------------------------------------------------------------------------ */
const EVENTS = [
  { date: '2026-11-21', venue: 'KSPO',  title: '2026-27 로이킴 LIVE TOUR [R:O:Y] in SEOUL', start: '18:00', end: '20:00', attendance: 11500 },
  { date: '2026-11-22', venue: 'KSPO',  title: '2026-27 로이킴 LIVE TOUR [R:O:Y] in SEOUL', start: '17:00', end: '19:00', attendance: 11000 },
  { date: '2026-11-27', venue: 'KSPO',  title: '[서울] 2026 조용필 & 위대한탄생 콘서트',      start: '19:00', end: '21:00', attendance: 12000 },
  { date: '2026-11-27', venue: 'HALL',  title: '2026 다이나믹 듀오 단독 콘서트 "가끔씩 오래 보자"', start: '20:00', end: '22:00', attendance: 2300 },
  { date: '2026-11-28', venue: 'KSPO',  title: '[서울] 2026 조용필 & 위대한탄생 콘서트',      start: '18:00', end: '20:00', attendance: 12000 },
  { date: '2026-11-28', venue: 'HALL',  title: '2026 다이나믹 듀오 단독 콘서트 "가끔씩 오래 보자"', start: '18:00', end: '20:00', attendance: 2300 },
  { date: '2026-11-28', venue: 'WOORI', title: '최현우 30주년 기념 공연 - LEGACY',            start: '15:00', end: '17:00', attendance: 1100 },
  { date: '2026-11-28', venue: 'WOORI', title: '최현우 30주년 기념 공연 - LEGACY',            start: '19:00', end: '21:00', attendance: 1100 },
  { date: '2026-11-29', venue: 'KSPO',  title: '[서울] 2026 조용필 & 위대한탄생 콘서트',      start: '17:00', end: '19:00', attendance: 12000 },
  { date: '2026-11-29', venue: 'HALL',  title: '2026 다이나믹 듀오 단독 콘서트 "가끔씩 오래 보자"', start: '17:00', end: '19:00', attendance: 2300 },
  { date: '2026-11-29', venue: 'WOORI', title: '최현우 30주년 기념 공연 - LEGACY',            start: '14:00', end: '16:00', attendance: 1100 },
  { date: '2026-12-04', venue: 'KSPO',  title: '[서울] 2026 이승철 40주년 콘서트 [THE VOICE]', start: '19:30', end: '21:30', attendance: 11500 },
  { date: '2026-12-05', venue: 'KSPO',  title: '[서울] 2026 이승철 40주년 콘서트 [THE VOICE]', start: '18:00', end: '20:00', attendance: 12000 },
  { date: '2026-12-05', venue: 'HALL',  title: '2026 비(RAIN) 콘서트 [THE SMOKE]',             start: '18:00', end: '20:00', attendance: 2300 },
  { date: '2026-12-06', venue: 'KSPO',  title: '[서울] 2026 이승철 40주년 콘서트 [THE VOICE]', start: '17:00', end: '19:00', attendance: 11500 },
  { date: '2026-12-06', venue: 'HALL',  title: '2026 비(RAIN) 콘서트 [THE SMOKE]',             start: '17:00', end: '19:00', attendance: 2300 },
  { date: '2026-12-11', venue: 'HALL',  title: '2026 박지현 팬콘서트 〈박지현 어워즈〉',         start: '19:30', end: '21:30', attendance: 2300 },
  { date: '2026-12-12', venue: 'KSPO',  title: '2026 DAVICHI CONCERT 〈IN OUR SCENES〉',       start: '18:00', end: '20:00', attendance: 12000 },
  { date: '2026-12-12', venue: 'HALL',  title: '2026 박지현 팬콘서트 〈박지현 어워즈〉',         start: '18:00', end: '20:00', attendance: 2300 },
  { date: '2026-12-13', venue: 'KSPO',  title: '2026 DAVICHI CONCERT 〈IN OUR SCENES〉',       start: '17:00', end: '19:00', attendance: 11500 },
  { date: '2026-12-13', venue: 'HALL',  title: '2026 박지현 팬콘서트 〈박지현 어워즈〉',         start: '17:00', end: '19:00', attendance: 2300 },
  { date: '2026-12-18', venue: 'KSPO',  title: "2026 DAY6 Special Concert 'The Present'",       start: '19:00', end: '21:30', attendance: 13500 },
  { date: '2026-12-18', venue: 'HALL',  title: '자우림 단독 콘서트 [MIDNIGHT EXPRESS]',         start: '20:00', end: '22:00', attendance: 2300 },
  { date: '2026-12-19', venue: 'KSPO',  title: "2026 DAY6 Special Concert 'The Present'",       start: '18:00', end: '20:30', attendance: 13500 },
  { date: '2026-12-19', venue: 'HALL',  title: '자우림 단독 콘서트 [MIDNIGHT EXPRESS]',         start: '18:00', end: '20:00', attendance: 2300 },
  { date: '2026-12-20', venue: 'KSPO',  title: "2026 DAY6 Special Concert 'The Present'",       start: '17:00', end: '19:30', attendance: 13500 },
  { date: '2026-12-20', venue: 'HALL',  title: '자우림 단독 콘서트 [MIDNIGHT EXPRESS]',         start: '17:00', end: '19:00', attendance: 2300 },
  { date: '2026-12-24', venue: 'KSPO',  title: 'THE BOYZ 2026 콘서트 〈ZENERATION Ⅲ〉',         start: '19:00', end: '21:30', attendance: 13000 },
  { date: '2026-12-24', venue: 'HALL',  title: '2026 박진영 콘서트 〈WET〉',                    start: '19:30', end: '21:30', attendance: 2300 },
  { date: '2026-12-25', venue: 'KSPO',  title: 'THE BOYZ 2026 콘서트 〈ZENERATION Ⅲ〉',         start: '18:00', end: '20:30', attendance: 13000 },
  { date: '2026-12-25', venue: 'HALL',  title: '2026 박진영 콘서트 〈WET〉',                    start: '18:00', end: '20:00', attendance: 2300 },
  { date: '2026-12-26', venue: 'KSPO',  title: 'THE BOYZ 2026 콘서트 〈ZENERATION Ⅲ〉',         start: '18:00', end: '20:30', attendance: 13000 },
  { date: '2026-12-26', venue: 'HALL',  title: '2026 박진영 콘서트 〈WET〉',                    start: '18:00', end: '20:00', attendance: 2300 },
  { date: '2026-12-27', venue: 'KSPO',  title: 'THE BOYZ 2026 콘서트 〈ZENERATION Ⅲ〉',         start: '17:00', end: '19:30', attendance: 12500 },
  { date: '2026-12-31', venue: 'KSPO',  title: '2026 성시경 연말 콘서트 〈성시경〉',              start: '21:00', end: '23:30', attendance: 13000 }
];

/* ---- 주차 구역 -----------------------------------------------------------
   P1(562면)·P4(117면)·P5(176면)·P6(167면)·P7(137면)은 공개된 구역 규모,
   P1B·P2·P3·남3문·남4문·서1문·서2문은 공원 전체 약 2,800면에 맞춘 배분 추정치.
   ------------------------------------------------------------------------ */
const ZONES = [
  { id: 'P1A',  name: 'P1A (동2문·K-아트홀)', cap: 562, gate: '동2문', venueWeights: { KSPO: 0.18, HALL: 0.16, ARENA: 0.05, WOORI: 0.03, LAWN: 0.12 }, walk: { KSPO: 12, HALL: 6, ARENA: 14, WOORI: 16, LAWN: 10 } },
  { id: 'P1B',  name: 'P1B (동2문 보조)',      cap: 180, gate: '동2문', venueWeights: { KSPO: 0.10, HALL: 0.10, ARENA: 0.04, WOORI: 0.02, LAWN: 0.06 }, walk: { KSPO: 13, HALL: 8, ARENA: 15, WOORI: 17, LAWN: 11 } },
  { id: 'P2',   name: 'P2 (올림픽홀 지하·동2문)', cap: 340, gate: '동2문', venueWeights: { KSPO: 0.12, HALL: 0.38, ARENA: 0.06, WOORI: 0.05, LAWN: 0.08 }, walk: { KSPO: 11, HALL: 3, ARENA: 13, WOORI: 15, LAWN: 9 } },
  { id: 'P3',   name: 'P3 (동2문·들꽃마루)',    cap: 210, gate: '동2문', venueWeights: { KSPO: 0.09, HALL: 0.10, ARENA: 0.05, WOORI: 0.04, LAWN: 0.14 }, walk: { KSPO: 12, HALL: 7, ARENA: 12, WOORI: 14, LAWN: 6 } },
  { id: 'P4',   name: 'P4 (북2문·수영장)',      cap: 117, gate: '북2문', venueWeights: { KSPO: 0.14, HALL: 0.03, ARENA: 0.03, WOORI: 0.02, LAWN: 0.04 }, walk: { KSPO: 8, HALL: 14, ARENA: 17, WOORI: 20, LAWN: 13 } },
  { id: 'P5',   name: 'P5 (북2문·KSPO DOME)',   cap: 176, gate: '북2문', venueWeights: { KSPO: 0.26, HALL: 0.04, ARENA: 0.03, WOORI: 0.02, LAWN: 0.05 }, walk: { KSPO: 3, HALL: 15, ARENA: 18, WOORI: 21, LAWN: 14 } },
  { id: 'P6',   name: 'P6 (남2문·라이브 아레나)', cap: 167, gate: '남2문', venueWeights: { KSPO: 0.05, HALL: 0.10, ARENA: 0.34, WOORI: 0.08, LAWN: 0.10 }, walk: { KSPO: 15, HALL: 10, ARENA: 3, WOORI: 12, LAWN: 8 } },
  { id: 'P7',   name: 'P7 (남2문·우리금융아트홀)', cap: 137, gate: '남2문', venueWeights: { KSPO: 0.04, HALL: 0.07, ARENA: 0.10, WOORI: 0.40, LAWN: 0.08 }, walk: { KSPO: 16, HALL: 11, ARENA: 10, WOORI: 3, LAWN: 7 } },
  { id: 'N3',   name: '남3문 (소마미술관 지하)', cap: 320, gate: '남3문', venueWeights: { KSPO: 0.04, HALL: 0.03, ARENA: 0.08, WOORI: 0.10, LAWN: 0.12 }, walk: { KSPO: 17, HALL: 13, ARENA: 12, WOORI: 15, LAWN: 9 } },
  { id: 'N4',   name: '남4문 (평화의 광장)',     cap: 200, gate: '남4문', venueWeights: { KSPO: 0.09, HALL: 0.05, ARENA: 0.05, WOORI: 0.06, LAWN: 0.13 }, walk: { KSPO: 11, HALL: 12, ARENA: 14, WOORI: 16, LAWN: 5 } },
  { id: 'W1',   name: '서1문 (체육박물관)',      cap: 160, gate: '서1문', venueWeights: { KSPO: 0.04, HALL: 0.03, ARENA: 0.03, WOORI: 0.04, LAWN: 0.06 }, walk: { KSPO: 19, HALL: 16, ARENA: 17, WOORI: 19, LAWN: 12 } },
  { id: 'W2',   name: '서2문 (올림픽파크텔)',    cap: 230, gate: '서2문', venueWeights: { KSPO: 0.05, HALL: 0.04, ARENA: 0.04, WOORI: 0.05, LAWN: 0.06 }, walk: { KSPO: 18, HALL: 15, ARENA: 16, WOORI: 18, LAWN: 11 } }
];

/* ---- 시간대별 기본 수요 곡선 (공원 전체 주차면 대비 %) --------------------
   2025년 연계데이터(7,803건)의 일자별·시간대별 입차 구성을 분석해 만든 대표
   프로파일을 프로토타입용으로 재현한 값(모델 v0.9). 실데이터 재보정 대상.
   ------------------------------------------------------------------------ */
const BASE_CURVE = {
  weekday: [15,14,13,12,10,9,14,22,33,40,43,45,46,47,46,44,45,47,52,55,49,37,26,19],
  friday:  [16,15,14,12,10,9,15,24,35,42,45,48,50,51,50,49,52,56,60,62,55,42,30,22],
  saturday:[18,17,16,15,13,11,12,18,26,38,52,63,70,72,71,69,66,63,58,50,41,32,25,21],
  sunday:  [17,16,15,14,12,10,12,17,25,36,50,60,66,68,66,63,59,56,52,45,37,29,23,19]
};

/* ---- 날씨 계수 (기상청 단기예보 연계) ------------------------------------ */
const WEATHER = {
  clear: { label: '맑음', mult: 1.00, note: '대중교통·도보 방문이 원활해 주차 수요가 기준선과 같습니다.' },
  rain:  { label: '비',   mult: 1.14, note: '비 예보 시 도보·자전거 방문이 줄고 차량 방문이 늘어 혼잡이 14% 높아집니다.' },
  snow:  { label: '눈',   mult: 1.26, note: '적설 시 감속운행·제설로 회전율이 떨어져 혼잡이 26% 높아집니다.' }
};

/* ---- 지하철 대안 (공식 안내 출구 + 지도 기준 도보 시간) ------------------- */
const SUBWAY = [
  { station: '올림픽공원역', lines: '5·9호선', exit: '3·4번 출구', walk: { KSPO: 8, HALL: 6, ARENA: 12, WOORI: 14, LAWN: 8 }, mul: 1.0,  crowd: '매우 혼잡' },
  { station: '한성백제역',   lines: '9호선',   exit: '2번 출구',   walk: { KSPO: 18, HALL: 15, ARENA: 12, WOORI: 10, LAWN: 16 }, mul: 1.55, crowd: '여유' },
  { station: '몽촌토성역',   lines: '8호선',   exit: '1번 출구',   walk: { KSPO: 23, HALL: 18, ARENA: 15, WOORI: 13, LAWN: 19 }, mul: 1.8,  crowd: '여유' }
];

/* ---- 공연 전후 맞춤 코스 -------------------------------------------------- */
const COURSES = {
  before: [
    { title: '세계평화의 문 → 평화의 광장', min: 25, desc: '남4문에서 바로 닿는 넓은 광장. 공연 전 사진 찍기 좋은 스팟입니다.' },
    { title: '몽촌토성 산책로',           min: 40, desc: '백제 토성 위 숲길. 관람 전 20~30분 걸으면 덜 붐비는 남3문 쪽으로 빠집니다.' },
    { title: '소마미술관·한성백제박물관',  min: 50, desc: '실내 대기 장소가 필요할 때. 남3문 주차장과 가까워 비 오는 날 유용합니다.' }
  ],
  after: [
    { title: '평화의 광장 야간 산책',      min: 30, desc: '22시 이후 공원 안쪽은 닫히지만 광장은 24시까지 열려 있어 인파를 흘려보낼 수 있습니다.' },
    { title: '들꽃마루 → 나홀로나무',      min: 35, desc: '동문 쪽으로 빠져 올림픽공원역 행렬을 피하는 코스입니다.' },
    { title: '올림픽파크텔 카페',          min: 40, desc: '서2문 쪽. 한성백제역 방면으로 이동하며 대기 시간을 보내기 좋습니다.' }
  ]
};
