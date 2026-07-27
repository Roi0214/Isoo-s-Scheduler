export const HW_SUBJECTS = {
  math:    { label: '수학',   color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  english: { label: '영어',   color: 'bg-green-100 text-green-700',   dot: 'bg-green-400' },
  science: { label: '과학',   color: 'bg-teal-100 text-teal-700',     dot: 'bg-teal-400' },
  korean:  { label: '국어',   color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400' },
  mission: { label: '미션',   color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  reading: { label: '독서',   color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400' },
  etc:     { label: '기타',   color: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400' },
}

// 일정 분류(schedule category) → 숙제 과목 매핑 (연결 학원으로부터 과목 자동 유추용)
export const CATEGORY_TO_SUBJECT = {
  school:   'korean',
  math:     'math',
  english:  'english',
  science:  'science',
  arts:     'etc',
  reading:  'reading',
  mission:  'mission',
  personal: 'etc',
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

export const HOMEWORKS = [
  // ── 트윈클 논픽션 ────────────────────────────────────────
  {
    id: 'hw-twinkle-voca-1st',
    subject: 'english',
    title: '트윈클 논픽션 보카',
    dueDate: '2026-05-11',
    priority: 'high',
    memo: '단어 2개당 20분, 총 20개(픽션10+논픽션10)=200분. 40분씩 5회 분산.',
    repeat: false,
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '상',
    estimated_minutes: 200,
    is_divisible: true,
    unit: 40,
    total_units: 200,
    linked_event: '트윈클 논픽션',
    fixed_d1: false,
    linkedScheduleTitle: null,
  },
  {
    id: 'hw-twinkle-voca-2nd',
    subject: 'english',
    title: '트윈클 논픽션 보카복습',
    dueDate: '2026-05-11',
    priority: 'high',
    memo: '반드시 수업 전날(D-1)에만 배치. 60분. 앞당기기 금지.',
    repeat: false,
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '상',
    estimated_minutes: 60,
    is_divisible: false,
    unit: null,
    total_units: null,
    linked_event: '트윈클 논픽션',
    fixed_d1: true,
    linkedScheduleTitle: null,
  },
  {
    id: 'hw-twinkle-writing-fiction',
    subject: 'english',
    title: '트윈클 픽션 라이팅',
    dueDate: '2026-05-06',
    priority: 'high',
    memo: '60분, 분할 불가',
    repeat: false,
    googleCalendarId: null,
    status: 'completed',
    difficulty: '중',
    estimated_minutes: 60,
    is_divisible: false,
    unit: null,
    total_units: null,
    linked_event: '트윈클 픽션',
    fixed_d1: false,
    linkedScheduleTitle: null,
  },
  {
    id: 'hw-twinkle-writing-nonfiction',
    subject: 'english',
    title: '트윈클 논픽션 라이팅',
    dueDate: '2026-05-11',
    priority: 'high',
    memo: '60분, 분할 불가',
    repeat: false,
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '중',
    estimated_minutes: 60,
    is_divisible: false,
    unit: null,
    total_units: null,
    linked_event: '트윈클 논픽션',
    fixed_d1: false,
    linkedScheduleTitle: null,
  },
  // ── 트윈클 픽션 ──────────────────────────────────────────
  {
    id: 'hw-1778138732210',
    subject: 'english',
    title: '픽션 보카',
    dueDate: '2026-05-06',
    priority: 'high',
    memo: null,
    repeat: false,
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '중',
    estimated_minutes: 200,
    is_divisible: true,
    unit: 40,
    total_units: 200,
    linked_event: '트윈클 픽션',
    fixed_d1: false,
    linkedScheduleTitle: null,
  },
  {
    id: 'hw-1778138774322',
    subject: 'english',
    title: '트윈클 픽션 보카복습',
    dueDate: '2026-05-06',
    priority: 'high',
    memo: null,
    repeat: false,
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '중',
    estimated_minutes: 30,
    is_divisible: false,
    unit: null,
    total_units: null,
    linked_event: '트윈클 픽션',
    fixed_d1: true,
    linkedScheduleTitle: null,
  },
  // ── 수학과외 복습 ────────────────────────────────────────
  {
    id: 'hw-math-tutor-review',
    subject: 'math',
    title: '수학과외 복습',
    dueDate: '2026-05-08',
    priority: 'high',
    memo: '총 2시간. 1시간씩 2회 분할 가능.',
    repeat: false,
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '중',
    estimated_minutes: 120,
    is_divisible: true,
    unit: 60,
    total_units: 120,
    linked_event: '수학과외',
  },
  // ── 영어 리딩 ────────────────────────────────────────────
  {
    id: 'hw-english-reading-fiction',
    subject: 'english',
    title: '영어리딩 픽션리딩',
    dueDate: '2026-05-06',
    priority: 'medium',
    memo: '총 2시간(3~5챕터 유동). 챕터 단위 분할 가능. 40분씩 3회 권장.',
    repeat: false,
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '하',
    estimated_minutes: 120,
    is_divisible: true,
    unit: 40,
    total_units: 120,
    linked_event: '트윈클 픽션',
    fixed_d1: false,
    linkedScheduleTitle: null,
  },
  // ── 루틴 (매일/반복) ─────────────────────────────────────
  {
    id: 'hw-calc-fri',
    subject: 'math',
    title: '연산 1장',
    dueDate: null,
    priority: 'low',
    memo: '주4~5회 목표. 시간 부족 시 스킵 가능. 10~20분.',
    repeat: true,
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '하',
    estimated_minutes: 15,
    is_divisible: false,
    unit: null,
    total_units: null,
    linked_event: '하윤네 수학',
    fixed_d1: false,
    linkedScheduleTitle: null,
  },
  {
    id: 'hw-chapter-fri',
    subject: 'math',
    title: '단원평가 1챕터',
    dueDate: null,
    priority: 'low',
    memo: '주4~5회 목표. 시간 부족 시 스킵 가능. 10~20분.',
    repeat: true,
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '하',
    estimated_minutes: 15,
    is_divisible: false,
    unit: null,
    total_units: null,
    linked_event: '하윤네 수학',
    fixed_d1: false,
    linkedScheduleTitle: null,
  },
  {
    id: 'hw-gummon-daily',
    subject: 'mission',
    title: '구몬 (등교 전)',
    dueDate: null,
    priority: 'high',
    memo: '매일 등교 전 10~15분. 반드시 완료.',
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
  // ── 비문학 책읽기 ────────────────────────────────────────
  {
    id: 'hw-nonfiction-reading',
    subject: 'reading',
    title: '비문학 책읽기',
    dueDate: '2026-05-10',
    priority: 'low',
    memo: '최소 주1회. 2시간. 시간 부족 시 횟수 줄여도 됨.',
    repeat: false,
    googleCalendarId: null,
    status: 'backlog',
    difficulty: '하',
    estimated_minutes: 120,
    is_divisible: false,
    unit: null,
    total_units: null,
    linked_event: null,
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
