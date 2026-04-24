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

  // v1 엔드포인트 사용 (responseMimeType은 v1beta 전용이므로 제거)
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
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

  // 숙제 목록
  const homeworkLines = homeworks
    .filter(hw => hw.status !== 'completed')
    .map((hw, i) => {
      const divisible = hw.is_divisible
        ? `분할가능(1회단위=${hw.unit ?? '?'}, 총단위=${hw.total_units ?? '?'})`
        : '분할불가'
      const linked = hw.linked_event ? `연결학원="${hw.linked_event}"` : '연결학원없음'
      return `${i + 1}. id="${hw.id}" 제목="${hw.title}" 과목=${hw.subject} 난이도=${hw.difficulty} 소요=${hw.estimated_minutes}분 ${divisible} ${linked} 마감=${hw.dueDate}`
    })
    .join('\n')

  return `[중요] 반드시 순수한 JSON 문자열로만 응답하세요. \`\`\`json 같은 마크다운 코드 블록, 설명 텍스트, 주석을 절대 포함하지 마세요. 응답의 첫 글자는 반드시 { 이어야 합니다.

당신은 초등학생(이수, 9세)의 주간 숙제 스케줄러입니다.
아래 정보를 바탕으로 이번 주(${weekDates[0]} ~ ${weekDates[6]}) 숙제를 배분하세요.

=== 학원 수업 날짜 정보 ===
${linkedEventSummary || '없음'}

=== 날짜별 가용 시간 슬롯 ===
${daySlotLines}

=== 배분할 숙제 목록 ===
${homeworkLines || '배분할 숙제 없음'}

=== 배분 규칙 (반드시 준수) ===

[규칙 A] 전날 완료 원칙:
연결학원(linked_event)이 있는 숙제는 해당 학원 수업일의 전날(D-1) 이전에 반드시 완료되도록 배치하세요.
즉, 학원 당일에는 해당 숙제를 배정하지 마세요.

[규칙 B] 보카 복습 특수 규칙:
제목에 "보카 복습" 또는 "보카 2차"가 포함된 숙제는 절대로 앞당기지 말고,
연결 학원일의 정확히 하루 전날(D-1)에만 배치하세요.

[규칙 C] 분할 배분:
is_divisible(분할가능)인 숙제는 unit(1회 단위) 크기로 쪼개어 여러 날에 분산 배치하세요.
각 블록에 units_today 필드로 당일 단위 수를 명시하세요.

[규칙 D] 난이도별 최적 시간대:
- 난이도 "상":
  * 평일 → 저녁 식사 후 19:00~21:00 사이 빈슬롯에 최우선 배치
  * 주말 → 오전~낮 시간(09:00~14:00) 빈슬롯에 최우선 배치
- 난이도 "중"/"하": 남은 빈슬롯에 자유롭게 배치

[규칙 E] 수면 시간 확보 (마감 규칙):
- Soft 마감: 가능하면 모든 숙제를 22:00 이전에 종료되도록 배치
- Hard 마감: 어떤 경우에도 22:30 이후에는 절대 숙제를 배정하지 마세요.
  시간이 부족하면 해당 숙제를 다음 날 또는 주말로 이월하고 unscheduled에 기록하세요.

[추가 규칙]
- 한 슬롯 안에 여러 숙제를 배치할 경우 시작/종료 시간이 겹치지 않도록 하세요.
- 배분 불가한 숙제는 반드시 unscheduled 배열에 이유와 함께 포함하세요.
- 모든 시간은 24시간제 HH:MM 형식을 사용하세요.

=== 출력 형식 (순수 JSON만 출력, 주석 없음) ===
{
  "blocks": [
    {
      "homework_id": "hw-xxx",
      "homework_title": "숙제 제목",
      "subject": "math",
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "units_today": null,
      "reason": "배치 이유 (한국어, 30자 이내)"
    }
  ],
  "unscheduled": [
    {
      "homework_id": "hw-xxx",
      "homework_title": "숙제 제목",
      "reason": "미배분 이유"
    }
  ]
}`
}

// ── 메인 핸들러 ──────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' })

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

  // weekStart가 월요일인지 검증 (0=일, 1=월)
  const startDow = getDayOfWeek(weekStart)
  if (startDow !== 1) {
    return res.status(400).json({ error: `weekStart는 월요일이어야 합니다. (받은 요일: ${startDow})` })
  }

  try {
    const weekDates = getWeekDates(weekStart)

    // 배분 대상: 미완료 백로그 숙제만
    const backlog = homeworks.filter(hw => hw.status !== 'completed')

    if (backlog.length === 0) {
      return res.status(200).json({ blocks: [], unscheduled: [] })
    }

    const prompt = buildPrompt(backlog, schedules, googleEvents || [], weekDates)
    const result = await callGemini(prompt)

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
    console.error('[api/schedule-homework] 오류:', err.message)
    return res.status(500).json({ error: `AI 배분 실패: ${err.message}` })
  }
}
