import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import HomeworkItem from './HomeworkItem'
import HomeworkFilter from './HomeworkFilter'
import HomeworkFormModal from './HomeworkFormModal'
import { groupHomeworksByDueDate, getDueDateLabel } from '../../data/homeworkData'
import { useHomework } from '../../context/HomeworkContext'

export default function BacklogTab() {
  const { homeworks, isCompleted, completedCount } = useHomework()
  const [filter, setFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [collapsed, setCollapsed] = useState({})

  const toggleCollapse = (key) =>
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  const openAdd  = () => { setEditItem(null); setModalOpen(true) }
  const openEdit = (item) => { setEditItem(item); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditItem(null) }

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

  const filtered = homeworks.filter(hw => {
    if (filter === 'done') return isCompleted(hw.id)
    if (filter === 'todo') return !isCompleted(hw.id)
    return true
  })

  // 기한 지난 미완료 → 오늘로 롤오버
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
      {/* 진행률 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-400">
          전체 {totalCount}개 중{' '}
          <span className="text-indigo-600 font-semibold">{completedCount}개</span> 완료
        </p>
        <button
          onClick={openAdd}
          className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl active:bg-indigo-100"
        >
          + 숙제 추가
        </button>
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
            <button onClick={openAdd} className="mt-2 text-sm text-indigo-500 font-semibold">
              + 숙제 추가하기
            </button>
          )}
        </div>
      ) : (
        Object.entries(groups).map(([dueDate, items]) => {
          const isToday   = dueDate === today
          const isWeekend = dueDate.startsWith('weekend:')
          const isOpen = isToday ? !(collapsed[dueDate] === true) : (collapsed[dueDate] === true)
          const doneCount = items.filter(hw => isCompleted(hw.id)).length

          return (
            <div key={dueDate} className="mb-3">
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
                <span className="text-xs text-slate-300">{doneCount}/{items.length}</span>
                <span className="ml-auto text-slate-300 group-hover:text-slate-400">
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              </button>

              {!isOpen && (
                <div onClick={() => toggleCollapse(dueDate)} className="flex flex-wrap gap-1.5 cursor-pointer px-1">
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

      <HomeworkFormModal isOpen={modalOpen} onClose={closeModal} editItem={editItem} />
    </div>
  )
}
