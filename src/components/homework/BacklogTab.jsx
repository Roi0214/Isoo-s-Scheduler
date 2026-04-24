import { useState } from 'react'
import { ChevronDown, ChevronRight, School, BookOpen } from 'lucide-react'
import HomeworkItem from './HomeworkItem'
import HomeworkFilter from './HomeworkFilter'
import HomeworkFormModal from './HomeworkFormModal'
import { HW_SUBJECTS } from '../../data/homeworkData'
import { useHomework } from '../../context/HomeworkContext'

const FREE_KEY = '__free__'

/**
 * linked_event(학원명) 기준으로 숙제를 그룹화
 * linked_event가 없으면 '__free__' 그룹으로 묶음
 */
function groupByAcademy(homeworks) {
  const groups = {}
  for (const hw of homeworks) {
    const key = hw.linked_event?.trim() || FREE_KEY
    if (!groups[key]) groups[key] = []
    groups[key].push(hw)
  }
  return groups
}

/**
 * 그룹 키를 정렬: 학원명 그룹 먼저(가나다순), 자율학습 마지막
 */
function sortedGroupKeys(groups) {
  return Object.keys(groups).sort((a, b) => {
    if (a === FREE_KEY) return 1
    if (b === FREE_KEY) return -1
    return a.localeCompare(b, 'ko')
  })
}

/**
 * 그룹 내 주요 과목 색상 (첫 번째 항목 기준)
 */
function groupAccentColor(items) {
  const subj = items[0]?.subject
  const map = {
    math:    'bg-orange-100 text-orange-700 border-orange-200',
    english: 'bg-green-100 text-green-700 border-green-200',
    science: 'bg-teal-100 text-teal-700 border-teal-200',
    korean:  'bg-blue-100 text-blue-700 border-blue-200',
    mission: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    reading: 'bg-purple-100 text-purple-700 border-purple-200',
  }
  return map[subj] ?? 'bg-slate-100 text-slate-600 border-slate-200'
}

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

  const filtered = homeworks.filter(hw => {
    if (filter === 'done') return isCompleted(hw.id)
    if (filter === 'todo') return !isCompleted(hw.id)
    return true
  })

  const groups   = groupByAcademy(filtered)
  const keys     = sortedGroupKeys(groups)
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

      {keys.length === 0 ? (
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
        keys.map(key => {
          const items    = groups[key]
          const isFree   = key === FREE_KEY
          const label    = isFree ? '자율 학습' : key
          const accent   = groupAccentColor(items)
          const doneCount = items.filter(hw => isCompleted(hw.id)).length
          const isOpen   = collapsed[key] !== true   // 기본 펼침

          return (
            <div key={key} className="mb-5">
              {/* 그룹 헤더 */}
              <button
                onClick={() => toggleCollapse(key)}
                className="w-full flex items-center gap-2 mb-2.5 group"
              >
                {/* 학원 아이콘 + 배지 */}
                <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl border ${accent}`}>
                  {isFree
                    ? <BookOpen size={12} />
                    : <School size={12} />
                  }
                  {label}
                </span>

                {/* 완료 카운트 */}
                <span className="text-xs text-slate-300 font-medium">
                  {doneCount}/{items.length}
                </span>

                {/* 완료율 미니바 */}
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden mx-1">
                  <div
                    className="h-full bg-indigo-300 rounded-full transition-all duration-300"
                    style={{ width: `${items.length === 0 ? 0 : (doneCount / items.length) * 100}%` }}
                  />
                </div>

                {/* 토글 아이콘 */}
                <span className="text-slate-300 group-hover:text-slate-400 transition-colors flex-shrink-0">
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              </button>

              {/* 접힌 상태: 미완료 제목 칩 미리보기 */}
              {!isOpen && (
                <div
                  onClick={() => toggleCollapse(key)}
                  className="flex flex-wrap gap-1.5 cursor-pointer px-1 mb-1"
                >
                  {items.filter(hw => !isCompleted(hw.id)).map(hw => (
                    <span
                      key={hw.id}
                      className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full truncate max-w-[140px]"
                    >
                      {hw.title}
                    </span>
                  ))}
                  {doneCount > 0 && (
                    <span className="text-xs text-slate-300 px-1">+완료 {doneCount}개</span>
                  )}
                </div>
              )}

              {/* 펼친 상태: 숙제 카드 목록 */}
              {isOpen && (
                <div className="flex flex-col gap-2">
                  {items.map(hw => (
                    <HomeworkItem
                      key={hw.id}
                      item={hw}
                      onEdit={() => openEdit(hw)}
                      showDueDate
                    />
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
