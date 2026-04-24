import { useState } from 'react'
import { BookOpenCheck, Sparkles, Plus } from 'lucide-react'
import BacklogTab from '../components/homework/BacklogTab'
import TodayAITab from '../components/homework/TodayAITab'
import HomeworkFormModal from '../components/homework/HomeworkFormModal'

const TABS = {
  BACKLOG: 'backlog',
  AI:      'ai',
}

export default function HomeworkPage() {
  const [activeTab, setActiveTab] = useState(TABS.BACKLOG)
  const [modalOpen, setModalOpen]  = useState(false)

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">숙제</h2>
        </div>
        <BookOpenCheck size={20} className="text-slate-300" />
      </div>

      {/* 탭 스위처 */}
      <div className="flex bg-slate-100 rounded-2xl p-1 mb-5 gap-1">
        <button
          onClick={() => setActiveTab(TABS.BACKLOG)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold transition-all
            ${activeTab === TABS.BACKLOG
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-400'
            }`}
        >
          <BookOpenCheck size={14} />
          전체 숙제 리스트
        </button>
        <button
          onClick={() => setActiveTab(TABS.AI)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold transition-all
            ${activeTab === TABS.AI
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-400'
            }`}
        >
          <Sparkles size={14} />
          오늘의 숙제
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === TABS.BACKLOG && <BacklogTab />}
      {activeTab === TABS.AI      && <TodayAITab />}

      {/* FAB — 백로그 탭에서만 표시 */}
      {activeTab === TABS.BACKLOG && (
        <button
          onClick={() => setModalOpen(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center active:scale-95 transition-transform z-30"
          aria-label="숙제 추가"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}

      <HomeworkFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
