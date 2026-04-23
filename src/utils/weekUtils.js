/**
 * Date 객체를 로컬 시간 기준 'YYYY-MM-DD' 문자열로 변환
 * (toISOString()은 UTC 기준이라 한국 시간대에서 하루 차이 발생)
 */
export function localDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 주어진 날짜가 속한 주의 월~일 7일 배열 반환
 */
export function getWeekDates(date) {
  const day = date.getDay() // 0=일, 1=월 ...
  const monday = new Date(date)
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

/**
 * 이전/다음 주 시작일 반환
 */
export function shiftWeek(weekDates, direction) {
  const monday = new Date(weekDates[0])
  monday.setDate(monday.getDate() + direction * 7)
  return getWeekDates(monday)
}

/**
 * 두 날짜가 같은 날인지
 */
export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * "M월 N주차" 레이블
 */
export function getWeekLabel(weekDates) {
  const monday = weekDates[0]
  const month = monday.getMonth() + 1
  const weekOfMonth = Math.ceil(monday.getDate() / 7)
  return `${monday.getFullYear()}년 ${month}월 ${weekOfMonth}주차`
}
