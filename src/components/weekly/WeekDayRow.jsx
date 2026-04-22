import { isSameDay } from '../../utils/weekUtils'
import { CATEGORIES } from '../../data/scheduleData'

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

export default function WeekDayRow({ date, dayIndex, schedules, homeworks, today }) {
  const isToday = isSameDay(date, today)
  const isWeekend = dayIndex >= 5 // 토(5), 일(6)
  const dateStr = date.toISOString().slice(0, 10)

  // 오늘 기준 숙제 마감 건수
  const dueHomeworks = homeworks.filter(hw => hw.dueDate === dateStr)

  return (
    <div className={`flex gap-3 rounded-2xl px-3 py-2.5 transition-all
      ${isToday
        ? 'bg-indigo-600 shadow-md shadow-indigo-200'
        : isWeekend
          ? 'bg-white border border-slate-100'
          : 'bg-white border border-slate-100'
      }`}>

      {/* 요일 + 날짜 */}
      <div className={`flex flex-col items-center justify-center w-10 flex-shrink-0`}>
        <span className={`text-xs font-bold
          ${isToday ? 'text-indigo-200'
            : isWeekend ? 'text-red-400'
            : 'text-slate-400'}`}>
          {WEEKDAY_LABELS[dayIndex]}
        </span>
        <span className={`text-lg font-extrabold leading-none
          ${isToday ? 'text-white' : 'text-slate-700'}`}>
          {date.getDate()}
        </span>
        {/* 숙제 마감 뱃지 */}
        {dueHomeworks.length > 0 && (
          <span className={`mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full
            ${isToday ? 'bg-white/20 text-white' : 'bg-red-100 text-red-500'}`}>
            숙제 {dueHomeworks.length}
          </span>
        )}
      </div>

      {/* 일정 pill 목록 */}
      <div className="flex-1 flex flex-wrap gap-1.5 items-center min-w-0">
        {schedules.length === 0 ? (
          <span className={`text-xs ${isToday ? 'text-indigo-300' : 'text-slate-300'}`}>
            일정 없음
          </span>
        ) : (
          schedules.map(s => {
            const cat = CATEGORIES[s.category] ?? CATEGORIES.personal
            const isReading = s.category === 'reading'
            return (
              <span
                key={s.id}
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full
                  ${isToday
                    ? 'bg-white/20 text-white'
                    : isReading
                      ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
                      : cat.color
                  }`}
              >
                {isReading && <span>📖</span>}
                {s.title}
              </span>
            )
          })
        )}
      </div>
    </div>
  )
}
