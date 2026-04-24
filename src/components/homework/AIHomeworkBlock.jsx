import { Clock, CheckCircle2, Circle, RotateCcw } from 'lucide-react'
import { HW_SUBJECTS } from '../../data/homeworkData'
import { useHomework } from '../../context/HomeworkContext'

const SUBJECT_COLORS = {
  math:    'border-orange-300 bg-orange-50',
  english: 'border-green-300 bg-green-50',
  science: 'border-teal-300 bg-teal-50',
  korean:  'border-blue-300 bg-blue-50',
  mission: 'border-yellow-300 bg-yellow-50',
  reading: 'border-purple-300 bg-purple-50',
  etc:     'border-slate-300 bg-slate-50',
}

/**
 * AI가 배분한 단일 숙제 블록 카드
 * @param {{ block: AIScheduledBlock }} props
 */
export default function AIHomeworkBlock({ block }) {
  const { isCompleted, toggleCompleted } = useHomework()
  const done = isCompleted(block.homework_id)
  const subj = HW_SUBJECTS[block.subject] ?? HW_SUBJECTS.etc
  const borderBg = SUBJECT_COLORS[block.subject] ?? SUBJECT_COLORS.etc

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-2xl border-l-4 transition-opacity
        ${borderBg} ${done ? 'opacity-50' : ''}`}
    >
      {/* 완료 체크 */}
      <button
        onClick={() => toggleCompleted(block.homework_id)}
        className="flex-shrink-0"
        aria-label={done ? '완료 취소' : '완료'}
      >
        {done
          ? <CheckCircle2 size={22} className="text-indigo-500" />
          : <Circle size={22} className="text-slate-300" />
        }
      </button>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${subj.color}`}>
            {subj.label}
          </span>
          {block.rolledOver && (
            <span className="flex items-center gap-0.5 text-xs text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-md font-semibold">
              <RotateCcw size={10} />
              밀린 숙제
              {block.originalDate && (
                <span className="text-orange-300 font-normal ml-0.5">({block.originalDate})</span>
              )}
            </span>
          )}
          {block.units_today != null && (
            <span className="text-xs bg-indigo-100 text-indigo-600 font-semibold px-1.5 py-0.5 rounded-md">
              {block.units_today}단위
            </span>
          )}
        </div>
        <p className={`text-sm font-semibold leading-snug ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
          {block.homework_title}
        </p>
        {block.reason && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{block.reason}</p>
        )}
      </div>

      {/* 시간 */}
      <div className="flex-shrink-0 flex items-center gap-1 text-xs text-slate-400 font-medium">
        <Clock size={12} />
        {block.start_time}~{block.end_time}
      </div>
    </div>
  )
}
