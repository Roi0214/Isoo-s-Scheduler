import { useState } from 'react'
import { BookOpenCheck, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import HomeworkItem from '../components/homework/HomeworkItem'
import HomeworkFilter from '../components/homework/HomeworkFilter'
import HomeworkFormModal from '../components/homework/HomeworkFormModal'
import { groupHomeworksByDueDate, getDueDateLabel } from '../data/homeworkData'
import { useHomework } from '../context/HomeworkContext'

export default function HomeworkPage() {
  const [filter, setFilter] = useState('all')
  const { homeworks, isCompleted, completedCount } = useHomework()

  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)

  // 그룹별 접기/펼치기 상태 (오늘 그룹은 기본 펼침)
  const [collapsed, setCollapsed] = useState({})
  const toggleCollapse = (key) =>
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  const openAdd = () => { setEditItem(null); setModalOpen(true) }
  const openEdit = (item) => { setEditItem(item); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditItem(null) }

  const today = new Date().toISOString().slice(0, 10)

  const filtered = homeworks.filter(hw => {
    if (filter === 'done') return isCompleted(hw.id)
    if (filter === 'todo') return !isCompleted(hw.id)
    return true
  })

  // 기한이 지났고 미완료인 숙제는 오늘로 롤오버
  const withRollover = filtered.map(hw => {
    if (!isCompleted(hw.id) && hw.dueDate < today) {
      return { ...hw, dueDate: today, rolledOver: true }
    }
    return hw
  })

  const groups = groupHomeworksByDueDate(withRollover)
  const totalCount = homeworks.length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">숙제 목록</h2>
          <p className="text-sm text-slate-400">
            전체 {totalCount}개 중{' '}
            <span className="text-indigo-600 font-semibold">{completedCount}개</span> 완료
          </p>
        </div>
        <BookOpenCheck size={20} className="text-slate-300" />
      </div>

      {/* 진행률 바 */}
      <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${totalCount === 0 ? 0 : (completedCount / totalCount) * 100}%` }}
        />
      </div>

      <HomeworkFilter active={filter} onChange={setFilter} />

      {Object.keys(groups).length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400">
          <span className="text-4xl">🎉</span>
          <p className="text-sm font-medium">
            {filter === 'done' ? '완료한 숙제가 없어요' : '모든 숙제를 완료했어요!'}
          </p>
          {filter === 'all' && (
            <button onClick={openAdd} className="mt-2 text-sm text-indigo-500 font-semibold">+ 숙제 추가하기</button>
          )}
        </div>
      ) : (
        Object.entries(groups).map(([dueDate, items]) => {
          const isToday   = dueDate === today
          const isWeekend = dueDate.startsWith('weekend:')
          // 오늘 그룹은 기본 펼침, 나머지는 기본 접힘
          const isOpen = isToday ? !(collapsed[dueDate] === true) : (collapsed[dueDate] === true)
          const doneCount = items.filter(hw => isCompleted(hw.id)).length

          return (
            <div key={dueDate} className="mb-3">
              {/* 그룹 헤더 — 클릭으로 접기/펼치기 */}
              <button
                onClick={() => toggleCollapse(dueDate)}
                className="w-full flex items-center gap-2 mb-2 group"
              >
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                  ${isToday
                    ? 'bg-red-100 text-red-600'
                    : isWeekend
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                  {getDueDateLabel(dueDate)}
                </span>
                <span className="text-xs text-slate-300">
                  {doneCount}/{items.length}
                </span>
                <span className="ml-auto text-slate-300 group-hover:text-slate-400 transition-colors">
                  {isOpen
                    ? <ChevronDown size={14} />
                    : <ChevronRight size={14} />}
                </span>
              </button>

              {/* 접힌 상태: 미완료 숙제 제목 미리보기 */}
              {!isOpen && (
                <div
                  onClick={() => toggleCollapse(dueDate)}
                  className="flex flex-wrap gap-1.5 cursor-pointer px-1"
                >
                  {items.filter(hw => !isCompleted(hw.id)).map(hw => (
                    <span key={hw.id} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                      {hw.title}
                    </span>
                  ))}
                  {doneCount > 0 && (
                    <span className="text-xs text-slate-300 px-1">+완료 {doneCount}개</span>
                  )}
                </div>
              )}

              {/* 펼친 상태: 전체 목록 */}
              {isOpen && (
                <div className="flex flex-col gap-2">
                  {items.map(hw => (
                    <HomeworkItem key={hw.id} item={hw} onEdit={() => openEdit(hw)} />
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-20 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center active:scale-95 transition-transform z-30"
        aria-label="숙제 추가"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      <HomeworkFormModal isOpen={modalOpen} onClose={closeModal} editItem={editItem} />
    </div>
  )
}
