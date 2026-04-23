import { useState } from 'react'
import { CalendarDays, Plus, RefreshCw, WifiOff } from 'lucide-react'
import DaySelector from '../components/schedule/DaySelector'
import ScheduleItem from '../components/schedule/ScheduleItem'
import ExternalEventItem from '../components/schedule/ExternalEventItem'
import ScheduleFormModal from '../components/schedule/ScheduleFormModal'
import HomeworkFormModal from '../components/homework/HomeworkFormModal'
import { getSchedulesForDate, CATEGORIES } from '../data/scheduleData'
import { useSchedule } from '../context/ScheduleContext'
import { useGCal } from '../context/GoogleCalendarContext'
import { useCurrentTime, getOngoingStatus } from '../hooks/useCurrentTime'

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

const CATEGORY_TO_SUBJECT = {
  school:   'korean',
  math:     'math',
  english:  'english',
  science:  'science',
  arts:     'etc',
  reading:  'reading',
  mission:  'mission',
  personal: 'etc',
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function prevDayStr(date) {
  const d = new Date(date)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export default function SchedulePage() {
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState(today)
  const now = useCurrentTime()
  const { schedules } = useSchedule()
  const { loading: gcalLoading, error: gcalError, getEventsForDate, getAllDayForDate, refetch } = useGCal()

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [hwModalOpen, setHwModalOpen] = useState(false)
  const [hwPrefill, setHwPrefill] = useState(null)

  const openAddSchedule = () => { setEditItem(null); setScheduleModalOpen(true) }
  const openEditSchedule = (item) => { setEditItem(item); setScheduleModalOpen(true) }
  const closeScheduleModal = () => { setScheduleModalOpen(false); setEditItem(null) }

  const openAddHomework = (scheduleItem) => {
    setHwPrefill({
      subject: CATEGORY_TO_SUBJECT[scheduleItem.category] ?? 'etc',
      dueDate: prevDayStr(selectedDate),
      sourceTitle: `${scheduleItem.title} 전날 준비`,
    })
    setHwModalOpen(true)
  }
  const closeHwModal = () => { setHwModalOpen(false); setHwPrefill(null) }

  const daySchedules = getSchedulesForDate(schedules, selectedDate)
  const externalEvents = getEventsForDate(selectedDate)
  const allDayEvents   = getAllDayForDate(selectedDate)
  const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
  const isToday = isSameDay(selectedDate, today)
  const nowStr  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

  // 내부 + 외부 합쳐서 시간순 정렬 (ongoing은 오늘만 최상단)
  const allItems = [
    ...daySchedules.map(s => ({ ...s, _type: 'internal' })),
    ...externalEvents.map(e => ({ ...e, _type: 'external' })),
  ].sort((a, b) => {
    if (isToday) {
      const aOn = getOngoingStatus(a.startTime, a.endTime, now).ongoing
      const bOn = getOngoingStatus(b.startTime, b.endTime, now).ongoing
      if (aOn && !bOn) return -1
      if (!aOn && bOn) return 1
    }
    return a.startTime.localeCompare(b.startTime)
  })

  const ongoingItem = isToday
    ? daySchedules.find(s => getOngoingStatus(s.startTime, s.endTime, now).ongoing)
    : null

  return (
    <div>
      <DaySelector today={today} selectedDate={selectedDate} onSelect={setSelectedDate} />

      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {isToday ? '오늘' : `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`}
            <span className="ml-2 text-base font-medium text-slate-400">
              {WEEKDAYS[selectedDate.getDay()]}
            </span>
          </h2>
          {ongoingItem ? (
            <p className="text-sm text-indigo-500 font-medium">
              📍 지금은 <span className="font-bold">{ongoingItem.title}</span> 시간이에요
            </p>
          ) : (
            <p className="text-sm text-slate-400">
              일정 {daySchedules.length}개
              {externalEvents.length > 0 && (
                <span className="text-blue-400"> · Google {externalEvents.length}개</span>
              )}
            </p>
          )}
        </div>

        {isToday ? (
          <div className="flex flex-col items-end">
            <div className="flex items-baseline gap-1 leading-none">
              <span className="text-[11px] font-semibold text-indigo-400">
                {now.getHours() < 12 ? '오전' : '오후'}
              </span>
              <span className="text-2xl font-extrabold text-indigo-600 tabular-nums">
                {now.getHours() % 12 || 12}:{String(now.getMinutes()).padStart(2, '0')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">현재 시각</p>
          </div>
        ) : (
          <CalendarDays size={20} className="text-slate-300" />
        )}
      </div>

      {/* 구글 캘린더 상태 표시 */}
      {gcalLoading && (
        <div className="flex items-center gap-1.5 text-xs text-blue-400 mb-2">
          <RefreshCw size={11} className="animate-spin" />
          Google 캘린더 불러오는 중…
        </div>
      )}
      {gcalError && (
        <div className="flex flex-col gap-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <WifiOff size={11} />
            <span className="font-medium">Google 캘린더 연결 실패</span>
            <button onClick={refetch} className="ml-auto text-indigo-400 font-semibold">재시도</button>
          </div>
          <p className="text-[10px] text-slate-400 leading-snug">{gcalError}</p>
        </div>
      )}

      {/* 종일 이벤트 (Google 캘린더) */}
      {allDayEvents.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {allDayEvents.map(e => (
            <span key={e.id} className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
              📅 {e.title}
            </span>
          ))}
        </div>
      )}

      {allItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400">
          <span className="text-4xl">🎉</span>
          <p className="text-sm font-medium">일정이 없는 날이에요!</p>
          <button onClick={openAddSchedule} className="mt-2 text-sm text-indigo-500 font-semibold">+ 일정 추가하기</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {allItems.map((item) => {
            const { ongoing, progress } = isToday
              ? getOngoingStatus(item.startTime, item.endTime, now)
              : { ongoing: false, progress: 0 }
            const isPast = isToday && !ongoing && item.endTime <= nowStr

            if (item._type === 'external') {
              return <ExternalEventItem key={item.id} item={item} isPast={isPast} />
            }
            return (
              <ScheduleItem
                key={item.id}
                item={item}
                dateStr={dateStr}
                ongoing={ongoing}
                progress={progress}
                isPast={isPast}
                onEdit={() => openEditSchedule(item)}
                onAddHomework={() => openAddHomework(item)}
              />
            )
          })}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={openAddSchedule}
        className="fixed bottom-20 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center active:scale-95 transition-transform z-30"
        aria-label="일정 추가"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      <ScheduleFormModal
        isOpen={scheduleModalOpen}
        onClose={closeScheduleModal}
        editItem={editItem}
        applyDate={dateStr}
      />

      <HomeworkFormModal
        isOpen={hwModalOpen}
        onClose={closeHwModal}
        prefill={hwPrefill}
      />
    </div>
  )
}
