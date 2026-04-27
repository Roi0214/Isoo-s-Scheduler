/**
 * AI 주간 배분 규칙 기본값
 * key: localStorage 식별자
 * label: UI 표시명
 * text: 프롬프트에 삽입되는 규칙 텍스트
 * locked: true이면 비활성화 불가 (구조적 필수 규칙)
 */
export const DEFAULT_AI_RULES = [
  {
    key: 'common',
    label: '공통 — 슬롯 준수',
    text: '모든 블록의 start_time~end_time은 반드시 해당 날짜의 \'가용슬롯\' 범위 안에만 배치. 고정일정·식사시간과 1분도 겹쳐선 안됨',
    locked: true,
  },
  {
    key: 'A',
    label: 'A — 학원 전날 완료',
    text: 'linked_event 있으면 학원 당일(D) 제외, D-1까지 완료',
    locked: false,
  },
  {
    key: 'B',
    label: 'B — 전날 고정 (D-1)',
    text: 'fixed_d1 플래그 숙제는 반드시 dueDate 당일 하루에만 배치(앞당기기·분할 절대 금지). 슬롯 부족해도 무조건 그 날에 배치',
    locked: false,
  },
  {
    key: 'C',
    label: 'C — 분할 배분',
    text: 'div 숙제는 한 슬롯에 전체를 넣을 수 있으면 통으로 배치. 슬롯이 부족할 때만 unit 단위로 분할. units_today에 해당 세션 분량 기재',
    locked: false,
  },
  {
    key: 'D',
    label: 'D — 난이도별 시간대',
    text: '난이도상 → 평일 19-21시 / 주말 09-14시 우선 배치. 중·하는 남은 슬롯 자유 배치',
    locked: false,
  },
  {
    key: 'E',
    label: 'E — 취침 시간 보호',
    text: '소프트 22:00 전, 하드 22:30 후 절대 금지. 초과분은 다음날·주말로 이월 → unscheduled',
    locked: true,
  },
  {
    key: 'F',
    label: 'F — 낮은 우선순위 처리',
    text: 'priority=low 비반복 숙제는 high·medium 완료 후 여유슬롯에만 배치. 슬롯 부족 시 unscheduled 처리 가능',
    locked: false,
  },
  {
    key: 'G',
    label: 'G — 매일 반복 숙제',
    text: 'repeat=daily 숙제(연산·구몬 등)는 due=null이면 이번 주 전체(일요일 포함), due=날짜이면 그 날까지 매일 1회 estimated_minutes분 블록 생성. priority=low이면 해당 날의 가용슬롯 합계가 60분 미만이거나 high/medium 숙제가 2개 이상 배치된 날은 생략 가능. units_today=null',
    locked: false,
  },
]

const STORAGE_KEY = 'kid-scheduler:aiRules'

export function loadRules() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return DEFAULT_AI_RULES.map(r => ({ ...r, enabled: true }))
    const parsed = JSON.parse(saved)
    // 새로 추가된 기본 규칙은 자동 병합
    const merged = DEFAULT_AI_RULES.map(def => {
      const found = parsed.find(p => p.key === def.key)
      return found ? { ...def, text: found.text, enabled: found.enabled ?? true } : { ...def, enabled: true }
    })
    return merged
  } catch {
    return DEFAULT_AI_RULES.map(r => ({ ...r, enabled: true }))
  }
}

export function saveRules(rules) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(
    rules.map(r => ({ key: r.key, text: r.text, enabled: r.enabled }))
  ))
}

/** rules 배열 → 프롬프트 삽입용 문자열 */
export function buildRulesText(rules) {
  return rules
    .filter(r => r.enabled !== false)
    .map(r => r.key === 'common' ? `공통: ${r.text}` : `${r.key}: ${r.text}`)
    .join('\n')
}
