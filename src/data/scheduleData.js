/**
 * 일정 데이터 구조
 * - days: 반복 요일 (0=일, 1=월 ... 6=토)
 * - exceptions: 방학/공휴일 제외 날짜 (ISO 'YYYY-MM-DD')
 * - googleCalendarId: 추후 구글 캘린더 연동용
 */
// 색상 선택 프리셋 — 분류 추가/수정 시 사용
export const COLOR_PRESETS = [
  { key: 'blue',   label: '파랑',  color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500',   blockBg: '#dbeafe', blockBorder: '#3b82f6', blockText: '#1d4ed8' },
  { key: 'orange', label: '주황',  color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', blockBg: '#ffedd5', blockBorder: '#f97316', blockText: '#c2410c' },
  { key: 'green',  label: '초록',  color: 'bg-green-100 text-green-700',   dot: 'bg-green-500',  blockBg: '#dcfce7', blockBorder: '#22c55e', blockText: '#15803d' },
  { key: 'teal',   label: '청록',  color: 'bg-teal-100 text-teal-700',     dot: 'bg-teal-500',   blockBg: '#ccfbf1', blockBorder: '#14b8a6', blockText: '#0f766e' },
  { key: 'cyan',   label: '하늘',  color: 'bg-cyan-100 text-cyan-700',     dot: 'bg-cyan-500',   blockBg: '#cffafe', blockBorder: '#06b6d4', blockText: '#0e7490' },
  { key: 'indigo', label: '인디고', color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500', blockBg: '#e0e7ff', blockBorder: '#6366f1', blockText: '#4338ca' },
  { key: 'purple', label: '보라',  color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500', blockBg: '#f3e8ff', blockBorder: '#a855f7', blockText: '#7e22ce' },
  { key: 'pink',   label: '분홍',  color: 'bg-pink-100 text-pink-700',     dot: 'bg-pink-500',   blockBg: '#fce7f3', blockBorder: '#ec4899', blockText: '#be185d' },
  { key: 'red',    label: '빨강',  color: 'bg-red-100 text-red-700',       dot: 'bg-red-500',    blockBg: '#fee2e2', blockBorder: '#ef4444', blockText: '#b91c1c' },
  { key: 'yellow', label: '노랑',  color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400', blockBg: '#fef9c3', blockBorder: '#eab308', blockText: '#854d0e' },
  { key: 'lime',   label: '연두',  color: 'bg-lime-100 text-lime-700',     dot: 'bg-lime-500',   blockBg: '#ecfccb', blockBorder: '#84cc16', blockText: '#3f6212' },
  { key: 'slate',  label: '회색',  color: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400',  blockBg: '#f1f5f9', blockBorder: '#94a3b8', blockText: '#475569' },
]

// colorKey로 프리셋 조회
export function getColorPreset(key) {
  return COLOR_PRESETS.find(p => p.key === key) ?? COLOR_PRESETS[COLOR_PRESETS.length - 1]
}

// 기본 분류 정의 (Context 초기값으로 사용)
export const DEFAULT_CATEGORIES = {
  school:   { label: '학교',   colorKey: 'blue' },
  math:     { label: '수학',   colorKey: 'orange' },
  english:  { label: '영어',   colorKey: 'green' },
  science:  { label: '과학',   colorKey: 'teal' },
  arts:     { label: '예체능', colorKey: 'pink' },
  reading:  { label: '독서',   colorKey: 'purple' },
  mission:  { label: '미션',   colorKey: 'yellow' },
  personal: { label: '개인',   colorKey: 'slate' },
}

// 하위 호환용 — 기존 color/dot 형태로 변환
export function buildCategory(cat) {
  const preset = getColorPreset(cat.colorKey)
  return {
    ...preset,           // blockBg, blockBorder, blockText, color, dot 등
    label: cat.label,    // 카테고리 이름으로 덮어씌우기 (preset.label 무시)
  }
}

// 전체 분류를 color/dot 포함 형태로 반환
export function buildCategories(categoriesMap) {
  return Object.fromEntries(
    Object.entries(categoriesMap).map(([id, cat]) => [id, buildCategory(cat)])
  )
}

// 하위 호환 — 기존 import 경로 유지
export const CATEGORIES = buildCategories(DEFAULT_CATEGORIES)

export const SCHEDULES = [
  // ── 학교 ───────────────────────────────────────────────
  {
    id: 'school-mon-tue-wed-fri',
    title: '학교',
    startTime: '09:00',
    endTime: '13:40',
    days: [1, 2, 3, 5],   // 월, 화, 수, 금
    category: 'school',
    exceptions: [],
    googleCalendarId: null,
  },
  {
    id: 'school-thu',
    title: '학교',
    startTime: '09:00',
    endTime: '14:30',
    days: [4],             // 목
    category: 'school',
    exceptions: [],
    googleCalendarId: null,
  },
  // ── 월요일 ─────────────────────────────────────────────
  {
    id: 'piano-mon',
    title: '피아노',
    startTime: '14:00',
    endTime: '14:40',
    days: [1],
    category: 'arts',
    exceptions: [],
    googleCalendarId: null,
  },
  {
    id: 'hayoon-math-mon',
    title: '하윤네 수학',
    startTime: '14:40',
    endTime: '15:40',
    days: [1],
    category: 'math',
    exceptions: [],
    googleCalendarId: null,
  },
  {
    id: 'math-tutor-mon',
    title: '수학과외',
    startTime: '16:00',
    endTime: '17:30',
    days: [1],
    category: 'math',
    exceptions: [],
    googleCalendarId: null,
  },
  // ── 화요일 ─────────────────────────────────────────────
  {
    id: 'twinkle-nonfiction-tue',
    title: '트윈클 논픽션',
    startTime: '14:40',
    endTime: '17:40',
    days: [2],
    category: 'english',
    exceptions: [],
    googleCalendarId: null,
  },
  {
    id: 'wiseman-tue',
    title: '와이즈만',
    startTime: '19:00',
    endTime: '21:00',
    days: [2],
    category: 'science',
    exceptions: [],
    googleCalendarId: null,
  },
  // ── 수요일 ─────────────────────────────────────────────
  {
    id: 'cna-wed',
    title: 'CNA',
    startTime: '14:30',
    endTime: '16:30',
    days: [3],
    category: 'english',
    exceptions: [],
    googleCalendarId: null,
  },
  {
    id: 'hayoon-math-wed',
    title: '하윤네 수학',
    startTime: '16:30',
    endTime: '17:30',
    days: [3],
    category: 'math',
    exceptions: [],
    googleCalendarId: null,
  },
  // ── 목요일 ─────────────────────────────────────────────
  {
    id: 'twinkle-fiction-thu',
    title: '트윈클 픽션',
    startTime: '14:40',
    endTime: '17:40',
    days: [4],
    category: 'english',
    exceptions: [],
    googleCalendarId: null,
  },
  // ── 금요일 ─────────────────────────────────────────────
  {
    id: 'jumprope-fri',
    title: '줄넘기',
    startTime: '14:00',
    endTime: '15:00',
    days: [5],
    category: 'arts',
    exceptions: [],
    googleCalendarId: null,
  },
  {
    id: 'math-tutor-fri',
    title: '수학과외',
    startTime: '15:30',
    endTime: '17:00',
    days: [5],
    category: 'math',
    exceptions: [],
    googleCalendarId: null,
  },
  {
    id: 'hayoon-math-fri',
    title: '하윤네 수학',
    startTime: '17:00',
    endTime: '18:00',
    days: [5],
    category: 'math',
    exceptions: [],
    googleCalendarId: null,
  },
  // ── 등교 전 미션 (매일) ─────────────────────────────────
  {
    id: 'mission-gummon',
    title: '등교 전 구몬',
    startTime: '07:20',
    endTime: '07:50',
    days: [1, 2, 3, 4, 5],
    category: 'mission',
    exceptions: [],
    googleCalendarId: null,
  },
  {
    id: 'mission-nonfiction-voca',
    title: '논픽션 보카 암기',
    startTime: '07:50',
    endTime: '08:10',
    days: [1, 5],   // 월, 금
    category: 'mission',
    exceptions: [],
    googleCalendarId: null,
  },
  {
    id: 'mission-fiction-voca',
    title: '픽션 보카 암기',
    startTime: '07:50',
    endTime: '08:10',
    days: [3],      // 수
    category: 'mission',
    exceptions: [],
    googleCalendarId: null,
  },
  {
    id: 'mission-nonfiction-writing',
    title: '논픽션 라이팅',
    startTime: '07:50',
    endTime: '08:10',
    days: [5],      // 금
    category: 'mission',
    exceptions: [],
    googleCalendarId: null,
  },
  {
    id: 'mission-wiseman-science',
    title: '오투과학 & 과학일기',
    startTime: '07:50',
    endTime: '08:10',
    days: [4],      // 목
    category: 'mission',
    exceptions: [],
    googleCalendarId: null,
  },
]

/**
 * 특정 날짜에 해당하는 일정 목록을 시간순으로 반환
 * - effectiveFrom: 이 날짜부터 활성 (null = 제한 없음)
 * - effectiveTo:   이 날짜까지 활성 (null = 제한 없음)
 */
export function getSchedulesForDate(schedules, date) {
  const dayOfWeek = date.getDay()
  const isoDate = date.toISOString().slice(0, 10)

  return schedules
    .filter(s =>
      s.days.includes(dayOfWeek) &&
      !s.exceptions.includes(isoDate) &&
      (!s.effectiveFrom || isoDate >= s.effectiveFrom) &&
      (!s.effectiveTo   || isoDate <= s.effectiveTo)
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}
