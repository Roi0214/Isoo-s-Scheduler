import { Check, Pencil, BookPlus } from 'lucide-react'
import { useSchedule } from '../../context/ScheduleContext'

function fmt12(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h < 12 ? '오전' : '오후'
  return `${ampm} ${h % 12 || 12}:${String(m).padStart(2, '0')}`
}

export default function ScheduleItem({ item, dateStr, ongoing = false, progress = 0, isPast = false, onEdit, onAddHomework }) {
  const { isCompleted, toggleCompleted, categories } = useSchedule()
  const done = isCompleted(item.id, dateStr) || isPast
  const cat = categories[item.category] ?? categories.personal ?? { label: '개인', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' }

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all
      ${ongoing
        ? 'border-indigo-300 bg-indigo-50 shadow-indigo-100 shadow-md'
        : done
          ? 'border-slate-100 bg-white opacity-60'
          : 'border-slate-200 bg-white'
      }`}>

      {/* 온고잉 배지 */}
      {ongoing && (
        <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-xs font-bold text-indigo-600">지금 진행 중</span>
        </div>
      )}

      <div className={`flex items-center gap-2 px-4 ${ongoing ? 'pt-1.5 pb-3' : 'py-3'}`}>
        {/* 카테고리 컬러 바 */}
        <div className={`w-1 self-stretch rounded-full ${cat.dot} flex-shrink-0`} />

        {/* 시간 */}
        <div className="flex flex-col items-center w-16 flex-shrink-0">
          <span className={`text-xs font-bold ${ongoing ? 'text-indigo-700' : 'text-slate-700'}`}>
            {fmt12(item.startTime)}
          </span>
          <span className="text-[10px] text-slate-400">↓</span>
          <span className="text-xs text-slate-400">{fmt12(item.endTime)}</span>
        </div>

        {/* 제목 + 카테고리 뱃지 */}
        <div className="flex-1 min-w-0">
          <p className={`text-base font-semibold truncate transition-all
            ${done
              ? 'line-through text-slate-400'
              : ongoing
                ? 'text-indigo-800'
                : 'text-slate-800'
            }`}>
            {item.title}
          </p>
          <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${cat.color}`}>
            {cat.label}
          </span>
        </div>

        {/* 숙제 추가 버튼 */}
        <button
          onClick={onAddHomework}
          className="w-7 h-7 flex items-center justify-center rounded-full text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 flex-shrink-0 transition-colors"
          aria-label="숙제 추가"
          title="이 일정 숙제 추가"
        >
          <BookPlus size={14} />
        </button>

        {/* 편집 버튼 */}
        <button
          onClick={onEdit}
          className="w-7 h-7 flex items-center justify-center rounded-full text-slate-300 hover:text-indigo-400 hover:bg-indigo-50 flex-shrink-0 transition-colors"
          aria-label="편집"
        >
          <Pencil size={13} />
        </button>

        {/* 완료 체크박스 */}
        <button
          onClick={() => toggleCompleted(item.id, dateStr)}
          aria-label={done ? '완료 취소' : '완료 표시'}
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0
            transition-all active:scale-90
            ${done
              ? 'bg-indigo-500 border-indigo-500'
              : ongoing
                ? 'border-indigo-400 hover:border-indigo-500'
                : 'border-slate-300 hover:border-indigo-400'
            }`}
        >
          {done && <Check size={14} strokeWidth={3} className="text-white" />}
        </button>
      </div>

      {/* 진행률 바 */}
      {ongoing && (
        <div className="px-4 pb-3">
          <div className="w-full bg-indigo-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-right text-[10px] text-indigo-400 mt-0.5">{progress}% 지남</p>
        </div>
      )}
    </div>
  )
}
