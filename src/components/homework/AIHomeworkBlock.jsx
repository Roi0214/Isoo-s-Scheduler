import { Clock, CheckCircle2, Circle, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
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
export default function AIHomeworkBlock({ block, onEdit }) {
  const { isCompleted, toggleCompleted, homeworks } = useHomework()
  const [expanded, setExpanded] = useState(false)

  // 원본 숙제 데이터 조회 (메모·소요시간 등)
  const hw = homeworks?.find(h => h.id === block.homework_id)
  // repeat·is_divisible 숙제는 날짜별로 독립 완료 처리 (hwId:date 키 사용)
  const blockKey = (hw?.repeat || hw?.is_divisible)
    ? `${block.homework_id}:${block.date}`
    : block.homework_id
  const done = isCompleted(blockKey)
  const subj = HW_SUBJECTS[block.subject] ?? HW_SUBJECTS.etc
  const borderBg = SUBJECT_COLORS[block.subject] ?? SUBJECT_COLORS.etc

  return (
    <div className={`rounded-2xl border-l-4 transition-opacity ${borderBg} ${done ? 'opacity-50' : ''}`}>
      {/* 메인 행 */}
      <div className="flex items-center gap-3 p-3">
        {/* 완료 체크 */}
        <button
          onClick={() => toggleCompleted(blockKey)}
          className="flex-shrink-0"
          aria-label={done ? '완료 취소' : '완료'}
        >
          {done
            ? <CheckCircle2 size={22} className="text-indigo-500" />
            : <Circle size={22} className="text-slate-300" />
          }
        </button>

        {/* 내용 — 클릭 시 편집 */}
        <button
          className="flex-1 min-w-0 text-left"
          onClick={() => onEdit && hw && onEdit(hw)}
          disabled={!onEdit || !hw}
        >
          {/* 배지 행 */}
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
          </div>

          {/* 제목 */}
          <p className={`text-sm font-semibold leading-snug ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
            {block.homework_title}
          </p>
        </button>

        {/* 예상소요시간 + 펼치기 */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          {hw?.estimated_minutes && (
            <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
              <Clock size={12} />
              {block.units_today != null ? `${block.units_today}분` : `${hw.estimated_minutes}분`}
            </div>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-slate-300 hover:text-slate-500 transition-colors"
            aria-label="상세 보기"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* 상세 펼침 */}
      {expanded && (
        <div className="px-4 pb-3 pt-0 flex flex-col gap-1.5 border-t border-black/5">
          {hw?.linked_event && (
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-600">연결 학원</span> {hw.linked_event}
            </p>
          )}
          {block.reason && (
            <p className="text-xs text-slate-400 italic">{block.reason}</p>
          )}
          {hw?.memo && (
            <p className="text-xs text-slate-500 bg-white rounded-lg px-3 py-2">
              {hw.memo}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
