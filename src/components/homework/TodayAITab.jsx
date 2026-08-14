import { useState } from 'react'
import { CheckSquare, Square, Repeat, CalendarClock, Star } from 'lucide-react'
import { useHomework } from '../../context/HomeworkContext'
import { useSchedule } from '../../context/ScheduleContext'
import { localDateStr } from '../../utils/weekUtils'
import { findNextClassDate, prevDayStr } from '../../utils/scheduleUtils'
import HomeworkFormModal from './HomeworkFormModal'
import DailyMemo from '../schedule/DailyMemo'

// ── 과목 이모지 & 색상 ───────────────────────────────────────
const SUBJECT = {
  math:    { emoji: '📐', bg: 'bg-blue-50',    text: 'text-blue-600',    bar: 'bg-blue-400',    border: 'border-l-blue-300' },
  english: { emoji: '📚', bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-400', border: 'border-l-emerald-300' },
  korean:  { emoji: '✏️', bg: 'bg-orange-50',  text: 'text-orange-600',  bar: 'bg-orange-400',  border: 'border-l-orange-300' },
  science: { emoji: '🔬', bg: 'bg-purple-50',  text: 'text-purple-600',  bar: 'bg-purple-400',  border: 'border-l-purple-300' },
  social:  { emoji: '🗺️', bg: 'bg-yellow-50',  text: 'text-yellow-600',  bar: 'bg-yellow-400',  border: 'border-l-yellow-300' },
  reading: { emoji: '📖', bg: 'bg-pink-50',    text: 'text-pink-600',    bar: 'bg-pink-400',    border: 'border-l-pink-300' },
  mission: { emoji: '⭐', bg: 'bg-amber-50',   text: 'text-amber-600',   bar: 'bg-amber-400',   border: 'border-l-amber-300' },
  etc:     { emoji: '📝', bg: 'bg-slate-50',   text: 'text-slate-500',   bar: 'bg-slate-300',   border: 'border-l-slate-200' },
}
function subj(subject) { return SUBJECT[subject] ?? SUBJECT.etc }

const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토']

// ── 칭찬 메시지 (hw.id 기반으로 고정 선택) ──────────────────
const PRAISES = [
  '완료! 정말 잘했어요 🌟',
  '최고예요! 훌륭해요 🏆',
  '완벽해요! 멋진걸요 ✨',
  '굿잡! 대단해요 🎉',
  '해냈어요! 짱이에요 💪',
  '야호! 다 했어요 🥳',
]
function praise(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PRAISES[h % PRAISES.length]
}

// ── D-Day 뱃지 ───────────────────────────────────────────────
function dday(dueDate, today) {
  const diff = Math.ceil(
    (new Date(dueDate + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000
  )
  if (diff < 0)  return { text: `D+${Math.abs(diff)}`, cls: 'bg-red-100 text-red-500' }
  if (diff === 0) return { text: 'D-DAY',              cls: 'bg-red-100 text-red-500' }
  if (diff <= 2)  return { text: `D-${diff}`,           cls: 'bg-orange-100 text-orange-500' }
  return           { text: `D-${diff}`,                 cls: 'bg-slate-100 text-slate-400' }
}

export default function TodayAITab() {
  const { homeworks, isCompleted, toggleCompleted, updateHomework, isTodayPick, toggleTodayPick } = useHomework()
  const { schedules } = useSchedule()
  const [editHw, setEditHw] = useState(null)

  const today = localDateStr(new Date())
  const todayDate = new Date(today + 'T00:00:00')
  const todayLabel = `${todayDate.getMonth() + 1}/${todayDate.getDate()}(${WEEKDAY_KR[todayDate.getDay()]})`

  // ── A. 오늘의 루틴 ───────────────────────────────────────
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

  const rKey = (hw) => `${hw.id}:${today}`
  const todayRoutines = homeworks.filter(isRoutineToday)
  const doneCount = todayRoutines.filter(hw => isCompleted(rKey(hw))).length
  const allRoutinesDone = todayRoutines.length > 0 && doneCount === todayRoutines.length

  // ── B. 남은 숙제 보드 ────────────────────────────────────
  const deadlineTasks = homeworks
    .filter(hw => {
      if (hw.repeat || hw.fixed_d1) return false
      if (hw.status === 'completed' && hw.dueDate && today > hw.dueDate) return false
      return true
    })
    .sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1
      if (a.status !== 'completed' && b.status === 'completed') return -1
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    })

  const incompleteTasks = deadlineTasks.filter(hw => hw.status !== 'completed')
  const allBoardDone = deadlineTasks.length > 0 && incompleteTasks.length === 0

  // ── 렌더 ────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">

      {/* ════ 오늘의 메모 (일정 탭과 동일한 그 날의 메모) ════ */}
      <DailyMemo dateStr={today} />

      {/* ════ 오늘의 루틴 ════ */}
      <section>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Repeat size={13} className="text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-700">오늘의 루틴</h2>
            <span className="text-xs text-slate-400">{todayLabel}</span>
          </div>
          {todayRoutines.length > 0 && (
            <span className="text-xs text-slate-400">
              {allRoutinesDone ? '🎊 모두 완료!' : `${doneCount}/${todayRoutines.length}`}
            </span>
          )}
        </div>

        {todayRoutines.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-2xl">
            오늘은 루틴 숙제가 없어요 😊
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {todayRoutines.map(hw => {
              const key = rKey(hw)
              const done = isCompleted(key)
              const s = subj(hw.subject)
              return (
                <div
                  key={hw.id}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border-l-4 transition-all
                    ${done ? 'bg-slate-50 border-l-slate-200' : `${s.bg} ${s.border}`}`}
                >
                  <button onClick={() => toggleCompleted(key)} className="flex-shrink-0">
                    {done
                      ? <CheckSquare size={18} className="text-indigo-400" />
                      : <Square size={18} className={s.text} />
                    }
                  </button>

                  <span className="text-base leading-none flex-shrink-0">{s.emoji}</span>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate
                      ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {hw.title}
                    </p>
                    {done ? (
                      <p className="text-xs text-indigo-400 mt-0.5">{praise(hw.id)}</p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {hw.repeat ? '매일 루틴' : hw.linked_event ? `${hw.linked_event} 전날` : '오늘 마감'}
                        {hw.estimated_minutes ? ` · ${hw.estimated_minutes}분` : ''}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setEditHw(hw)}
                    className="text-xs text-slate-300 flex-shrink-0"
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
        <div className="flex items-center gap-1.5 mb-2.5">
          <CalendarClock size={13} className="text-orange-400" />
          <h2 className="text-sm font-bold text-slate-700">남은 숙제 보드</h2>
          {incompleteTasks.length > 0 && (
            <span className="text-xs text-slate-400">마감 임박순</span>
          )}
          {incompleteTasks.length > 0 && (
            <span className="ml-auto text-xs text-slate-400">{incompleteTasks.length}개</span>
          )}
        </div>

        {deadlineTasks.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-1 bg-slate-50 rounded-2xl">
            <span className="text-3xl">🎊</span>
            <p className="text-sm font-bold text-slate-600">남은 숙제가 없어요!</p>
            <p className="text-xs text-slate-400">정말 대단해요 👏</p>
          </div>
        ) : allBoardDone ? (
          <>
            <div className="flex flex-col items-center py-5 gap-1 bg-indigo-50 rounded-2xl mb-2.5">
              <span className="text-3xl">🌟</span>
              <p className="text-sm font-bold text-indigo-600">모든 숙제 완료!</p>
              <p className="text-xs text-indigo-400">오늘도 정말 잘했어요 🎉</p>
            </div>
            <div className="flex flex-col gap-1.5">
              {deadlineTasks.map(hw => <BoardCard key={hw.id} hw={hw} today={today} onEdit={setEditHw} updateHomework={updateHomework} isTodayPick={isTodayPick} toggleTodayPick={toggleTodayPick} />)}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1.5">
            {deadlineTasks.map(hw => <BoardCard key={hw.id} hw={hw} today={today} onEdit={setEditHw} updateHomework={updateHomework} isTodayPick={isTodayPick} toggleTodayPick={toggleTodayPick} />)}
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

// ── 남은 숙제 보드 카드 ──────────────────────────────────────
function BoardCard({ hw, today, onEdit, updateHomework, isTodayPick, toggleTodayPick }) {
  const s = subj(hw.subject)
  const done = hw.status === 'completed'
  const dd = hw.dueDate ? dday(hw.dueDate, today) : null
  const overdue = hw.dueDate && hw.dueDate < today
  const picked = isTodayPick(hw.id)

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border transition-all
      ${done
        ? 'bg-slate-50 border-slate-100 opacity-70'
        : picked
          ? 'bg-amber-50 border-amber-300'
          : 'bg-white border-slate-100 shadow-sm'
      }`}
    >
      {/* 완료 토글 */}
      <button
        onClick={() => updateHomework(hw.id, { status: done ? 'backlog' : 'completed' })}
        className="flex-shrink-0"
        title={done ? '완료 취소' : '완료'}
      >
        {done
          ? <CheckSquare size={18} className="text-indigo-400" />
          : <Square size={18} className="text-slate-300 hover:text-indigo-400 transition-colors" />
        }
      </button>

      {/* 오늘 할 숙제 표시 */}
      <button
        onClick={() => toggleTodayPick(hw.id)}
        aria-label={picked ? '오늘 할 숙제 해제' : '오늘 할 숙제로 표시'}
        className={`flex-shrink-0 transition-colors ${picked ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
      >
        <Star size={16} fill={picked ? 'currentColor' : 'none'} />
      </button>

      {/* 과목 이모지 */}
      <span className="text-base leading-none flex-shrink-0">{s.emoji}</span>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate leading-tight
          ${done ? 'line-through text-slate-400' : overdue ? 'text-red-500' : 'text-slate-700'}`}>
          {hw.title}
        </p>
        {done ? (
          <p className="text-xs text-indigo-400 mt-0.5 leading-tight">{praise(hw.id)}</p>
        ) : (
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {hw.linked_event && (
              <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md leading-tight">
                {hw.linked_event}
              </span>
            )}
            {hw.dueDate && (
              <span className="text-xs text-slate-400 leading-tight">
                마감 {hw.dueDate}
              </span>
            )}
          </div>
        )}
      </div>

      {/* D-Day + 편집 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {dd && !done && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${dd.cls}`}>
            {dd.text}
          </span>
        )}
        <button onClick={() => onEdit(hw)} className="text-xs text-slate-300">
          편집
        </button>
      </div>
    </div>
  )
}
