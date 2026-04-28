/**
 * 학원 일정 관련 유틸
 */

/** dateStr의 하루 전 날짜 반환 */
export function prevDayStr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 학원 이름(eventTitle)에 해당하는 다음 수업일 반환 (최대 14일 탐색)
 * - 공백 기준 토큰 전부가 일정 제목 토큰과 정확히 일치해야 매칭
 *   예) "트윈클" → "트윈클 픽션" ✓, "트윈클 논픽션" ✓
 *   예) "픽션"   → "트윈클 픽션" ✓, "트윈클 논픽션" ✗ ("논픽션" ≠ "픽션")
 */
export function findNextClassDate(eventTitle, schedules, fromDateStr = null) {
  if (!eventTitle?.trim()) return null
  const kwTokens = eventTitle.trim().toLowerCase().split(/\s+/)
  const startDate = fromDateStr
    ? new Date(fromDateStr + 'T00:00:00')
    : new Date()

  for (let i = 0; i < 14; i++) {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    const dow = d.getDay()
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    for (const s of schedules) {
      if (s.category === 'mission') continue
      const titleTokens = s.title.toLowerCase().split(/\s+/)
      if (!kwTokens.every(kw => titleTokens.some(t => t === kw))) continue
      if (!s.days.includes(dow)) continue
      if (s.exceptions?.includes(dateStr)) continue
      if (s.effectiveFrom && dateStr < s.effectiveFrom) continue
      if (s.effectiveTo   && dateStr > s.effectiveTo)   continue
      return dateStr
    }
  }
  return null
}
