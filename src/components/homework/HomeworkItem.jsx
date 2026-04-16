import { Check, RotateCcw, ChevronDown, ChevronUp, Pencil, CalendarClock } from 'lucide-react'
import { useState } from 'react'
import { HW_SUBJECTS, PRIORITY } from '../../data/homeworkData'
import { useHomework } from '../../context/HomeworkContext'

export default function HomeworkItem({ item, onEdit }) {
  const { isCompleted, toggleCompleted } = useHomework()
  const [expanded, setExpanded] = useState(false)

  const done = isCompleted(item.id)
  const subj = HW_SUBJECTS[item.subject] ?? HW_SUBJECTS.etc
  const prio = PRIORITY[item.priority]

  return (
    <div className={`relative bg-white rounded-2xl border shadow-sm overflow-hidden transition-all
      ${done ? 'border-slate-100 opacity-60' : 'border-slate-200'}`}>

      {/* 상단: 우선순위 컬러 바 */}
      <div className={`h-1 w-full ${
        item.priority === 'high' ? 'bg-red-400' :
        item.priority === 'medium' ? 'bg-yellow-400' : 'bg-slate-200'
      }`} />

      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          {/* 편집 버튼 */}
          <button
            onClick={onEdit}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-slate-300 hover:text-indigo-400 hover:bg-indigo-50 transition-colors"
            aria-label="편집"
          >
            <Pencil size={13} />
          </button>

          {/* 체크박스 */}
          <button
            onClick={() => toggleCompleted(item.id)}
            aria-label={done ? '완료 취소' : '완료 표시'}
            className={`mt-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0
              transition-all active:scale-90
              ${done ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 hover:border-indigo-400'}`}
          >
            {done && <Check size={13} strokeWidth={3} className="text-white" />}
          </button>

          {/* 본문 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${subj.color}`}>
                {subj.label}
              </span>
              <span className={`text-xs font-medium ${prio.color}`}>
                {prio.label}
              </span>
              {item.repeat && (
                <span className="flex items-center gap-0.5 text-xs text-slate-400">
                  <RotateCcw size={10} />매일
                </span>
              )}
            </div>

            {item.rolledOver && (
              <span className="inline-flex items-center gap-0.5 text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full mb-1">
                ↩ 밀린 숙제
              </span>
            )}
            <p className={`text-base font-semibold leading-snug transition-all
              ${done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
              {item.title}
            </p>

            {/* 일정에서 추가된 숙제 표시 */}
            {item.linkedScheduleTitle && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                <CalendarClock size={10} />
                {item.linkedScheduleTitle}
              </span>
            )}

            {/* 메모 — 펼치기/접기 */}
            {item.memo && (
              <>
                <button
                  onClick={() => setExpanded(v => !v)}
                  className="flex items-center gap-1 text-xs text-slate-400 mt-1 hover:text-slate-600"
                >
                  {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {expanded ? '메모 접기' : '메모 보기'}
                </button>
                {expanded && (
                  <p className="mt-1 text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                    {item.memo}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
