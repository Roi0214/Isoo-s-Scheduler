import { CalendarDays, BookOpenCheck, LayoutGrid } from 'lucide-react'
import { useApp, TABS } from '../../context/AppContext'

const NAV_ITEMS = [
  {
    tab: TABS.SCHEDULE,
    label: '일정',
    Icon: CalendarDays,
  },
  {
    tab: TABS.HOMEWORK,
    label: '숙제',
    Icon: BookOpenCheck,
  },
  {
    tab: TABS.WEEKLY,
    label: '주간표',
    Icon: LayoutGrid,
  },
]

export default function BottomNav() {
  const { activeTab, setActiveTab } = useApp()

  return (
    <nav className="bg-white border-t border-slate-200 fixed bottom-0 left-0 right-0 z-20 safe-area-pb">
      <div className="max-w-md mx-auto flex">
        {NAV_ITEMS.map(({ tab, label, Icon }) => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors
                ${isActive
                  ? 'text-indigo-600'
                  : 'text-slate-400 hover:text-slate-600 active:text-slate-700'
                }`}
              aria-label={label}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-xs ${isActive ? 'font-bold' : 'font-medium'}`}>
                {label}
              </span>
              {/* 활성 탭 인디케이터 */}
              {isActive && (
                <span className="absolute top-0 w-10 h-0.5 bg-indigo-500 rounded-b-full" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
