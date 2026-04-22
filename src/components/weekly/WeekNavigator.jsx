import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getWeekLabel } from '../../utils/weekUtils'

export default function WeekNavigator({ weekDates, onPrev, onNext, isCurrentWeek }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={onPrev}
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 active:bg-slate-200"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="text-center">
        <p className="text-base font-bold text-slate-800">{getWeekLabel(weekDates)}</p>
        {isCurrentWeek && (
          <span className="text-xs text-indigo-500 font-medium">이번 주</span>
        )}
      </div>

      <button
        onClick={onNext}
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 active:bg-slate-200"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}
