import { getSchedulesForDate } from '../../data/scheduleData'
import { isSameDay } from '../../utils/weekUtils'
import { useCurrentTime } from '../../hooks/useCurrentTime'
import { useSchedule } from '../../context/ScheduleContext'
import { useGCal } from '../../context/GoogleCalendarContext'

const HOUR_HEIGHT  = 64
const START_HOUR   = 9
const END_HOUR     = 22
const TIME_WIDTH   = 34

const TOTAL_HOURS  = END_HOUR - START_HOUR
const TOTAL_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금']

const FALLBACK_COLOR = { blockBg: '#f1f5f9', blockBorder: '#94a3b8', blockText: '#475569' }

function timeToTop(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return ((h - START_HOUR) + m / 60) * HOUR_HEIGHT
}

function timeToHeight(start, end) {
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  return Math.max(((toMin(end) - toMin(start)) / 60) * HOUR_HEIGHT, 24)
}

function hourLabel(h) {
  if (h <= 12) return String(h)
  return String(h - 12)
}

function fmt12(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}`
}

export default function WeeklyTimetable({ weekDates, schedules, today, onBlockClick }) {
  const now = useCurrentTime()
  const { categories } = useSchedule()
  const { getAllDayForDate } = useGCal()

  const weekdays = weekDates.slice(0, 5)

  const isCurrentWeek = weekdays.some(d => isSameDay(d, today))
  const nowTop = ((now.getHours() - START_HOUR) + now.getMinutes() / 60) * HOUR_HEIGHT
  const showNowLine = isCurrentWeek && nowTop >= 0 && nowTop <= TOTAL_HEIGHT

  return (
    <div className="w-full">

      {/* ── 요일 헤더 ─────────────────── */}
      <div className="flex bg-slate-50 pb-2">
        <div style={{ width: TIME_WIDTH }} className="flex-shrink-0" />
        {weekdays.map((date, idx) => {
          const isToday   = isSameDay(date, today)
          const isHoliday = getAllDayForDate(date).length > 0
          const holidayName = isHoliday ? getAllDayForDate(date)[0].title : null

          return (
            <div
              key={idx}
              className={`flex-1 flex flex-col items-center py-1.5 rounded-xl mx-0.5
                ${isToday   ? 'bg-indigo-600' :
                  isHoliday ? 'bg-red-100'    : ''}`}
            >
              <span className={`text-xs font-bold
                ${isToday   ? 'text-indigo-200' :
                  isHoliday ? 'text-red-500'    : 'text-slate-400'}`}>
                {WEEKDAY_LABELS[idx]}
              </span>
              <span className={`text-sm font-extrabold leading-none
                ${isToday   ? 'text-white'    :
                  isHoliday ? 'text-red-600'  : 'text-slate-700'}`}>
                {date.getDate()}
              </span>
              {isHoliday && !isToday && (
                <span className="text-[8px] text-red-400 font-medium leading-tight mt-0.5 text-center px-0.5 truncate w-full text-center">
                  {holidayName}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* ── 그리드 본체 ───────────────── */}
      <div className="flex relative">

        {/* 시간 레이블 */}
        <div
          className="flex-shrink-0 bg-slate-50 relative"
          style={{ width: TIME_WIDTH, height: TOTAL_HEIGHT }}
        >
          {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute w-full flex justify-end pr-1"
              style={{ top: i * HOUR_HEIGHT - 7 }}
            >
              <span className="text-[10px] text-slate-400 font-medium leading-none">
                {hourLabel(START_HOUR + i)}
              </span>
            </div>
          ))}
        </div>

        {/* 요일 열 */}
        {weekdays.map((date, dayIdx) => {
          const isToday      = isSameDay(date, today)
          const isHoliday    = getAllDayForDate(date).length > 0
          const daySchedules = getSchedulesForDate(schedules, date)
            .filter(s => s.category !== 'mission')

          return (
            <div
              key={dayIdx}
              className="flex-1 relative border-l border-slate-100 mx-0.5"
              style={{ height: TOTAL_HEIGHT }}
            >
              {/* 시간 구분선 */}
              {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-full"
                  style={{
                    top: i * HOUR_HEIGHT,
                    borderTop: i === 0 ? '1px solid #e2e8f0' : '1px solid #f1f5f9',
                  }}
                />
              ))}

              {/* 공휴일 배경 (연한 빨강) */}
              {isHoliday && !isToday && (
                <div className="absolute inset-0 bg-red-50/60 pointer-events-none" />
              )}

              {/* 오늘 배경 */}
              {isToday && <div className="absolute inset-0 bg-indigo-50/50 pointer-events-none" />}

              {/* 현재 시간 선 */}
              {isToday && showNowLine && (
                <div
                  className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                  style={{ top: nowTop }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" style={{ marginLeft: -5 }} />
                  <div className="flex-1 border-t-2 border-red-400" />
                </div>
              )}

              {/* 일정 블록 */}
              {daySchedules.map(s => {
                const top    = timeToTop(s.startTime)
                const height = timeToHeight(s.startTime, s.endTime)
                if (top > TOTAL_HEIGHT || top + height < 0) return null

                const cat    = categories[s.category]
                const colors = cat
                  ? { bg: cat.blockBg, border: cat.blockBorder, text: cat.blockText }
                  : FALLBACK_COLOR
                const showTime = height >= 48

                return (
                  <button
                    key={s.id}
                    onClick={() => onBlockClick(s, date)}
                    className="absolute rounded-lg overflow-hidden flex flex-col items-center justify-center text-center px-0.5 active:opacity-70 transition-opacity"
                    style={{
                      top: top + 1,
                      height: height - 2,
                      left: 2,
                      right: 2,
                      width: 'calc(100% - 4px)',
                      backgroundColor: colors.bg,
                      borderLeft: `3px solid ${colors.border}`,
                    }}
                  >
                    <p
                      className="font-bold leading-tight w-full text-center"
                      style={{
                        color: colors.text,
                        fontSize: height >= 50 ? '11px' : '10px',
                        whiteSpace: height >= 60 ? 'normal' : 'nowrap',
                        overflow: 'hidden',
                        textOverflow: height >= 60 ? 'clip' : 'ellipsis',
                      }}
                    >
                      {s.title}
                    </p>
                    {showTime && (
                      <p
                        className="mt-0.5 leading-none text-center w-full"
                        style={{ color: colors.border, fontSize: '9px' }}
                      >
                        {fmt12(s.startTime)}~{fmt12(s.endTime)}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
