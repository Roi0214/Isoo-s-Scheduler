import { useState } from 'react'
import { CheckSquare, Square, Repeat, CalendarClock } from 'lucide-react'
import { useHomework } from '../../context/HomeworkContext'
import { useSchedule } from '../../context/ScheduleContext'
import { localDateStr } from '../../utils/weekUtils'
import { findNextClassDate, prevDayStr } from '../../utils/scheduleUtils'
import HomeworkFormModal from './HomeworkFormModal'

// ── 과목 색상 ────────────────────────────────────────────────
const COLORS = {
  math:    { bar: 'bg-blue-400',    bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-l-blue-400' },
  english: { bar: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-l-emerald-400' },
  korean:  { bar: 'bg-orange-400',  bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-l-orange-400' },
  science: { bar: 'bg-purple-400',  bg: 'bg-purple-50',  text: 'text-purple-600',  border: 'border-l-purple-400' },
  social:  { bar: 'bg-yellow-400',  bg: 'bg-yellow-50',  text: 'text-yellow-600',  border: 'border-l-yellow-400' },
  default: { bar: 'bg-slate-300',   bg: 'bg-slate-50',   text: 'text-slate-500',   border: 'border-l-slate-300' },
}
const SUBJECT_KR = {
  math: '수학', english: '영어', korean: '국어',
  science: '과학', social: '사회', art: '미술', music: '음악',
}
const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토']

function color(subject) { return COLORS[subject] ?? COLORS.default }

// D-Day 뱃지 정보
function dday(dueDate, today) {
  const diff = Math.ceil(
    (new Date(dueDate + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000
  )
  if (diff < 0)   return { text: `D+${Math.abs(diff)}`, cls: 'bg-red-100 text-red-600' }
  if (diff === 0)  return { text: 'D-DAY',               cls: 'bg-red-100 text-red-600' }
  if (diff <= 2)   return { text: `D-${diff}`,            cls: 'bg-orange-100 text-orange-500' }
  return            { text: `D-${diff}`,                  cls: 'bg-slate-100 text-slate-500' }
}

export default function TodayAITab() {
  const { homeworks, isCompleted, toggleCompleted, updateHomework } = useHomework()
  const { schedules } = useSchedule()
  const [editHw, setEditHw] = useState(null)

  const today = localDateStr(new Date())
  const todayDate = new Date(today + 'T00:00:00')
  const todayLabel = `${todayDate.getMonth() + 1}/${todayDate.getDate()}(${WEEKDAY_KR[todayDate.getDay()]})`

  // ── A. 오늘의 루틴 판별 ──────────────────────────────────
  // · repeat: true → 매일 노출
  // · fixed_d1 + linked_event → 해당 수업 D-1이 오늘이면 노출
  // · fixed_d1 + dueDate only → dueDate가 오늘이면 노출
  function isRoutineToday(hw) {
    if (hw.status === 'completed') return false
    if (hw.repeat) return true
    if (!hw.fixed_d1) return false
    if (hw.linked_event) {
      const nextClass = findNextClassDate(hw.linked_event, schedules)
      return nextClass ? prevDayStr(nextClass) === today : false
    }
    return hw.dueDate === today
  }

  // 루틴 완료 키: 날짜별 독립 체크 (hw.id:date)
  const rKey = (hw) => `${hw.id}:${today}`

  const todayRoutines = homeworks.filter(isRoutineToday)
  const doneCount = todayRoutines.filter(hw => isCompleted(rKey(hw))).length

  // ── B. 마감형 퀘스트 ─────────────────────────────────────
  // · 루틴(repeat/fixed_d1)이 아닌 것
  // · status !== 'completed' 이고 completedSet에 없는 것
  // · dueDate 오름차순 (없으면 맨 뒤)
  const deadlineTasks = homeworks
    .filter(hw =>
      hw.status !== 'completed' &&
      !hw.repeat &&
      !hw.fixed_d1 &&
      !isCompleted(hw.id)
    )
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    })

  // ── 렌더 ────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">

      {/* ════ 오늘의 루틴 ════ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Repeat size={14} className="text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-700">오늘의 루틴</h2>
            <span className="text-xs text-slate-400 ml-1">{todayLabel}</span>
          </div>
          {todayRoutines.length > 0 && (
            <span className="text-xs text-slate-400">{doneCount}/{todayRoutines.length} 완료</span>
          )}
        </div>

        {todayRoutines.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-2xl">
            오늘은 루틴 숙제가 없어요
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {todayRoutines.map(hw => {
              const key = rKey(hw)
              const done = isCompleted(key)
              const c = color(hw.subject)
              return (
                <div
                  key={hw.id}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-l-4 transition-all
                    ${done ? `bg-slate-50 border-l-slate-200` : `${c.bg} ${c.border}`}`}
                >
                  <button onClick={() => toggleCompleted(key)} className="flex-shrink-0">
                    {done
                      ? <CheckSquare size={20} className="text-indigo-400" />
                      : <Square size={20} className={c.text} />
                    }
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate
                      ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {hw.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {hw.repeat
                        ? '매일 루틴'
                        : hw.linked_event
                          ? `${hw.linked_event} 전날`
                          : '오늘 마감'
                      }
                      {hw.estimated_minutes ? ` · ${hw.estimated_minutes}분` : ''}
                    </p>
                  </div>

                  <button
                    onClick={() => setEditHw(hw)}
                    className="text-xs text-slate-300 flex-shrink-0 px-1 py-1"
                  >
                    편집
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ════ 남은 숙제 보드 ════ */}
      <section>
        <div className="flex items-center gap-1.5 mb-3">
          <CalendarClock size={14} className="text-orange-400" />
          <h2 className="text-sm font-bold text-slate-700">남은 숙제 보드</h2>
          <span className="text-xs text-slate-400">마감 임박순</span>
          {deadlineTasks.length > 0 && (
            <span className="ml-auto text-xs text-slate-400">{deadlineTasks.length}개</span>
          )}
        </div>

        {deadlineTasks.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-2xl">
            남은 숙제가 없어요 🎉
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {deadlineTasks.map(hw => {
              const c = color(hw.subject)
              const dd = hw.dueDate ? dday(hw.dueDate, today) : null
              const overdue = hw.dueDate && hw.dueDate < today

              return (
                <div
                  key={hw.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm flex overflow-hidden"
                >
                  {/* 과목 컬러 바 */}
                  <div className={`w-1.5 flex-shrink-0 ${c.bar}`} />

                  <div className="flex items-center gap-3 px-3 py-3.5 flex-1 min-w-0">
                    {/* 완료 버튼 — 체크 시 보드에서 제거 */}
                    <button
                      onClick={() => updateHomework(hw.id, { status: 'completed' })}
                      className="flex-shrink-0 group"
                      title="완료 처리"
                    >
                      <Square size={20} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    </button>

                    {/* 숙제 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${c.bg} ${c.text}`}>
                          {SUBJECT_KR[hw.subject] ?? hw.subject}
                        </span>
                        {hw.linked_event && (
                          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md truncate max-w-[80px]">
                            {hw.linked_event}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm font-semibold truncate ${overdue ? 'text-red-500' : 'text-slate-700'}`}>
                        {hw.title}
                      </p>
                      {hw.dueDate && (
                        <p className="text-xs text-slate-400 mt-0.5">마감 {hw.dueDate}</p>
                      )}
                    </div>

                    {/* D-Day + 편집 */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {dd && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${dd.cls}`}>
                          {dd.text}
                        </span>
                      )}
                      <button onClick={() => setEditHw(hw)} className="text-xs text-slate-300">
                        편집
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <HomeworkFormModal
        isOpen={!!editHw}
        onClose={() => setEditHw(null)}
        editItem={editHw}
      />
    </div>
  )
}
