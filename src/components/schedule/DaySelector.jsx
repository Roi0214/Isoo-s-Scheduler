import { useRef, useEffect } from 'react'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const RANGE = 60 // 오늘 기준 앞뒤 60일

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function buildDays(today) {
  return Array.from({ length: RANGE * 2 + 1 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - RANGE + i)
    return d
  })
}

export default function DaySelector({ today, selectedDate, onSelect }) {
  const days = buildDays(today)
  const selectedRef = useRef(null)

  // 선택된 날짜가 바뀌면 해당 버튼이 가운데 오도록 스크롤
  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [selectedDate])

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-4 pb-0.5">
      {days.map((d) => {
        const isToday    = isSameDay(d, today)
        const isSelected = isSameDay(d, selectedDate)
        const isWeekend  = d.getDay() === 0 || d.getDay() === 6
        const isFirst    = d.getDate() === 1

        return (
          <button
            key={d.toISOString()}
            ref={isSelected ? selectedRef : null}
            onClick={() => onSelect(d)}
            className={`flex-none flex flex-col items-center pt-2 pb-2 w-10 rounded-xl transition-all
              ${isSelected
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : isToday
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'bg-white text-slate-600'
              }`}
          >
            <span className={`text-[10px] font-medium mb-1
              ${isSelected ? 'text-indigo-200' : isWeekend ? 'text-red-400' : 'text-slate-400'}`}>
              {WEEKDAYS[d.getDay()]}
            </span>
            <span className="text-sm font-bold leading-none">
              {d.getDate()}
            </span>
            {/* 오늘 표시 점 */}
            {isToday && !isSelected && (
              <span className="mt-1 w-1 h-1 rounded-full bg-indigo-500" />
            )}
            {/* 매월 1일에 월 표시 */}
            {isFirst && (
              <span className={`text-[8px] mt-0.5 font-semibold
                ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                {d.getMonth() + 1}월
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
