import { Check, RotateCcw, ChevronDown, ChevronUp, Pencil, Calendar } from 'lucide-react'
import { useState } from 'react'
import { HW_SUBJECTS, PRIORITY, getDueDateLabel } from '../../data/homeworkData'
import { useHomework } from '../../context/HomeworkContext'

const DIFFICULTY_BADGE = {
  '상': 'bg-red-50 text-red-500',
  '중': 'bg-yellow-50 text-yellow-600',
  '하': 'bg-green-50 text-green-600',
}

export default function HomeworkItem({ item, onEdit, showDueDate = false }) {
  const { isCompleted, toggleCompleted } = useHomework()
  const [expanded, setExpanded] = useState(false)

  const done = isCompleted(item.id)
  const subj = HW_SUBJECTS[item.subject] ?? HW_SUBJECTS.etc
  const prio = PRIORITY[item.priority]

  // 마감일 레이블 (weekend: 키 처리 포함)
  const dueDateLabel = showDueDate && item.dueDate
    ? getDueDateLabel(item.dueDate)
    : null

  return (
    <div className={`relative bg-white rounded-2xl border shadow-sm overflow-hidden transition-all
      ${done ? 'border-slate-100 opacity-60' : 'border-slate-200'}`}>

      {/* 우선순위 컬러 바 */}
      <div className={`h-1 w-full ${
        item.priority === 'high'   ? 'bg-red-400' :
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
            {/* 배지 행 */}
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${subj.color}`}>
                {subj.label}
              </span>
              <span className={`text-xs font-medium ${prio.color}`}>
                {prio.label}
              </span>
              {item.difficulty && (
                <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${DIFFICULTY_BADGE[item.difficulty] ?? ''}`}>
                  난이도 {item.difficulty}
                </span>
              )}
              {item.repeat && (
                <span className="flex items-center gap-0.5 text-xs text-slate-400">
                  <RotateCcw size={10} />매일
                </span>
              )}
            </div>

            {/* 밀린 숙제 표시 */}
            {item.rolledOver && (
              <span className="inline-flex items-center gap-0.5 text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full mb-1">
                ↩ 밀린 숙제
              </span>
            )}

            {/* 제목 */}
            <p className={`text-base font-semibold leading-snug
              ${done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
              {item.title}
            </p>

            {/* 마감일 (학원별 그룹에서 날짜 구분용) */}
            {dueDateLabel && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-400 mt-1">
                <Calendar size={10} />
                {dueDateLabel}
              </span>
            )}

            {/* 소요 시간 (AI 배분 참고용) */}
            {item.estimated_minutes && (
              <span className="ml-2 text-xs text-slate-300">
                약 {item.estimated_minutes}분
              </span>
            )}

            {/* 메모 */}
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
