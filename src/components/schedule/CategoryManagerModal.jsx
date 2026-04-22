import { useState } from 'react'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import Modal from '../common/Modal'
import { COLOR_PRESETS } from '../../data/scheduleData'
import { useSchedule } from '../../context/ScheduleContext'

function CategoryForm({ initial, onSave, onCancel }) {
  const [label, setLabel]     = useState(initial?.label ?? '')
  const [colorKey, setColorKey] = useState(initial?.colorKey ?? 'slate')

  const handleSave = () => {
    if (!label.trim()) return alert('분류 이름을 입력해 주세요.')
    onSave(label.trim(), colorKey)
  }

  return (
    <div className="flex flex-col gap-3 bg-slate-50 rounded-2xl p-4 mt-2">
      <input
        type="text"
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder="분류 이름 (예: 태권도)"
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        autoFocus
      />

      {/* 색상 선택 */}
      <div>
        <p className="text-xs text-slate-400 font-medium mb-2">색상 선택</p>
        <div className="grid grid-cols-6 gap-2">
          {COLOR_PRESETS.map(preset => (
            <button
              key={preset.key}
              type="button"
              onClick={() => setColorKey(preset.key)}
              className={`w-full aspect-square rounded-full border-2 transition-all flex items-center justify-center
                ${colorKey === preset.key ? 'border-slate-700 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: preset.blockBg, boxShadow: `inset 0 0 0 3px ${preset.blockBorder}` }}
              title={preset.label}
            >
              {colorKey === preset.key && (
                <Check size={12} style={{ color: preset.blockBorder }} strokeWidth={3} />
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          선택: <span className="font-medium text-slate-600">
            {COLOR_PRESETS.find(p => p.key === colorKey)?.label}
          </span>
        </p>
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 rounded-xl bg-slate-200 text-slate-600 text-sm font-medium">취소</button>
        <button onClick={handleSave}  className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold">저장</button>
      </div>
    </div>
  )
}

export default function CategoryManagerModal({ isOpen, onClose }) {
  const { categories, categoryMap, addCategory, updateCategory, deleteCategory, schedules } = useSchedule()
  const [editingId, setEditingId]   = useState(null)  // 수정 중인 분류 id
  const [addingNew, setAddingNew]   = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  const handleAdd = (label, colorKey) => {
    const id = `cat-${Date.now()}`
    addCategory(id, label, colorKey)
    setAddingNew(false)
  }

  const handleUpdate = (id, label, colorKey) => {
    updateCategory(id, label, colorKey)
    setEditingId(null)
  }

  const handleDeleteRequest = (id) => {
    const inUse = schedules.some(s => s.category === id)
    if (inUse) {
      alert('이 분류를 사용하는 일정이 있어서 삭제할 수 없어요.\n먼저 해당 일정의 분류를 변경해 주세요.')
      return
    }
    setDeleteConfirmId(id)
  }

  const handleDeleteConfirm = (id) => {
    deleteCategory(id)
    setDeleteConfirmId(null)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="분류 관리">
      <div className="flex flex-col gap-2">

        {/* 분류 목록 */}
        {Object.entries(categoryMap).map(([id, cat]) => {
          const built = categories[id]
          if (!built) return null

          if (editingId === id) {
            return (
              <div key={id}>
                <CategoryForm
                  initial={cat}
                  onSave={(label, colorKey) => handleUpdate(id, label, colorKey)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            )
          }

          if (deleteConfirmId === id) {
            return (
              <div key={id} className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center justify-between gap-2">
                <p className="text-sm text-red-600 font-medium">"{cat.label}" 삭제할까요?</p>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-medium">취소</button>
                  <button onClick={() => handleDeleteConfirm(id)} className="px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-bold">삭제</button>
                </div>
              </div>
            )
          }

          return (
            <div key={id} className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3">
              {/* 색상 점 */}
              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${built.dot}`} />

              {/* 분류 이름 + 뱃지 */}
              <div className="flex-1 flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">{cat.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${built.color}`}>미리보기</span>
              </div>

              {/* 수정 / 삭제 */}
              <button
                onClick={() => { setEditingId(id); setAddingNew(false) }}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-indigo-50 text-slate-400 hover:text-indigo-500 transition-colors"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => handleDeleteRequest(id)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 text-slate-400 hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )
        })}

        {/* 새 분류 추가 폼 */}
        {addingNew ? (
          <CategoryForm
            onSave={handleAdd}
            onCancel={() => setAddingNew(false)}
          />
        ) : (
          <button
            onClick={() => { setAddingNew(true); setEditingId(null) }}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-500 font-medium text-sm hover:bg-indigo-50 transition-colors mt-1"
          >
            <Plus size={16} /> 새 분류 추가
          </button>
        )}
      </div>
    </Modal>
  )
}
