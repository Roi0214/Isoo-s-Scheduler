import { useState } from 'react'
import { ChevronDown, ChevronRight, School, BookOpen, Pencil, Plus, Scissors } from 'lucide-react'
import HomeworkFormModal from './HomeworkFormModal'
import { HW_SUBJECTS, getDueDateLabel } from '../../data/homeworkData'
import { useHomework } from '../../context/HomeworkContext'

const FREE_KEY = '__free__'

function groupByAcademy(homeworks) {
  const groups = {}
  for (const hw of homeworks) {
    const key = hw.linked_event?.trim() || FREE_KEY
    if (!groups[key]) groups[key] = []
    groups[key].push(hw)
  }
  return groups
}

function sortedGroupKeys(groups) {
  return Object.keys(groups).sort((a, b) => {
    if (a === FREE_KEY) return 1
    if (b === FREE_KEY) return -1
    return a.localeCompare(b, 'ko')
  })
}

const SUBJECT_ACCENT = {
  math:    'bg-orange-50 border-orange-200 text-orange-600',
  english: 'bg-green-50 border-green-200 text-green-600',
  science: 'bg-teal-50 border-teal-200 text-teal-600',
  korean:  'bg-blue-50 border-blue-200 text-blue-600',
  mission: 'bg-yellow-50 border-yellow-200 text-yellow-600',
  reading: 'bg-purple-50 border-purple-200 text-purple-600',
  etc:     'bg-slate-50 border-slate-200 text-slate-500',
}

function groupHeaderColor(items) {
  const subj = items[0]?.subject
  return SUBJECT_ACCENT[subj] ?? SUBJECT_ACCENT.etc
}

/** 단일 숙제 row — 컴팩트 인벤토리 스타일 */
function BacklogItem({ item, onEdit }) {
  const subj = HW_SUBJECTS[item.subject] ?? HW_SUBJECTS.etc

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
      {/* 과목 배지 */}
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${subj.color}`}>
        {subj.label}
      </span>

      {/* 제목 */}
      <span className="flex-1 text-sm font-medium text-slate-700 truncate">
        {item.title}
      </span>

      {/* 소요시간 */}
      {item.estimated_minutes && (
        <span className="text-xs text-slate-300 flex-shrink-0 hidden sm:block">
          {item.estimated_minutes}분
        </span>
      )}

      {/* 분할 가능 배지 */}
      {item.is_divisible && item.unit ? (
        <span className="flex items-center gap-0.5 text-xs text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded-md flex-shrink-0">
          <Scissors size={10} />
          {item.unit}분
        </span>
      ) : (
        <span className="text-xs text-slate-200 flex-shrink-0 hidden sm:block">통합</span>
      )}

      {/* 편집 버튼 */}
      <button
        onClick={onEdit}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-slate-300 hover:text-indigo-400 hover:bg-indigo-50 transition-colors"
        aria-label="편집"
      >
        <Pencil size={12} />
      </button>
    </div>
  )
}

export default function BacklogTab() {
  const { homeworks } = useHomework()
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem]   = useState(null)
  const [collapsed, setCollapsed] = useState({})

  const toggleCollapse = (key) =>
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  const openAdd  = (linkedEvent) => {
    setEditItem(null)
    setModalOpen({ linkedEvent: linkedEvent !== FREE_KEY ? linkedEvent : null })
  }
  const openEdit = (item) => { setEditItem(item); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditItem(null) }

  const groups = groupByAcademy(homeworks)
  const keys   = sortedGroupKeys(groups)

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">
          총 <span className="font-semibold text-slate-600">{homeworks.length}개</span> 숙제
        </p>
        <button
          onClick={() => openAdd(FREE_KEY)}
          className="flex items-center gap-1 text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl active:bg-indigo-100"
        >
          <Plus size={14} /> 숙제 추가
        </button>
      </div>

      {keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400">
          <span className="text-4xl">📋</span>
          <p className="text-sm font-medium">등록된 숙제가 없어요</p>
          <button
            onClick={() => openAdd(FREE_KEY)}
            className="mt-1 text-sm text-indigo-500 font-semibold"
          >
            + 첫 숙제 추가하기
          </button>
        </div>
      ) : (
        keys.map(key => {
          const items  = groups[key]
          const isFree = key === FREE_KEY
          const label  = isFree ? '자율 학습' : key
          const accent = groupHeaderColor(items)
          const isOpen = collapsed[key] !== true   // 기본 펼침

          return (
            <div key={key} className="mb-5">
              {/* 그룹 헤더 */}
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => toggleCollapse(key)}
                  className="flex items-center gap-1.5 group"
                >
                  <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl border ${accent}`}>
                    {isFree ? <BookOpen size={11} /> : <School size={11} />}
                    {label}
                  </span>
                  <span className="text-xs text-slate-300">{items.length}개</span>
                  <span className="text-slate-300 group-hover:text-slate-400 transition-colors">
                    {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </span>
                </button>

                {/* 그룹 내 빠른 추가 */}
                <button
                  onClick={() => openAdd(key)}
                  className="ml-auto text-xs text-slate-300 hover:text-indigo-400 transition-colors flex items-center gap-0.5"
                  aria-label={`${label}에 숙제 추가`}
                >
                  <Plus size={12} /> 추가
                </button>
              </div>

              {/* 숙제 목록 */}
              {isOpen && (
                <div className="flex flex-col gap-1.5">
                  {items.map(hw => (
                    <BacklogItem key={hw.id} item={hw} onEdit={() => openEdit(hw)} />
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}

      <HomeworkFormModal
        isOpen={!!modalOpen}
        onClose={closeModal}
        editItem={editItem}
        prefill={modalOpen && !editItem ? {
          sourceTitle: null,
          subject: 'math',
          linked_event: modalOpen.linkedEvent ?? null,
        } : null}
      />
    </div>
  )
}
