import { useState, useMemo } from 'react'
import { Plus, CalendarClock } from 'lucide-react'
import WeekNavigator from '../components/weekly/WeekNavigator'
import WeeklyTimetable from '../components/weekly/WeeklyTimetable'
import ScheduleFormModal from '../components/schedule/ScheduleFormModal'
import NextTermSetup from '../components/schedule/NextTermSetup'
import { getWeekDates, shiftWeek, isSameDay } from '../utils/weekUtils'
import { getSchedulesForDate, buildTitleColorMap } from '../data/scheduleData'
import { useSchedule } from '../context/ScheduleContext'
import { useHomework } from '../context/HomeworkContext'

export default function WeeklyPage() {
  const today = new Date()
  const [weekDates, setWeekDates] = useState(() => getWeekDates(today))
  const { schedules } = useSchedule()
  const { homeworks } = useHomework()

  const [editState, setEditState] = useState(null)  // { item, date }
  const editItem = editState?.item ?? null
  const editApplyDate = editState?.date ?? null

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [nextTermOpen, setNextTermOpen] = useState(false)

  const isCurrentWeek = weekDates.some(d => isSameDay(d, today))

  const handlePrev = () => setWeekDates(prev => shiftWeek(prev, -1))
  const handleNext = () => setWeekDates(prev => shiftWeek(prev, +1))

  // 월~금만 사용
  const weekdays = weekDates.slice(0, 5)

  // 이번 주 총 일정 수 (월~금, 미션 제외)
  const totalScheduleCount = weekdays.reduce((acc, date) =>
    acc + getSchedulesForDate(schedules, date).filter(s => s.category !== 'mission').length, 0)

  // 이번 주 숙제 마감 수
  const weekDateStrs = new Set(weekdays.map(d =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  ))
  const weekHomeworkCount = homeworks.filter(hw => weekDateStrs.has(hw.dueDate)).length

  // 이번 주에 표시되는 고유 일정 이름 (미션 제외) — 범례용
  const legendTitles = [...new Set(
    weekdays.flatMap(date =>
      getSchedulesForDate(schedules, date)
        .filter(s => s.category !== 'mission')
        .map(s => s.title)
    )
  )]

  // WeeklyTimetable과 동일한 schedules 배열 기준으로 만들어야 블록 색상과 일치함
  const titleColors = useMemo(() => buildTitleColorMap(schedules), [schedules])

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-lg font-bold text-slate-800">주간 시간표</h2>
          <p className="text-sm text-slate-400">
            일정 {totalScheduleCount}개
            {weekHomeworkCount > 0 && (
              <> · <span className="text-red-400 font-medium">숙제 마감 {weekHomeworkCount}개</span></>
            )}
          </p>
        </div>
        <button
          onClick={() => setNextTermOpen(true)}
          className="flex items-center gap-1 text-xs text-indigo-500 font-semibold bg-indigo-50 px-2.5 py-1.5 rounded-full"
        >
          <CalendarClock size={13} /> 다음학기 시간표
        </button>
      </div>

      {/* 주차 네비게이터 */}
      <WeekNavigator
        weekDates={weekDates}
        onPrev={handlePrev}
        onNext={handleNext}
        isCurrentWeek={isCurrentWeek}
      />

      {/* 시간표 그리드 — 블록 클릭 시 바로 수정 폼 */}
      <WeeklyTimetable
        weekDates={weekDates}
        schedules={schedules}
        today={today}
        onBlockClick={(item, date) => setEditState({
          item,
          date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        })}
      />

      {/* FAB */}
      <button
        onClick={() => setAddModalOpen(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center active:scale-95 transition-transform z-30"
        aria-label="일정 추가"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {/* 추가 모달 */}
      <ScheduleFormModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
      />

      {/* 다음학기 시간표 만들기 */}
      <NextTermSetup
        isOpen={nextTermOpen}
        onClose={() => setNextTermOpen(false)}
      />

      {/* 수정 모달 */}
      <ScheduleFormModal
        isOpen={!!editItem}
        onClose={() => setEditState(null)}
        editItem={editItem}
        applyDate={editApplyDate}
      />

      {/* 범례 — 이번 주 일정 이름별 색상 */}
      <div className="mt-4 flex flex-wrap gap-x-2 gap-y-1.5 px-1">
        {legendTitles.map(title => {
          const preset = titleColors.get(title)
          return (
            <span
              key={title}
              className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium"
              style={{ backgroundColor: preset.blockBg, color: preset.blockText, borderLeft: `3px solid ${preset.blockBorder}` }}
            >
              {title}
            </span>
          )
        })}
      </div>
    </div>
  )
}
