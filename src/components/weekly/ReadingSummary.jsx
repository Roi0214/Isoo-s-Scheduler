import { BookOpen } from 'lucide-react'
import { getSchedulesForDate } from '../../data/scheduleData'
import { isSameDay } from '../../utils/weekUtils'

const WEEKDAY_SHORT = ['월', '화', '수', '목', '금', '토', '일']

export default function ReadingSummary({ weekDates, schedules, today }) {
  // 이번 주 독서 일정만 추출
  const readingDays = weekDates.map((date, idx) => {
    const daySchedules = getSchedulesForDate(schedules, date)
    const readings = daySchedules.filter(s => s.category === 'reading')
    return { date, idx, readings }
  }).filter(d => d.readings.length > 0)

  if (readingDays.length === 0) return null

  // 총 독서 시간 계산 (분)
  const totalMinutes = readingDays.reduce((acc, { readings }) => {
    return acc + readings.reduce((a, r) => {
      const [sh, sm] = r.startTime.split(':').map(Number)
      const [eh, em] = r.endTime.split(':').map(Number)
      return a + (eh * 60 + em) - (sh * 60 + sm)
    }, 0)
  }, 0)

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={16} className="text-purple-500" />
        <h3 className="text-sm font-bold text-purple-700">이번 주 독서 일정</h3>
        <span className="ml-auto text-xs text-purple-500 font-medium">총 {totalMinutes}분</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {readingDays.map(({ date, idx, readings }) => {
          const isToday = isSameDay(date, today)
          return (
            <div
              key={date.toISOString()}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl
                ${isToday ? 'bg-purple-200' : 'bg-white border border-purple-100'}`}
            >
              <span className={`text-xs font-bold ${isToday ? 'text-purple-800' : 'text-purple-500'}`}>
                {WEEKDAY_SHORT[idx]}
              </span>
              {readings.map(r => (
                <span key={r.id} className="text-[10px] text-purple-600 font-medium">
                  {r.startTime}~{r.endTime}
                </span>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
