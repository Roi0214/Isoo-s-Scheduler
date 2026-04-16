import { Calendar } from 'lucide-react'

function fmt12(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${String(m).padStart(2, '0')}`
}

export default function ExternalEventItem({ item, isPast = false }) {
  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all
      ${isPast ? 'border-blue-100 bg-white opacity-50' : 'border-blue-200 bg-blue-50'}`}>

      <div className="flex items-center gap-2 px-4 py-3">
        {/* 구글 캘린더 컬러 바 */}
        <div className="w-1 self-stretch rounded-full bg-blue-400 flex-shrink-0" />

        {/* 시간 */}
        <div className="flex flex-col items-center w-16 flex-shrink-0">
          <span className={`text-xs font-bold ${isPast ? 'text-slate-400' : 'text-blue-700'}`}>
            {fmt12(item.startTime)}
          </span>
          <span className="text-[10px] text-blue-300">↓</span>
          <span className="text-xs text-blue-400">{fmt12(item.endTime)}</span>
        </div>

        {/* 제목 + 배지 */}
        <div className="flex-1 min-w-0">
          <p className={`text-base font-semibold truncate
            ${isPast ? 'line-through text-slate-400' : 'text-blue-800'}`}>
            {item.title}
          </p>
          <span className="inline-flex items-center gap-1 text-xs text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full font-medium mt-0.5">
            <Calendar size={10} />
            Google 캘린더
          </span>
        </div>
      </div>
    </div>
  )
}
