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

// ── Groq API 호출 ────────────────────────────────────────────
async function callGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY 환경변수가 설정되지 않았습니다.')

  const url = 'https://api.groq.com/openai/v1/chat/completions'

  const body = {
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: '당신은 초등학생 숙제 배분 전문가입니다. 반드시 유효한 JSON만 출력하세요. 마크다운, 설명, 코드블록 일절 금지.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 4096,
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq API 오류 ${res.status}: ${err}`)
  }

  const data = await res.json()
  const raw = data?.choices?.[0]?.message?.content
  if (!raw) throw new Error('Groq 응답이 비어 있습니다.')

  try {
    return JSON.parse(raw)
  } catch {
    throw new Error(`Groq 응답 JSON 파싱 실패:\n${raw.slice(0, 200)}`)
  }
}

// ── 프롬프트 빌더 ────────────────────────────────────────────
const DEFAULT_RULES_TEXT = `공통: 모든 블록의 start_time~end_time은 반드시 해당 날짜의 '가용슬롯' 범위 안에만 배치. 고정일정·식사시간과 1분도 겹쳐선 안됨
A: linked_event 있으면 학원 당일(D) 제외, D-1까지 완료
B: fixed_d1 플래그 숙제는 반드시 dueDate 당일 하루에만 배치(앞당기기·분할 절대 금지). 슬롯 부족해도 무조건 그 날에 배치
C: div 숙제는 한 슬롯에 전체를 넣을 수 있으면 통으로 배치. 슬롯이 부족할 때만 unit 단위로 분할. units_today에 해당 세션 분량 기재
D: 난이도상 → 평일19-21시/주말09-14시 우선. 중·하는 남은슬롯 자유
E: 소프트22:00전, 하드22:30후 절대금지. 초과분 다음날/주말 이월→unscheduled
F: priority=low 비반복 숙제는 high·medium 완료 후 여유슬롯에만 배치. 슬롯 부족 시 unscheduled 처리 가능
G: repeat=daily 숙제(연산·구몬 등)는 due=null이면 이번 주 전체(일요일 포함), due=날짜이면 그 날까지 매일 1회 estimated_minutes분 블록 생성. priority=low인 경우 해당 날의 가용슬롯 합계가 60분 미만이거나 high/medium 숙제가 2개 이상 배치된 날은 생략 가능. units_today=null`

function buildPrompt(homeworks, schedules, googleEvents, weekDates, customRulesText) {
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
      const div = hw.repeat ? 'repeat=daily' : (hw.is_divisible ? `div(unit=${hw.unit},total=${hw.total_units})` : 'nodiv')
      const lnk = hw.linked_event ? `lnk=${hw.linked_event}` : ''
      const due = hw.dueDate ? `due=${hw.dueDate}` : 'due=null'
      const d1 = hw.fixed_d1 ? '|fixed_d1' : ''
      return `${i + 1}|${hw.id}|${hw.title}|${hw.subject}|난이도${hw.difficulty}|${hw.estimated_minutes}min|${div}|${lnk}|${due}${d1}`
    })
    .join('\n')

  return `JSON만 출력. 마크다운 블록 금지. 첫 글자 반드시 {

초등학생(9세) 주간 숙제 배분. 주: ${weekDates[0]}~${weekDates[6]} (일요일 포함 7일 모두 배분 가능)

[학원 수업일]
${linkedEventSummary || '없음'}

[가용 슬롯]
${daySlotLines}

[숙제목록] 형식: 번호|id|제목|과목|난이도|소요|분할|연결학원|마감
${homeworkLines || '없음'}

[규칙]
${customRulesText || DEFAULT_RULES_TEXT}

[출력 JSON 스키마]
{"blocks":[{"homework_id":"","homework_title":"","subject":"","date":"YYYY-MM-DD","start_time":"HH:MM","end_time":"HH:MM","units_today":null,"reason":""}],"unscheduled":[{"homework_id":"","homework_title":"","reason":""}]}`
}

// ── 블록 유효성 검증 ─────────────────────────────────────────
/**
 * AI가 생성한 블록이 학원·식사 시간과 겹치거나
 * 가용 범위(dayStart ~ HARD_DEADLINE)를 벗어나면 false 반환
 */
function isBlockValid(block, schedules, googleEvents) {
  if (!block.start_time || !block.end_time || !block.date) return false
  const start = timeToMinutes(block.start_time)
  const end   = timeToMinutes(block.end_time)
  if (start >= end) return false

  const weekend  = isWeekend(block.date)
  const dayStart = weekend ? 9 * 60 : 16 * 60

  // 가용 범위 밖
  if (start < dayStart || end > HARD_DEADLINE) return false

  // 고정 일정과 겹침
  const daySchedules = getSchedulesForDate(schedules, block.date)
    .filter(s => s.category !== 'mission')
  for (const s of daySchedules) {
    const sStart = timeToMinutes(s.startTime)
    const sEnd   = timeToMinutes(s.endTime)
    if (start < sEnd && end > sStart) return false
  }

  // Google 캘린더 이벤트와 겹침
  const gcEvents = (googleEvents || []).filter(
    e => e.date === block.date && !e.allDay && e.startTime && e.endTime
  )
  for (const e of gcEvents) {
    const eStart = timeToMinutes(e.startTime)
    const eEnd   = timeToMinutes(e.endTime)
    if (start < eEnd && end > eStart) return false
  }

  // 식사 시간과 겹침
  const mealBlocks = weekend
    ? [{ start: 12 * 60, end: 13 * 60 }, { start: 18 * 60, end: 19 * 60 }]
    : [{ start: 18 * 60, end: 19 * 60 }]
  for (const m of mealBlocks) {
    if (start < m.end && end > m.start) return false
  }

  return true
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
  const apiKey = process.env.GROQ_API_KEY
  console.log('[schedule-homework] GROQ_API_KEY 상태:', apiKey
    ? `설정됨 (길이: ${apiKey.length}, 앞4자: ${apiKey.slice(0, 4)}...)`
    : '❌ 없음 — Vercel 환경변수 미설정')
  console.log('[schedule-homework] Node 버전:', process.version)
  console.log('[schedule-homework] 요청 메서드:', req.method)

  if (!apiKey) {
    return res.status(500).json({
      error: 'GROQ_API_KEY가 서버에 설정되어 있지 않습니다. Vercel 대시보드 → Settings → Environment Variables를 확인하세요.',
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

  const { homeworks, schedules, googleEvents, weekStart, customRulesText } = body ?? {}

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

    const prompt = buildPrompt(backlog, schedules, googleEvents || [], weekDates, customRulesText)
    console.log('[schedule-homework] Groq 호출 시작...')
    const result = await callGroq(prompt)
    console.log('[schedule-homework] Groq 응답 수신 완료. blocks:', result.blocks?.length ?? 0)

    // 응답 검증
    const blocks = Array.isArray(result.blocks) ? result.blocks : []
    const unscheduled = Array.isArray(result.unscheduled) ? result.unscheduled : []

    // subject 필드 보완 (AI가 누락할 경우 homeworks에서 찾아서 채움)
    const hwMap = Object.fromEntries(backlog.map(h => [h.id, h]))
    const enrichedBlocks = blocks.map(b => ({
      ...b,
      subject: b.subject || hwMap[b.homework_id]?.subject || 'etc',
    }))

    // ── 사후 검증: 학원·식사 시간과 겹치거나 범위 밖 블록 제거 ──
    const validBlocks   = enrichedBlocks.filter(b => isBlockValid(b, schedules, googleEvents || []))
    const invalidBlocks = enrichedBlocks.filter(b => !isBlockValid(b, schedules, googleEvents || []))
    if (invalidBlocks.length > 0) {
      console.warn('[schedule-homework] ⚠️ 유효하지 않은 블록 제거:', invalidBlocks.length)
    }

    // 유효하지 않아 제거된 블록 중 다른 날짜에 배치된 것도 없으면 unscheduled로 이동
    const scheduledIds = new Set(validBlocks.map(b => b.homework_id))
    const invalidUnscheduled = invalidBlocks
      .filter(b => !scheduledIds.has(b.homework_id))
      .map(b => ({
        homework_id:    b.homework_id,
        homework_title: b.homework_title,
        reason: '학원·식사 시간과 겹쳐 자동 제거됨 — 재생성 필요',
      }))

    // 기존 unscheduled + 새로 추가된 것 합산 (중복 제거)
    const allUnscheduled = [...unscheduled]
    for (const u of invalidUnscheduled) {
      if (!allUnscheduled.some(x => x.homework_id === u.homework_id)) {
        allUnscheduled.push(u)
      }
    }

    // 이미 validBlocks에 있는 것은 unscheduled에서 제거
    const finalUnscheduled = allUnscheduled.filter(u => !scheduledIds.has(u.homework_id))

    return res.status(200).json({ blocks: validBlocks, unscheduled: finalUnscheduled })
  } catch (err) {
    console.error('[schedule-homework] ❌ 오류:', err.message)
    return res.status(500).json({
      error: `AI 배분 실패: ${err.message}`,
      debug: { step: 'callGroq or buildPrompt' },
    })
  }
}
