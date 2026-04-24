export const HW_SUBJECTS = {
  math:    { label: '수학',   color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  english: { label: '영어',   color: 'bg-green-100 text-green-700',   dot: 'bg-green-400' },
  science: { label: '과학',   color: 'bg-teal-100 text-teal-700',     dot: 'bg-teal-400' },
  korean:  { label: '국어',   color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400' },
  mission: { label: '미션',   color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  reading: { label: '독서',   color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400' },
  etc:     { label: '기타',   color: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400' },
}

export const PRIORITY = {
  high:   { label: '중요', color: 'text-red-500',    bg: 'bg-red-50' },
  medium: { label: '보통', color: 'text-yellow-500', bg: 'bg-yellow-50' },
  low:    { label: '여유', color: 'text-slate-400',  bg: 'bg-slate-50' },
}

export const DIFFICULTY = {
  '상': { label: '상', color: 'bg-red-100 text-red-700' },
  '중': { label: '중', color: 'bg-yellow-100 text-yellow-700' },
  '하': { label: '하', color: 'bg-green-100 text-green-700' },
}

// 이번 주 특정 요일 날짜 반환 (0=일 ~ 6=토)
function thisWeekDay(dayOfWeek) {
  const today = new Date()
  const currentDay = today.getDay()
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const d = new Date(monday)
  d.setDate(monday.getDate() + offset)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function relativeDate(offset) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const HOMEWORKS = [
  // ── 월요일 수업 숙제 ──────────────────────────────────────
  {
    id: 'hw-hayoon-math-mon-1',
    subject: 'math',
    title: '단원평가 1장 (하윤네 수학)',
    dueDate: thisWeekDay(2),
    priority: 'high',
    memo: '월요일 하윤네 수학 숙제',
    repeat: false,
    linkedScheduleTitle: '하윤네 수학 (월) 숙제',
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '중',
    estimated_minutes: 30,
    is_divisible: false,
    unit: null,
    total_units: null,
    linked_event: '하윤네 수학',
  },
  {
    id: 'hw-hayoon-math-mon-2',
    subject: 'math',
    title: '연산 1장 (하윤네 수학)',
    dueDate: thisWeekDay(2),
    priority: 'medium',
    memo: '월요일 하윤네 수학 숙제',
    repeat: false,
    linkedScheduleTitle: '하윤네 수학 (월) 숙제',
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '하',
    estimated_minutes: 20,
    is_divisible: false,
    unit: null,
    total_units: null,
    linked_event: '하윤네 수학',
  },
  {
    id: 'hw-math-tutor-mon',
    subject: 'math',
    title: '수학과외 숙제 Part 1',
    dueDate: thisWeekDay(3),
    priority: 'high',
    memo: '월요일 수학과외 당일 수업 숙제',
    repeat: false,
    linkedScheduleTitle: '수학과외 (월) 숙제',
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '상',
    estimated_minutes: 40,
    is_divisible: false,
    unit: null,
    total_units: null,
    linked_event: '수학과외',
  },
  // ── 수요일 수업 숙제 ──────────────────────────────────────
  {
    id: 'hw-hayoon-math-wed-1',
    subject: 'math',
    title: '단원평가 1장 (하윤네 수학)',
    dueDate: thisWeekDay(4),
    priority: 'high',
    memo: '수요일 하윤네 수학 숙제',
    repeat: false,
    linkedScheduleTitle: '하윤네 수학 (수) 숙제',
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '중',
    estimated_minutes: 30,
    is_divisible: false,
    unit: null,
    total_units: null,
    linked_event: '하윤네 수학',
  },
  {
    id: 'hw-hayoon-math-wed-2',
    subject: 'math',
    title: '연산 1장 (하윤네 수학)',
    dueDate: thisWeekDay(4),
    priority: 'medium',
    memo: '수요일 하윤네 수학 숙제',
    repeat: false,
    linkedScheduleTitle: '하윤네 수학 (수) 숙제',
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '하',
    estimated_minutes: 20,
    is_divisible: false,
    unit: null,
    total_units: null,
    linked_event: '하윤네 수학',
  },
  // ── 목요일 수업 숙제 ──────────────────────────────────────
  {
    id: 'hw-twinkle-fiction-thu',
    subject: 'english',
    title: '트윈클 픽션 리딩 지문 읽기',
    dueDate: thisWeekDay(5),
    priority: 'high',
    memo: '목요일 트윈클 픽션 수업 숙제',
    repeat: false,
    linkedScheduleTitle: '트윈클 픽션 (목) 숙제',
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '중',
    estimated_minutes: 25,
    is_divisible: false,
    unit: null,
    total_units: null,
    linked_event: '트윈클 픽션',
  },
  // ── 금요일 수업 숙제 ──────────────────────────────────────
  {
    id: 'hw-math-tutor-fri',
    subject: 'math',
    title: '수학과외 숙제 Part 1',
    dueDate: thisWeekDay(0),
    priority: 'high',
    memo: '금요일 수학과외 당일 수업 숙제',
    repeat: false,
    linkedScheduleTitle: '수학과외 (금) 숙제',
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '상',
    estimated_minutes: 40,
    is_divisible: false,
    unit: null,
    total_units: null,
    linked_event: '수학과외',
  },
  {
    id: 'hw-hayoon-math-fri-1',
    subject: 'math',
    title: '단원평가 1장 (하윤네 수학)',
    dueDate: thisWeekDay(0),
    priority: 'high',
    memo: '금요일 하윤네 수학 숙제',
    repeat: false,
    linkedScheduleTitle: '하윤네 수학 (금) 숙제',
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '중',
    estimated_minutes: 30,
    is_divisible: false,
    unit: null,
    total_units: null,
    linked_event: '하윤네 수학',
  },
  {
    id: 'hw-hayoon-math-fri-2',
    subject: 'math',
    title: '연산 1장 (하윤네 수학)',
    dueDate: thisWeekDay(0),
    priority: 'medium',
    memo: '금요일 하윤네 수학 숙제',
    repeat: false,
    linkedScheduleTitle: '하윤네 수학 (금) 숙제',
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '하',
    estimated_minutes: 20,
    is_divisible: false,
    unit: null,
    total_units: null,
    linked_event: '하윤네 수학',
  },
  // ── 등교 전 미션 (매일) ───────────────────────────────────
  {
    id: 'hw-gummon-daily',
    subject: 'mission',
    title: '등교 전 구몬',
    dueDate: relativeDate(0),
    priority: 'high',
    memo: '매일 등교 전 완료',
    repeat: true,
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '하',
    estimated_minutes: 15,
    is_divisible: false,
    unit: null,
    total_units: null,
    linked_event: null,
  },
  // ── 주말 집중 미션 ─────────────────────────────────────────
  {
    id: 'hw-weekend-twinkle',
    subject: 'english',
    title: '트윈클 픽션/논픽션 보카 1회전 & 픽션 라이팅',
    dueDate: thisWeekDay(0),
    priority: 'high',
    memo: '주말 집중 미션 — 트윈클',
    repeat: false,
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '상',
    estimated_minutes: 60,
    is_divisible: true,
    unit: 20,
    total_units: 60,
    linked_event: '트윈클 픽션',
  },
  {
    id: 'hw-weekend-cna',
    subject: 'english',
    title: 'CNA 주간 전체 과제',
    dueDate: thisWeekDay(0),
    priority: 'high',
    memo: '주말 집중 미션 — CNA',
    repeat: false,
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '상',
    estimated_minutes: 45,
    is_divisible: false,
    unit: null,
    total_units: null,
    linked_event: null,
  },
  {
    id: 'hw-weekend-science',
    subject: 'science',
    title: '와이즈만 오투과학 & 과학일기 작성',
    dueDate: thisWeekDay(4),
    priority: 'high',
    memo: '목요일 미션 — 와이즈만 준비',
    repeat: false,
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '중',
    estimated_minutes: 35,
    is_divisible: false,
    unit: null,
    total_units: null,
    linked_event: '와이즈만',
  },
]

/**
 * linkedScheduleTitle에서 학원명만 추출
 * "하윤네 수학 (월) 숙제" → "하윤네 수학"
 * "트윈클 픽션 (목) 숙제" → "트윈클 픽션"
 * null/undefined → null
 */
function extractAcademyName(title) {
  if (!title) return null
  // " (월) 숙제", " (화) 숙제" 등 요일 + 숙제 접미사 제거
  return title.replace(/\s*\([월화수목금토일]\)\s*숙제?$/, '').trim() || null
}

/**
 * localStorage 기존 데이터에 신규 필드 보완 + linked_event 정규화
 * - 이미 잘못 저장된 "하윤네 수학 (월) 숙제" 형태도 "하윤네 수학"으로 교정
 */
export function migrateHomework(hw) {
  // linkedScheduleTitle 기반으로 학원명 추출 (항상 재계산해서 교정)
  const extractedAcademy = extractAcademyName(hw.linkedScheduleTitle)

  return {
    status: 'backlog',
    difficulty: '중',
    estimated_minutes: 30,
    is_divisible: false,
    unit: null,
    total_units: null,
    ...hw,
    // linked_event: 이미 올바른 값이 있으면 유지, 없거나 요일 포함된 잘못된 값이면 교정
    linked_event: extractedAcademy ?? hw.linked_event ?? null,
  }
}

const WEEKDAY_SHORT = ['일', '월', '화', '수', '목', '금', '토']

function isWeekend(dueDate) {
  const [y, mo, d] = dueDate.split('-').map(Number)
  const day = new Date(y, mo - 1, d).getDay()
  return day === 0 || day === 6
}

function getSaturdayKey(dueDate) {
  const [y, mo, d] = dueDate.split('-').map(Number)
  const dateObj = new Date(y, mo - 1, d)
  const day = dateObj.getDay()
  const diff = day === 6 ? 0 : -1
  const sat = new Date(dateObj)
  sat.setDate(dateObj.getDate() + diff)
  const sy = sat.getFullYear()
  const sm = String(sat.getMonth() + 1).padStart(2, '0')
  const sd = String(sat.getDate()).padStart(2, '0')
  return `weekend:${sy}-${sm}-${sd}`
}

function weekendLabel(key) {
  const satStr = key.replace('weekend:', '')
  const sat = new Date(satStr + 'T00:00:00')
  const sun = new Date(sat)
  sun.setDate(sat.getDate() + 1)
  const satMD = `${sat.getMonth() + 1}/${sat.getDate()}`
  const sunMD = `${sun.getMonth() + 1}/${sun.getDate()}`
  return `주말 숙제 · ${satMD}(토)~${sunMD}(일)까지`
}

export function getDueDateLabel(dueDate) {
  if (dueDate.startsWith('weekend:')) return weekendLabel(dueDate)

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const tmrDate = new Date(now)
  tmrDate.setDate(now.getDate() + 1)
  const tomorrow = `${tmrDate.getFullYear()}-${String(tmrDate.getMonth()+1).padStart(2,'0')}-${String(tmrDate.getDate()).padStart(2,'0')}`

  const [y, mo, d] = dueDate.split('-').map(Number)
  const dateObj = new Date(y, mo - 1, d)
  const wd = WEEKDAY_SHORT[dateObj.getDay()]

  if (dueDate === today)    return `오늘까지 · ${mo}/${d}(${wd})`
  if (dueDate === tomorrow) return `내일까지 · ${mo}/${d}(${wd})`
  return `${mo}월 ${d}일(${wd})까지`
}

export function groupHomeworksByDueDate(homeworks) {
  const mapped = homeworks.map(hw => ({
    ...hw,
    _groupKey: isWeekend(hw.dueDate) ? getSaturdayKey(hw.dueDate) : hw.dueDate,
  }))

  const sorted = [...mapped].sort((a, b) => {
    const ka = a._groupKey.replace('weekend:', '')
    const kb = b._groupKey.replace('weekend:', '')
    return ka.localeCompare(kb)
  })

  const groups = {}
  for (const hw of sorted) {
    const key = hw._groupKey
    if (!groups[key]) groups[key] = []
    groups[key].push(hw)
  }
  return groups
}
