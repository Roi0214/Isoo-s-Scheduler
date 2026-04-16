import { Bell } from 'lucide-react'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function getDateLabel() {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekday = WEEKDAYS[now.getDay()]
  return `${month}월 ${day}일 (${weekday})`
}

export default function Header() {
  const dateLabel = getDateLabel()

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* 왼쪽: 앱 타이틀 */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌟</span>
          <div>
            <p className="text-base font-bold text-indigo-600 leading-none">Isoo's Scheduler</p>
            <p className="text-xs text-slate-400 mt-0.5">{dateLabel}</p>
          </div>
        </div>

        {/* 오른쪽: 알림 아이콘 (추후 연동용) */}
        <button
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors"
          aria-label="알림"
        >
          <Bell size={20} className="text-slate-500" />
        </button>
      </div>
    </header>
  )
}
