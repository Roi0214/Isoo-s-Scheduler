/**
 * Vercel Serverless Function — 결정론적 숙제 배분 엔진
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
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    dates.push(`${y}-${mo}-${day}`)
  }
  return dates
}

function getDayOfWeek(dateStr) {
  return new Date(dateStr + 'T00:00:00').getDay()
}

function isWeekend(dateStr) {
  const d = getDayOfWeek(dateStr)
  return d === 0 || d === 6
}

function prevDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── 고정 일정에서 해당 날짜의 일정 필터링 ─────────────────────
function getSchedulesForDate(schedules, dateStr) {
  const dow = getDayOfWeek(dateStr)
  return schedules.filter(s => {
    if (!s.days.includes(dow)) return false
    if (s.exceptions && s.exceptions.includes(dateStr)) return false
    if (s.effectiveFrom && dateStr < s.effectiveFrom) return false
    if (s.effectiveTo   && dateStr > s.effectiveTo)   return false
    return true
  })
}

// ── 가용 슬롯 계산 ───────────────────────────────────────────
const HARD_DEADLINE = 22 * 60 + 30  // 22:30

function calcAvailableSlots(schedules, googleEvents, dateStr) {
  const weekend  = isWeekend(dateStr)
  const dayStart = weekend ? 9 * 60 : 16 * 60

  const fixedBlocks = getSchedulesForDate(schedules, dateStr)
    .filter(s => s.category !== 'mission')
    .map(s => ({ start: timeToMinutes(s.startTime), end: timeToMinutes(s.endTime) }))

  const gcBlocks = (googleEvents || [])
    .filter(e => e.date === dateStr && !e.allDay && e.startTime && e.endTime)
    .map(e => ({ start: timeToMinutes(e.startTime), end: timeToMinutes(e.endTime) }))

  const mealBlocks = weekend
    ? [{ start: 12 * 60, end: 13 * 60 }, { start: 18 * 60, end: 19 * 60 }]
    : [{ start: 18 * 60, end: 19 * 60 }]

  const allBlocks = [...fixedBlocks, ...gcBlocks, ...mealBlocks]
    .filter(b => b.end > dayStart && b.start < HARD_DEADLINE)
    .map(b => ({ start: Math.max(b.start, dayStart), end: Math.min(b.end, HARD_DEADLINE) }))
    .sort((a, b) => a.start - b.start)

  const slots = []
  let cursor = dayStart
  for (const block of allBlocks) {
    if (block.start > cursor) slots.push({ start: cursor, end: block.start })
    cursor = Math.max(cursor, block.end)
  }
  if (cursor < HARD_DEADLINE) slots.push({ start: cursor, end: HARD_DEADLINE })

  return slots.filter(s => s.end - s.start >= 10)
}

// ── 학원 일정 맵 (exact + prefix 매칭 지원) ──────────────────
function buildLinkedEventMap(schedules, weekDates) {
  const map = {}
  for (const dateStr of weekDates) {
    for (const s of getSchedulesForDate(schedules, dateStr)) {
      if (!map[s.title]) map[s.title] = []
      if (!map[s.title].includes(dateStr)) map[s.title].push(dateStr)
    }
  }
  return map
}

/**
 * linked_event 문자열로 수업 날짜 목록 조회.
 * - 정확히 일치하는 스케줄 제목 우선
 * - 없으면 스케줄 제목이 linked_event로 시작하는 것 모두 수집
 *   (예: '트윈클' → '트윈클 픽션', '트윈클 논픽션' 포함)
 */
function getLinkedDates(linkedEvent, linkedEventMap) {
  if (!linkedEvent) return []
  if (linkedEventMap[linkedEvent]) return linkedEventMap[linkedEvent]

  const dates = new Set()
  for (const [title, dateList] of Object.entries(linkedEventMap)) {
    if (title.startsWith(linkedEvent)) {
      dateList.forEach(d => dates.add(d))
    }
  }
  return [...dates].sort()
}

// ── 결정론적 스케줄러 ────────────────────────────────────────
function runScheduler(homeworks, schedules, googleEvents, weekDates) {
  const blocks      = []
  const unscheduled = []
  const hwMap       = Object.fromEntries(homeworks.map(h => [h.id, h]))
  const linkedEventMap = buildLinkedEventMap(schedules, weekDates)

  // 날짜별 사용 구간 추적
  const dayUsed = {}
  weekDates.forEach(d => { dayUsed[d] = [] })

  // ── 사용 구간 제거 후 남은 슬롯 반환 ──
  function subtractUsed(slots, used) {
    let result = [...slots]
    for (const u of used) {
      result = result.flatMap(s => {
        if (u.end <= s.start || u.start >= s.end) return [s]
        const parts = []
        if (u.start > s.start) parts.push({ start: s.start, end: u.start })
        if (u.end   < s.end)   parts.push({ start: u.end,   end: s.end   })
        return parts
      }).filter(s => s.end - s.start >= 10)
    }
    return result
  }

  function getRemaining(dateStr) {
    return subtractUsed(
      calcAvailableSlots(schedules, googleEvents, dateStr),
      dayUsed[dateStr] || []
    )
  }

  function totalRemainingMins(dateStr) {
    return getRemaining(dateStr).reduce((sum, s) => sum + s.end - s.start, 0)
  }

  function markUsed(dateStr, start, end) {
    dayUsed[dateStr].push({ start, end })
    dayUsed[dateStr].sort((a, b) => a.start - b.start)
  }

  // 해당 날짜에 이미 배치된 high/medium 블록 수
  function countHighMedOnDate(dateStr) {
    return blocks.filter(b => {
      if (b.date !== dateStr) return false
      const hw = hwMap[b.homework_id]
      return hw?.priority === 'high' || hw?.priority === 'medium'
    }).length
  }

  // 난이도별 선호 시간대 (Rule D)
  function preferredRange(difficulty, dateStr) {
    if (difficulty !== '상') return null
    return isWeekend(dateStr)
      ? { start: 9 * 60, end: 14 * 60 }
      : { start: 19 * 60, end: 21 * 60 }
  }

  // 선호 시간대 → 일반 순으로 슬롯 탐색
  function findSlot(dateStr, duration, pref) {
    const slots = getRemaining(dateStr)

    if (pref) {
      for (const s of slots) {
        const rs = Math.max(s.start, pref.start)
        const re = Math.min(s.end,   pref.end)
        if (re - rs >= duration) return { start: rs, end: rs + duration }
      }
    }
    for (const s of slots) {
      if (s.end - s.start >= duration) return { start: s.start, end: s.start + duration }
    }
    return null
  }

  // 블록 추가 및 사용 구간 등록
  function addBlock(hw, dateStr, start, end, unitsToday) {
    blocks.push({
      homework_id:    hw.id,
      homework_title: hw.title,
      subject:        hw.subject,
      date:           dateStr,
      start_time:     minutesToTime(start),
      end_time:       minutesToTime(end),
      units_today:    unitsToday ?? null,
    })
    markUsed(dateStr, start, end)
  }

  // 배치 가능한 날짜 목록 계산
  function getCandidateDates(hw, targetDate) {
    // repeat=daily: 지정된 날짜만
    if (targetDate) return weekDates.includes(targetDate) ? [targetDate] : []

    const classDates  = new Set(getLinkedDates(hw.linked_event, linkedEventMap))
    // 토/일은 항상 보충·선행 배치 가능 (수업날 제외)
    const weekendDays = weekDates.filter(d => isWeekend(d) && !classDates.has(d))

    // ── 주말 우선 배치 조건 ──────────────────────────────────
    // 1) 차주 이후 마감: 이번 주 토/일에 미리 처리하는 것이 자연스러움
    // 2) 금요일 수업 연동: 수업 후 주말에 처리 (D-1 역방향 배치 방지)
    const lastWeekDate    = weekDates[weekDates.length - 1]  // 이번 주 일요일
    const fridayClassDate = [...classDates]
      .filter(d => getDayOfWeek(d) === 5)
      .sort()
      .pop()  // 이번 주 금요일 수업일 (없으면 undefined)
    const isNextWeekDue = hw.dueDate && hw.dueDate > lastWeekDate
    const weekendFirst  =
      isNextWeekDue ||
      (!!fridayClassDate && (!hw.dueDate || hw.dueDate >= fridayClassDate))

    // fixed_d1 + linked_event: 수업 전날들만 (Rule B)
    if (hw.fixed_d1 && classDates.size > 0) {
      return [...classDates]
        .map(prevDay)
        .filter(d => weekDates.includes(d))
        .sort()
    }

    // fixed_d1만 (linked_event 없음): dueDate 당일만 (Rule B)
    if (hw.fixed_d1 && hw.dueDate) {
      return weekDates.filter(d => d === hw.dueDate)
    }

    if (classDates.size > 0) {
      // 평일 후보: 수업날 제외, dueDate 이전
      let wkdCands = weekDates.filter(
        d => !classDates.has(d) && !isWeekend(d) && (!hw.dueDate || d <= hw.dueDate)
      )
      // 후보 없으면 폴백: 수업날 제외 평일 전체
      if (wkdCands.length === 0) {
        wkdCands = weekDates.filter(d => !classDates.has(d) && !isWeekend(d))
      }
      // 분할 불가: 주말우선이면 토/일 → 평일 내림차순, 아니면 평일 내림차순 → 토/일
      if (!hw.is_divisible)
        return weekendFirst
          ? [...weekendDays, ...[...wkdCands].sort((a, b) => b.localeCompare(a))]
          : [...[...wkdCands].sort((a, b) => b.localeCompare(a)), ...weekendDays]
      // 분할 가능: 주말우선이면 토/일 → 평일 오름차순, 아니면 평일 오름차순 → 토/일
      return weekendFirst
        ? [...weekendDays, ...wkdCands]
        : [...wkdCands, ...weekendDays]
    }

    // linked_event 없음: 차주 마감이면 토/일 먼저, 아니면 평일 먼저
    const wkdCands = weekDates.filter(d => !isWeekend(d) && (!hw.dueDate || d <= hw.dueDate))
    return weekendFirst
      ? [...weekendDays, ...wkdCands]
      : [...wkdCands, ...weekendDays]
  }

  // 단일 숙제 배치 실행
  function scheduleOne(hw, targetDate) {
    const candidates = getCandidateDates(hw, targetDate)

    if (candidates.length === 0) {
      unscheduled.push({
        homework_id:    hw.id,
        homework_title: hw.title,
        reason: '배치 가능한 날짜 없음 (마감일·학원 제약)',
      })
      return false
    }

    const pref = (d) => preferredRange(hw.difficulty, d)

    // ── 분할 불가 (Rule C: 통으로만) ──
    if (!hw.is_divisible) {
      for (const d of candidates) {
        const slot = findSlot(d, hw.estimated_minutes, pref(d))
        if (slot) {
          addBlock(hw, d, slot.start, slot.end, null)
          return true
        }
      }
      unscheduled.push({
        homework_id:    hw.id,
        homework_title: hw.title,
        reason: '슬롯 부족 — 배치 실패',
      })
      return false
    }

    // ── 분할 가능 (Rule C: unit 단위로 날짜에 분산 배치) ──
    const unit    = hw.unit || hw.estimated_minutes
    let remaining = hw.estimated_minutes

    // 라운드로빈: 하루에 최대 1 unit씩, 후보 날짜를 돌며 분산
    // remaining이 줄지 않으면(슬롯 없음) 루프 종료
    let prevRemaining
    do {
      prevRemaining = remaining
      for (const d of candidates) {
        if (remaining <= 0) break
        const chunk = Math.min(remaining, unit)
        const slot  = findSlot(d, chunk, pref(d))
        if (slot) {
          addBlock(hw, d, slot.start, slot.end, chunk)
          remaining -= chunk
        }
      }
    } while (remaining > 0 && remaining !== prevRemaining)

    if (remaining > 0) {
      const placed = hw.estimated_minutes - remaining
      unscheduled.push({
        homework_id:    hw.id,
        homework_title: hw.title,
        reason: placed > 0
          ? `부분 배치 (${placed}/${hw.estimated_minutes}분 완료, ${remaining}분 슬롯 부족)`
          : '슬롯 부족 — 배치 실패',
      })
      return false
    }
    return true
  }

  // ── 배치 우선순위 ─────────────────────────────────────────
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

  // 1단계: fixed_d1 (가장 제약이 강함, Rule B)
  const fixed_d1Hws = homeworks.filter(hw => hw.fixed_d1 && !hw.repeat)
  fixed_d1Hws.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
  for (const hw of fixed_d1Hws) scheduleOne(hw, null)

  // 2단계: repeat=daily (날짜 지정, Rule G)
  const repeatEntries = []
  for (const hw of homeworks.filter(h => h.repeat)) {
    for (const d of weekDates) {
      if (hw.dueDate && d > hw.dueDate) continue
      repeatEntries.push({ hw, targetDate: d })
    }
  }
  repeatEntries.sort((a, b) => {
    const pd = (PRIORITY_ORDER[a.hw.priority] ?? 1) - (PRIORITY_ORDER[b.hw.priority] ?? 1)
    return pd !== 0 ? pd : a.targetDate.localeCompare(b.targetDate)
  })
  for (const { hw, targetDate } of repeatEntries) {
    // mission 카테고리(구몬·등교전 루틴)는 평일에만 배치
    if (hw.subject === 'mission' && isWeekend(targetDate)) continue
    // Rule G: low priority → 바쁜 날은 건너뜀
    if (hw.priority === 'low') {
      if (totalRemainingMins(targetDate) < 60 || countHighMedOnDate(targetDate) >= 2) continue
    }
    scheduleOne(hw, targetDate)
  }

  // 3단계: 일반 high/medium (non-fixed_d1, Rule A·C·D·E)
  const highMedHws = homeworks.filter(hw => !hw.fixed_d1 && !hw.repeat && hw.priority !== 'low')
  highMedHws.sort((a, b) => {
    const pd = (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
    return pd !== 0 ? pd : (a.dueDate || '').localeCompare(b.dueDate || '')
  })
  for (const hw of highMedHws) scheduleOne(hw, null)

  // 4단계: low priority (Rule F: 여유 슬롯에만)
  const lowHws = homeworks.filter(hw => !hw.fixed_d1 && !hw.repeat && hw.priority === 'low')
  lowHws.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
  for (const hw of lowHws) {
    const candidates = getCandidateDates(hw, null)
    const hasFreeSlot = candidates.some(d => totalRemainingMins(d) >= hw.estimated_minutes)
    if (!hasFreeSlot) {
      unscheduled.push({
        homework_id:    hw.id,
        homework_title: hw.title,
        reason: '우선순위 낮음 — 여유 슬롯 없음 (Rule F)',
      })
      continue
    }
    scheduleOne(hw, null)
  }

  return { blocks, unscheduled }
}

// ── 메인 핸들러 ──────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'POST만 허용됩니다.' })

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

  try {
    const weekDates = getWeekDates(weekStart)
    const backlog   = homeworks.filter(hw => hw.status !== 'completed')

    console.log('[schedule-homework] 배분 대상 숙제 수:', backlog.length)

    if (backlog.length === 0) {
      return res.status(200).json({ blocks: [], unscheduled: [] })
    }

    const { blocks, unscheduled } = runScheduler(backlog, schedules, googleEvents || [], weekDates)

    console.log(`[schedule-homework] ✅ 배분 완료 — blocks: ${blocks.length}, unscheduled: ${unscheduled.length}`)

    return res.status(200).json({ blocks, unscheduled })
  } catch (err) {
    console.error('[schedule-homework] ❌ 오류:', err.message)
    return res.status(500).json({ error: `배분 실패: ${err.message}` })
  }
}
