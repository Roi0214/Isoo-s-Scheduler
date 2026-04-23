import { useState } from 'react'
import { LayoutGrid, Plus } from 'lucide-react'
import WeekNavigator from '../components/weekly/WeekNavigator'
import WeeklyTimetable from '../components/weekly/WeeklyTimetable'
import ScheduleFormModal from '../components/schedule/ScheduleFormModal'
import { getWeekDates, shiftWeek, isSameDay } from '../utils/weekUtils'
import { getSchedulesForDate } from '../data/scheduleData'
import { useSchedule } from '../context/ScheduleContext'
import { getColorPreset } from '../data/scheduleData'
import { useHomework } from '../context/HomeworkContext'

export default function WeeklyPage() {
  const today = new Date()
  const [weekDates, setWeekDates] = useState(() => getWeekDates(today))
  const { schedules, categoryMap } = useSchedule()
  const { homeworks } = useHomework()

  const [editState, setEditState] = useState(null)  // { item, date }
  const editItem = editState?.item ?? null
  const editApplyDate = editState?.date ?? null

  const [addModalOpen, setAddModalOpen] = useState(false)

  const isCurrentWeek = weekDates.some(d => isSameDay(d, today))

  const handlePrev = () => setWeekDates(prev => shiftWeek(prev, -1))
  const handleNext = () => setWeekDates(prev => shiftWeek(prev, +1))

  // 월~금만 사용
  const weekdays = weekDates.slice(0, 5)

  // 이번 주 총 일정 수 (월~금, 미션 제외)
  const totalScheduleCount = weekdays.reduce((acc, date) =>
    acc + getSchedulesForDate(schedules, date).filter(s => s.category !== 'mission').length, 0)

  // 이번 주 숙제 마감 수
  const weekDateStrs = new Set(weekdays.map(d => d.toISOString().slice(0, 10)))
  const weekHomeworkCount = homeworks.filter(hw => weekDateStrs.has(hw.dueDate)).length

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
        <LayoutGrid size={20} className="text-slate-300" />
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

      {/* 수정 모달 */}
      <ScheduleFormModal
        isOpen={!!editItem}
        onClose={() => setEditState(null)}
        editItem={editItem}
        applyDate={editApplyDate}
      />

      {/* 범례 — 분류 추가/수정 시 자동 반영 */}
      <div className="mt-4 flex flex-wrap gap-x-2 gap-y-1.5 px-1">
        {Object.entries(categoryMap)
          .filter(([id]) => id !== 'mission') // 미션은 주간표에 미표시
          .map(([id, cat]) => {
            const preset = getColorPreset(cat.colorKey)
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium"
                style={{ backgroundColor: preset.blockBg, color: preset.blockText, borderLeft: `3px solid ${preset.blockBorder}` }}
              >
                {cat.label}
              </span>
            )
          })}
      </div>
    </div>
  )
}
