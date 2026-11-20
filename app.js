/* =========================================================================
   올팍 Go! — 예측 엔진 + 화면 렌더링
   ========================================================================= */
const STATE = { date: '', hour: 17, venue: 'KSPO', weather: 'clear', mode: 'car' };

const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, '0');
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- 날짜 ---------- */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function dayType(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const w = d.getDay();
  if (w === 0) return 'sunday';
  if (w === 6) return 'saturday';
  if (w === 5) return 'friday';
  return 'weekday';
}
const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
function dateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}(${DAY_KO[d.getDay()]})`;
}
function eventsOn(dateStr) { return EVENTS.filter((e) => e.date === dateStr); }

/* ---------- 예측 엔진 ---------- */
const ARRIVAL = [[-180, 0], [-180, .05], [-120, .15], [-90, .30], [-60, .55], [-30, .75], [-15, .90], [0, 1], [10, 1]];
const DEPART  = [[-1, 0], [0, .10], [15, .35], [30, .60], [45, .80], [60, .92], [90, 1]];

function stepCDF(table, x) {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (x < table[i][0]) {
      const [x0, y0] = table[i - 1], [x1, y1] = table[i];
      const t = (x - x0) / Math.max(1, x1 - x0);
      return y0 + (y1 - y0) * t;
    }
  }
  return 1;
}
/* 관람객 중 자가용 이용 비중 22%, 평균 승차인원 2.8인 → 1대당 관람객 2.8/0.22 */
function eventCars(ev) { return ev.attendance * 0.22 / 2.8; }

/** 해당 시각(분)에 공원에 주차돼 있는 공연 차량 수 */
function eventParkedAt(ev, minute) {
  const start = toMin(ev.start), end = toMin(ev.end);
  const a = stepCDF(ARRIVAL, minute - start);       // 도착 누적
  const d = stepCDF(DEPART, minute - end);          // 출차 누적
  return Math.max(0, a - d) * eventCars(ev);
}

function basePct(dateStr, hour) {
  return BASE_CURVE[dayType(dateStr)][hour];
}

function occupancy(dateStr, hour, weatherKey) {
  const evs = eventsOn(dateStr);
  const t = hour * 60 + 30;
  const base = CAPACITY_TOTAL * basePct(dateStr, hour) / 100;
  const ev = evs.reduce((s, e) => s + eventParkedAt(e, t), 0);
  const mult = WEATHER[weatherKey].mult;
  const raw = (base + ev) * mult;
  const pct = Math.round(clamp(raw / CAPACITY_TOTAL * 100, 0, 99));
  return { pct, cars: Math.round(Math.min(raw, CAPACITY_TOTAL * 0.99)), eventCars: Math.round(ev), base: Math.round(base) };
}

function level(pct) {
  if (pct >= 92) return { k: 4, label: '만차', cls: 'st-4', color: 'var(--l4)' };
  if (pct >= 80) return { k: 3, label: '혼잡', cls: 'st-3', color: 'var(--l3)' };
  if (pct >= 60) return { k: 2, label: '보통', cls: 'st-2', color: 'var(--l2)' };
  return { k: 1, label: '여유', cls: 'st-1', color: 'var(--l1)' };
}
function waitMin(pct) {
  if (pct < 70) return 0;
  if (pct < 85) return Math.round((pct - 70) * 0.5);
  if (pct < 95) return Math.round(8 + (pct - 85) * 1.2);
  return Math.min(45, Math.round(20 + (pct - 95) * 3));
}

/** 구역별 점유율 */
function zonesAt(dateStr, hour, weatherKey) {
  const evs = eventsOn(dateStr);
  const bp = basePct(dateStr, hour);
  const b = occupancy(dateStr, hour, weatherKey);
  const mult = WEATHER[weatherKey].mult;
  const totalEventCars = evs.reduce((s, e) => s + eventParkedAt(e, hour * 60 + 30), 0);

  // 공연장별 구역 가중치 합(정규화 기준)
  const vsum = {};
  Object.keys(VENUES).forEach((k) => { vsum[k] = ZONES.reduce((s, z) => s + (z.venueWeights[k] || 0), 0); });

  return ZONES.map((z) => {
    const bias = z.cap < 200 ? 1.12 : z.cap > 500 ? 0.94 : 1.0;
    const baseCars = z.cap * (bp / 100) * bias;
    let evCars = 0;
    evs.forEach((e) => {
      const w = (z.venueWeights[e.venue] || 0.05) / (vsum[e.venue] || 1);
      evCars += eventParkedAt(e, hour * 60 + 30) * w;
    });
    const occ = Math.round(clamp((baseCars + evCars) * mult / z.cap * 100, 0, 99));
    return { ...z, occ, wait: waitMin(occ), lv: level(occ), evCars: Math.round(evCars), totalEventCars: Math.round(totalEventCars) };
  });
}

function rankZones(list, venueKey) {
  const v = venueKey === 'none' ? null : venueKey;
  return [...list]
    .map((z) => ({ ...z, walkMin: v ? z.walk[v] : 10 }))
    .sort((a, b) => score(a) - score(b));
}
function score(z) {
  const penalty = z.occ >= 92 ? 300 : 0; // 만차 구역은 사실상 후순위
  return z.occ + z.walkMin * 2.5 + penalty;
}

function arrivalAdvice(dateStr) {
  const evs = eventsOn(dateStr).slice().sort((a, b) => toMin(a.start) - toMin(b.start));
  if (!evs.length) return null;
  const first = evs[0];
  const arrive = toMin(first.start) - 90;
  return { event: first, arriveStr: `${Math.floor(arrive / 60)}:${pad(arrive % 60)}` };
}

/* ---------- 렌더 ---------- */
function buildHourSelect() {
  const sel = $('#hour');
  sel.innerHTML = '';
  for (let h = 0; h < 24; h++) {
    const o = document.createElement('option');
    o.value = h; o.textContent = `${pad(h)}:00 ~ ${pad(h)}:59`;
    sel.appendChild(o);
  }
}

function renderLive() {
  const badge = $('#liveBadge'), txt = $('#liveText');
  fetch(LIVE_API, { cache: 'no-store' })
    .then((r) => r.json())
    .then((j) => {
      const sum = Array.isArray(j) && j[0] && j[0].parking_sum;
      if (!sum && sum !== 0) throw new Error('no value');
      const pct = Math.round((sum / CAPACITY_3GATE) * 100);
      txt.textContent = `실시간 ${Number(sum).toLocaleString()}대 / ${CAPACITY_3GATE.toLocaleString()}면 (3개 문 · ${pct}%)`;
      badge.classList.remove('err');
    })
    .catch(() => {
      badge.classList.add('err');
      txt.textContent = '실시간 조회 실패 · 예측 모델로 표시';
    });
}

function renderAll() {
  const { date, hour, venue, weather, mode } = STATE;
  const evsToday = eventsOn(date);
  const oc = occupancy(date, hour, weather);
  const lv = level(oc.pct);

  /* 선택한 공연장 공연 안내 */
  const myEvent = evsToday.find((e) => e.venue === venue);
  const hint = $('#eventHint');
  if (myEvent) {
    hint.innerHTML = `<b>${myEvent.start} ${VENUES[myEvent.venue].name}</b> 공연이 있는 날입니다. 시작 90분 전 도착을 기준으로 계산했습니다.`;
  } else if (evsToday.length) {
    hint.innerHTML = `이 날은 <b>${evsToday.map((e) => `${VENUES[e.venue].name} ${e.start}`).join(', ')}</b> 공연이 있습니다.`;
  } else {
    hint.textContent = '선택한 날짜에는 등록된 공연이 없어 일반 방문 패턴으로 계산했습니다.';
  }

  /* 결과 카드 */
  $('#resultWhen').textContent = `${dateLabel(date)} ${pad(hour)}시`;
  $('#resultPct').textContent = oc.pct;
  $('#resultSub').textContent = `약 ${oc.cars.toLocaleString()}대 / ${CAPACITY_TOTAL.toLocaleString()}면`;
  const badge = $('#resultBadge');
  badge.textContent = lv.label;
  badge.style.background = lv.color;
  $('#gaugeFill').style.width = oc.pct + '%';
  $('#gaugeFill').style.background = lv.k === 1 ? 'var(--l1)' : lv.k === 2 ? 'var(--l2)' : lv.k === 3 ? 'var(--l3)' : 'var(--l4)';

  const adv = arrivalAdvice(date);
  let text;
  if (mode === 'transit') {
    text = `대중교통 방문을 선택하셨습니다. ${adv ? `${adv.event.start} 공연 시작 전 올림픽공원역 3·4번 출구는 가장 붐비는 구간입니다. ` : ''}공연 종료 후에는 한성백제역(9호선)으로 걸어 나오면 대기 없이 이동할 수 있습니다.`;
  } else if (oc.pct >= 92) {
    text = `만차에 가깝습니다. 이대로 오시면 입차 대기 ${waitMin(oc.pct)}분 이상이 예상됩니다. ${adv ? `차량 대신 지하철로 오셔서 ${adv.arriveStr} 이전 도착을 권합니다.` : '지하철 우회를 권합니다.'}`;
  } else if (oc.pct >= 80) {
    text = `혼잡 시간대입니다. 공연장 인접 구역은 이미 찬 상태이므로 한 블록 떨어진 구역에 세우고 5~10분 걷는 편이 빠릅니다.`;
  } else if (oc.pct >= 60) {
    text = `보통 수준입니다. ${adv ? `공연 시작 ${adv.event.start} 기준 ${adv.arriveStr} 이전에 도착하면 여유 있게 주차할 수 있습니다.` : '원하는 구역에 주차할 가능성이 높습니다.'}`;
  } else {
    text = `여유로운 시간대입니다. 공원 인접 구역 어디든 바로 입차할 수 있습니다.`;
  }
  $('#advice').textContent = text;

  const ranked = rankZones(zonesAt(date, hour, weather), venue);
  const best = ranked[0];
  $('#kvRow').innerHTML = `
    <div><b>예상 입차 대기</b><span>${waitMin(oc.pct)}분</span></div>
    <div><b>추천 구역</b><span>${best.id}</span></div>
    <div><b>공연 영향</b><span>${oc.eventCars > 0 ? '+' + oc.eventCars.toLocaleString() + '대' : '없음'}</span></div>`;

  /* 차트 */
  const chart = $('#chart');
  chart.innerHTML = '';
  for (let h = 0; h < 24; h++) {
    const p = occupancy(date, h, weather).pct;
    const w = document.createElement('div');
    w.className = 'bar-wrap' + (h === hour ? ' sel' : '');
    w.dataset.hour = h;
    w.innerHTML = `<span class="lab">${p}%</span>
      <div class="bar" style="height:${Math.max(2, p)}%;background:${level(p).color}"></div>
      ${h % 3 === 0 ? `<span class="hr">${pad(h)}</span>` : ''}`;
    w.addEventListener('click', () => { STATE.hour = h; $('#hour').value = h; renderAll(); });
    chart.appendChild(w);
  }
  const peak = Array.from({ length: 24 }, (_, h) => ({ h, p: occupancy(date, h, weather).pct }))
    .sort((a, b) => b.p - a.p)[0];
  $('#chartCaption').innerHTML = evsToday.length
    ? `이 날 공연(${evsToday.map((e) => VENUES[e.venue].name + ' ' + e.start).join(' · ')})으로 <b>${pad(peak.h)}시 ${peak.p}%</b>까지 오릅니다. 막대를 누르면 그 시간대 결과로 바뀝니다.`
    : `공연이 없는 날의 일반 방문 패턴입니다. 최대치는 <b>${pad(peak.h)}시 ${peak.p}%</b>입니다. 막대를 누르면 그 시간대 결과로 바뀝니다.`;

  /* 주차 탭 */
  const venueName = venue === 'none' ? '공원 산책' : VENUES[venue].name;
  $('#parkingCaption').textContent = `${dateLabel(date)} ${pad(hour)}시 · ${venueName} 기준 · ${WEATHER[weather].label}`;
  const body = $('#zoneBody');
  body.innerHTML = ranked.map((z, i) => `
    <tr class="${i === 0 ? 'top1' : ''}">
      <td class="rank">${i + 1}</td>
      <td>${z.name}</td>
      <td>${z.gate}</td>
      <td class="occ">${z.occ}%</td>
      <td>${z.wait === 0 ? '없음' : z.wait + '분'}</td>
      <td>${z.walkMin}분</td>
      <td><span class="state ${z.lv.cls}">${z.lv.label}</span></td>
    </tr>`).join('');

  const good = ranked.filter((z) => z.occ < 90);
  $('#bestZone').innerHTML = `
    <div class="bname">${best.id} 주차장</div>
    <div class="bmeta">${best.name} · ${best.gate} 입차 · 공연장까지 도보 ${best.walkMin}분</div>
    <div class="brow">
      <div><b>${best.occ}%</b>예상 점유율</div>
      <div><b>${best.wait}분</b>예상 대기</div>
      <div><b>${best.walkMin}분</b>공연장까지</div>
    </div>
    <div class="why">${best.occ >= 92
      ? '이 시간대 모든 구역이 만차에 가깝습니다. 주차 후 이동보다 지하철 전환이 빠릅니다.'
      : `공연장 인접 구역보다 점유율이 ${Math.max(0, ranked[ranked.length - 1].occ - best.occ)}%p 낮고, 도보 부담이 적어 가장 유리합니다.${good.length <= 2 ? ' 대안 구역이 거의 없어 서둘러 도착하는 편이 좋습니다.' : ''}`}</div>`;

  const busy = oc.pct >= 80;
  $('#subwayList').innerHTML = SUBWAY.map((s) => {
    const main = s.mul < 1.2;                       // 올림픽공원역 = 가장 가까운 역
    const tag = busy ? (main ? '혼잡 예상' : '권장') : '대안';
    return `<div class="sub ${busy && !main ? 'rec' : ''}">
      <div class="sname">${s.station} <span class="tag">${s.crowd}</span></div>
      <div class="smeta">${s.lines} · ${s.exit} · 공연장 도보 ${s.walk[venue === 'none' ? 'KSPO' : venue]}분</div>
      <div class="swalk"><span>${tag}</span><span>막차 확인 필요</span></div>
    </div>`;
  }).join('');

  $('#courseBefore').innerHTML = COURSES.before.map((c) => `
    <li><b>${c.title} <em>${c.min}분</em></b><span>${c.desc}</span></li>`).join('');
  $('#courseAfter').innerHTML = COURSES.after.map((c) => `
    <li><b>${c.title} <em>${c.min}분</em></b><span>${c.desc}</span></li>`).join('');

  /* 라인업 */
  const today = todayStr();
  const sorted = [...EVENTS].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  $('#lineup').innerHTML = sorted.map((e) => {
    const d = new Date(e.date + 'T00:00:00');
    const peak = occupancy(e.date, Math.floor(toMin(e.start) / 60) - 1, 'clear').pct;
    const lv2 = level(peak);
    return `<div class="show ${e.date === today ? 'today' : ''}">
      <div class="d"><b>${pad(d.getMonth() + 1)}.${pad(d.getDate())}</b>${DAY_KO[d.getDay()]}요일</div>
      <div class="t"><b>${e.title}</b><span>${VENUES[e.venue].label} · ${e.start}~${e.end}</span></div>
      <div class="p ${lv2.k <= 2 ? 'low' : ''}">공연 1시간 전 ${peak}%</div>
    </div>`;
  }).join('');

  /* 데이터 탭 */
  const ds = [
    { id: '15164822', t: '올림픽공원 차량입출차·공연·날씨 연계', d: '2025년 1~12월 7,803건. 일자·시간대별 입차 대수+공연 유무+기온·습도·풍향을 결합. 본 서비스의 기본 수요 곡선과 공연 계수 산출 근거.' },
    { id: '3037877', t: '올림픽공원 공연정보', d: '행사명·기간·장소·홈페이지 URL. 2,592건(2025.6 기준). 방문일 공연 라인업과 공연장 규모 매칭에 사용.' },
    { id: '15100884', t: '올팍소식', d: '등록일·제목·내용·URL 1,716건. 주차장 공사, 행사 통제, 서비스 중단 등 예측을 뒤집는 공지를 반영.' },
    { id: 'KMA', t: '기상청 단기예보 (공동활용)', d: '방문일 강수·적설·기온 예보로 날씨 계수(맑음 1.00 / 비 1.14 / 눈 1.26)를 적용.' }
  ];
  $('#dsGrid').innerHTML = ds.map((x) => `
    <div class="ds"><b><span class="id">${x.id}</span>${x.t}</b><p>${x.d}</p></div>`).join('');
}

/* ---------- 초기화 ---------- */
function init() {
  buildHourSelect();
  const t = todayStr();
  const sortedEvs = [...EVENTS].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const nextEv = sortedEvs.find((e) => e.date >= t) || sortedEvs[sortedEvs.length - 1];
  STATE.date = eventsOn(t).length ? t : (nextEv ? nextEv.date : t);
  const evs = eventsOn(STATE.date);
  const nowH = new Date().getHours();
  STATE.hour = evs.length ? clamp(Math.floor(toMin(evs[0].start) / 60) - 1, 0, 23) : clamp(nowH, 9, 20);
  if (evs.length) STATE.venue = evs[0].venue;

  $('#date').value = STATE.date;
  $('#hour').value = STATE.hour;
  $('#venue').value = STATE.venue;

  $('#date').addEventListener('change', (e) => {
    STATE.date = e.target.value || t;
    const ev2 = eventsOn(STATE.date);
    if (ev2.length) { STATE.venue = ev2[0].venue; $('#venue').value = STATE.venue; }
    renderAll();
  });
  $('#hour').addEventListener('change', (e) => { STATE.hour = Number(e.target.value); renderAll(); });
  $('#venue').addEventListener('change', (e) => { STATE.venue = e.target.value; renderAll(); });

  document.querySelectorAll('#weather button').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('#weather button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active'); STATE.weather = b.dataset.v; renderAll();
  }));
  document.querySelectorAll('#mode button').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('#mode button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active'); STATE.mode = b.dataset.v; renderAll();
  }));

  document.querySelectorAll('#tabs .tab').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('#tabs .tab').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    const panel = document.getElementById('tab-' + b.dataset.tab);
    panel.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (b.dataset.tab === 'parking') {
      // 표·추천 카드가 바로 보이도록 스크롤 위치 보정
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'auto' }), 10);
    }
  }));

  renderLive();
  renderAll();
}
document.addEventListener('DOMContentLoaded', init);
