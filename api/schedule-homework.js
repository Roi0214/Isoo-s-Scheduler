/**
 * Vercel Serverless Function — AI 지능형 숙제 배분 엔진
 * 경로: POST /api/schedule-homework
 *
 * Body: { homeworks, schedules, googleEvents, weekStart }
 * Response: { blocks, unscheduled }
 */

// ── 시간 유틸 ────────────────────────────────────────────────
function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ── 날짜 유틸 ────────────────────────────────────────────────
function getWeekDates(weekStart) {
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${day}`)
  }
  return dates
}

function getDayOfWeek(dateStr) {
  // 0=일, 1=월, ..., 6=토
  return new Date(dateStr + 'T00:00:00').getDay()
}

function isWeekend(dateStr) {
  const d = getDayOfWeek(dateStr)
  return d === 0 || d === 6
}

// ── 고정 일정에서 해당 날짜의 일정 필터링 ─────────────────────
function getSchedulesForDate(schedules, dateStr) {
  const dow = getDayOfWeek(dateStr)
  return schedules.filter(s => {
    if (!s.days.includes(dow)) return false
    if (s.exceptions && s.exceptions.includes(dateStr)) return false
    if (s.effectiveFrom && dateStr < s.effectiveFrom) return false
    if (s.effectiveTo && dateStr > s.effectiveTo) return false
    return true
  })
}

// ── 가용 슬롯 계산 ───────────────────────────────────────────
const HARD_DEADLINE = 22 * 60 + 30   // 22:30
const SOFT_DEADLINE = 22 * 60        // 22:00

// 슬롯 병합: 겹치거나 인접한 블록 제거 후 남은 빈 시간 반환
function calcAvailableSlots(schedules, googleEvents, dateStr) {
  const weekend = isWeekend(dateStr)

  // 하교 후 시작 시간 (평일: 16:00, 주말: 09:00)
  const dayStart = weekend ? 9 * 60 : 16 * 60

  // 고정 일정 블록 (미션 카테고리 제외 — 시간표에서도 제외하는 기존 로직과 동일)
  const fixedBlocks = getSchedulesForDate(schedules, dateStr)
    .filter(s => s.category !== 'mission')
    .map(s => ({ start: timeToMinutes(s.startTime), end: timeToMinutes(s.endTime) }))

  // Google 캘린더 이벤트 블록
  const gcBlocks = (googleEvents || [])
    .filter(e => e.date === dateStr && !e.allDay && e.startTime && e.endTime)
    .map(e => ({ start: timeToMinutes(e.startTime), end: timeToMinutes(e.endTime) }))

  // 식사 시간 블록
  const mealBlocks = weekend
    ? [
        { start: 12 * 60, end: 13 * 60 },  // 점심
        { start: 18 * 60, end: 19 * 60 },  // 저녁
      ]
    : [
        { start: 18 * 60, end: 19 * 60 },  // 저녁만
      ]

  const allBlocks = [...fixedBlocks, ...gcBlocks, ...mealBlocks]
    .filter(b => b.end > dayStart && b.start < HARD_DEADLINE)
    .map(b => ({ start: Math.max(b.start, dayStart), end: Math.min(b.end, HARD_DEADLINE) }))
    .sort((a, b) => a.start - b.start)

  // 빈 슬롯 계산
  const slots = []
  let cursor = dayStart

  for (const block of allBlocks) {
    if (block.start > cursor) {
      slots.push({ start: cursor, end: block.start })
    }
    cursor = Math.max(cursor, block.end)
  }
  if (cursor < HARD_DEADLINE) {
    slots.push({ start: cursor, end: HARD_DEADLINE })
  }

  // 10분 미만 슬롯 제거
  return slots.filter(s => s.end - s.start >= 10)
}

// ── 학원 일정 맵 생성 (linked_event → 수업 날짜 목록) ──────────
function buildLinkedEventMap(schedules, weekDates) {
  const map = {}  // eventTitle → [dateStr, ...]
  for (const dateStr of weekDates) {
    const daySchedules = getSchedulesForDate(schedules, dateStr)
    for (const s of daySchedules) {
      const title = s.title
      if (!map[title]) map[title] = []
      map[title].push(dateStr)
    }
  }
  return map
}

// ── Gemini API 호출 ──────────────────────────────────────────
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.')

  // gemini-2.0-flash-lite: 무료 티어 지원 모델
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API 오류 ${res.status}: ${err}`)
  }

  const data = await res.json()
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!raw) throw new Error('Gemini 응답이 비어 있습니다.')

  // 마크다운 코드 블록(```json ... ```) 안전 제거 후 파싱
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error(`Gemini 응답 JSON 파싱 실패:\n${cleaned.slice(0, 200)}`)
  }
}

// ── 프롬프트 빌더 ────────────────────────────────────────────
function buildPrompt(homeworks, schedules, googleEvents, weekDates) {
  const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토']

  // 날짜별 가용 슬롯 + 고정 일정 요약
  const daySlotLines = weekDates.map(dateStr => {
    const dow = getDayOfWeek(dateStr)
    const dowKr = WEEKDAY_KR[dow]
    const weekend = isWeekend(dateStr)
    const dayLabel = `${dateStr}(${dowKr})`

    const fixedSchedules = getSchedulesForDate(schedules, dateStr)
      .filter(s => s.category !== 'mission')
      .map(s => `  - [고정] ${s.title} ${s.startTime}~${s.endTime}`)
      .join('\n')

    const gcEvents = (googleEvents || [])
      .filter(e => e.date === dateStr && !e.allDay)
      .map(e => `  - [외부] ${e.title} ${e.startTime}~${e.endTime}`)
      .join('\n')

    const slots = calcAvailableSlots(schedules, googleEvents, dateStr)
    const slotLines = slots.length > 0
      ? slots.map(s => `  - 빈슬롯: ${minutesToTime(s.start)}~${minutesToTime(s.end)} (${s.end - s.start}분)`).join('\n')
      : '  - 빈슬롯 없음'

    const dayType = weekend ? '[주말]' : '[평일]'
    return `### ${dayLabel} ${dayType}\n고정일정:\n${fixedSchedules || '  없음'}\n외부이벤트:\n${gcEvents || '  없음'}\n가용슬롯:\n${slotLines}`
  }).join('\n\n')

  // 학원 일정 맵
  const linkedEventMap = buildLinkedEventMap(schedules, weekDates)

  // 학원별 수업 날짜 요약
  const linkedEventSummary = Object.entries(linkedEventMap)
    .map(([title, dates]) => `  - "${title}": 수업일 = ${dates.join(', ')}`)
    .join('\n')

  // 숙제 목록 (토큰 절약을 위해 간결하게 직렬화)
  const homeworkLines = homeworks
    .filter(hw => hw.status !== 'completed')
    .map((hw, i) => {
      const div = hw.is_divisible ? `div(unit=${hw.unit},total=${hw.total_units})` : 'nodiv'
      const lnk = hw.linked_event ? `lnk=${hw.linked_event}` : ''
      return `${i + 1}|${hw.id}|${hw.title}|${hw.subject}|난이도${hw.difficulty}|${hw.estimated_minutes}min|${div}|${lnk}|due=${hw.dueDate}`
    })
    .join('\n')

  return `JSON만 출력. 마크다운 블록 금지. 첫 글자 반드시 {

초등학생(9세) 주간 숙제 배분. 주: ${weekDates[0]}~${weekDates[6]}

[학원 수업일]
${linkedEventSummary || '없음'}

[가용 슬롯]
${daySlotLines}

[숙제목록] 형식: 번호|id|제목|과목|난이도|소요|분할|연결학원|마감
${homeworkLines || '없음'}

[규칙]
A: linked_event 있으면 학원 당일(D) 제외, D-1까지 완료
B: "보카복습"/"보카2차" 포함 숙제는 학원D-1 당일에만 배치(앞당기기 금지)
C: div 숙제는 unit 단위로 쪼개 분산. blocks에 units_today 기재
D: 난이도상 → 평일19-21시/주말09-14시 우선. 중·하는 남은슬롯 자유
E: 소프트22:00전, 하드22:30후 절대금지. 초과분 다음날/주말 이월→unscheduled

[출력 JSON 스키마]
{"blocks":[{"homework_id":"","homework_title":"","subject":"","date":"YYYY-MM-DD","start_time":"HH:MM","end_time":"HH:MM","units_today":null,"reason":""}],"unscheduled":[{"homework_id":"","homework_title":"","reason":""}]}`
}

// ── 메인 핸들러 ──────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' })

  // ── [DEBUG] 환경변수 상태 로깅 ─────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY
  console.log('[schedule-homework] GEMINI_API_KEY 상태:', apiKey
    ? `설정됨 (길이: ${apiKey.length}, 앞4자: ${apiKey.slice(0, 4)}...)`
    : '❌ 없음 — Vercel 환경변수 미설정')
  console.log('[schedule-homework] Node 버전:', process.version)
  console.log('[schedule-homework] 요청 메서드:', req.method)

  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY가 서버에 설정되어 있지 않습니다. Vercel 대시보드 → Settings → Environment Variables를 확인하세요.',
      debug: { keySet: false },
    })
  }
  // ── [DEBUG] 끝 ────────────────────────────────────────────

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: '요청 body JSON 파싱 실패' })
  }

  const { homeworks, schedules, googleEvents, weekStart } = body ?? {}

  if (!homeworks || !schedules || !weekStart) {
    return res.status(400).json({ error: 'homeworks, schedules, weekStart 필드가 필요합니다.' })
  }

  // weekStart 요일 검증 — 월요일이 아니면 그냥 통과 (엄격 검증 완화)
  const startDow = getDayOfWeek(weekStart)
  console.log('[schedule-homework] weekStart:', weekStart, '/ 요일(0=일):', startDow)

  try {
    const weekDates = getWeekDates(weekStart)

    // 배분 대상: 미완료 백로그 숙제만
    const backlog = homeworks.filter(hw => hw.status !== 'completed')
    console.log('[schedule-homework] 배분 대상 숙제 수:', backlog.length)

    if (backlog.length === 0) {
      return res.status(200).json({ blocks: [], unscheduled: [] })
    }

    const prompt = buildPrompt(backlog, schedules, googleEvents || [], weekDates)
    console.log('[schedule-homework] Gemini 호출 시작...')
    const result = await callGemini(prompt)
    console.log('[schedule-homework] Gemini 응답 수신 완료. blocks:', result.blocks?.length ?? 0)

    // 응답 검증
    const blocks = Array.isArray(result.blocks) ? result.blocks : []
    const unscheduled = Array.isArray(result.unscheduled) ? result.unscheduled : []

    // subject 필드 보완 (AI가 누락할 경우 homeworks에서 찾아서 채움)
    const hwMap = Object.fromEntries(backlog.map(h => [h.id, h]))
    const enrichedBlocks = blocks.map(b => ({
      ...b,
      subject: b.subject || hwMap[b.homework_id]?.subject || 'etc',
    }))

    return res.status(200).json({ blocks: enrichedBlocks, unscheduled })
  } catch (err) {
    console.error('[schedule-homework] ❌ 오류:', err.message)
    return res.status(500).json({
      error: `AI 배분 실패: ${err.message}`,
      debug: { step: 'callGemini or buildPrompt' },
    })
  }
}
