const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/**
 * 오늘 기준 ±3일 범위의 날짜 7개를 반환
 */
function buildDays(today) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - 3 + i)
    return d
  })
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export default function DaySelector({ today, selectedDate, onSelect }) {
  const days = buildDays(today)

  return (
    <div className="flex gap-1 justify-between mb-4">
      {days.map((d) => {
        const isToday = isSameDay(d, today)
        const isSelected = isSameDay(d, selectedDate)
        const isWeekend = d.getDay() === 0 || d.getDay() === 6

        return (
          <button
            key={d.toISOString()}
            onClick={() => onSelect(d)}
            className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all
              ${isSelected
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : isToday
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
          >
            <span className={`text-xs font-medium mb-1
              ${isSelected ? 'text-indigo-200' : isWeekend ? 'text-red-400' : 'text-slate-400'}`}>
              {WEEKDAYS[d.getDay()]}
            </span>
            <span className={`text-sm font-bold leading-none`}>
              {d.getDate()}
            </span>
            {/* 오늘 표시 점 */}
            {isToday && !isSelected && (
              <span className="mt-1 w-1 h-1 rounded-full bg-indigo-500" />
            )}
          </button>
        )
      })}
    </div>
  )
}
