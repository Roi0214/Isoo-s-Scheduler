import { useState, useEffect } from 'react'
import { Trash2, CalendarClock } from 'lucide-react'
import Modal from '../common/Modal'
import { HW_SUBJECTS, PRIORITY } from '../../data/homeworkData'
import { useHomework } from '../../context/HomeworkContext'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// 일정 카테고리 → 숙제 과목 매핑
const CATEGORY_TO_SUBJECT = {
  school:   'korean',
  math:     'math',
  english:  'english',
  arts:     'etc',
  reading:  'reading',
  personal: 'etc',
}

const EMPTY_FORM = {
  title: '',
  subject: 'math',
  dueDate: todayStr(),
  priority: 'medium',
  memo: '',
  repeat: false,
}

/**
 * @param {object} prefill  - 일정 카드에서 자동 채워주는 값
 *   { subject, dueDate, sourceTitle }
 *   sourceTitle: "수학학원 전날 준비" 같은 컨텍스트 레이블
 */
export default function HomeworkFormModal({ isOpen, onClose, editItem = null, prefill = null }) {
  const { addHomework, updateHomework, deleteHomework } = useHomework()
  const isEdit = !!editItem

  const buildInitial = () => {
    if (editItem) {
      return {
        title: editItem.title,
        subject: editItem.subject,
        dueDate: editItem.dueDate,
        priority: editItem.priority,
        memo: editItem.memo ?? '',
        repeat: editItem.repeat,
      }
    }
    if (prefill) {
      return {
        ...EMPTY_FORM,
        subject: prefill.subject ?? EMPTY_FORM.subject,
        dueDate: prefill.dueDate ?? todayStr(),
        priority: 'high', // 전날 준비이므로 중요도 높게
      }
    }
    return { ...EMPTY_FORM, dueDate: todayStr() }
  }

  const [form, setForm] = useState(buildInitial)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // isOpen이 바뀔 때마다 폼 초기화 (prefill 포함)
  useEffect(() => {
    if (isOpen) setForm(buildInitial())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const resetAndClose = () => {
    setShowDeleteConfirm(false)
    onClose()
  }

  const handleSubmit = () => {
    if (!form.title.trim()) return alert('숙제 내용을 입력해 주세요.')
    if (!form.dueDate) return alert('마감일을 선택해 주세요.')

    const payload = {
      ...form,
      memo: form.memo.trim() || null,
      linkedScheduleTitle: prefill?.sourceTitle ?? editItem?.linkedScheduleTitle ?? null,
    }
    if (isEdit) {
      updateHomework(editItem.id, payload)
    } else {
      addHomework(payload)
    }
    resetAndClose()
  }

  const handleDelete = () => {
    deleteHomework(editItem.id)
    resetAndClose()
  }

  const modalTitle = isEdit ? '숙제 수정' : prefill ? '일정 숙제 추가' : '숙제 추가'

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title={modalTitle}>
      <div className="flex flex-col gap-4">

        {/* 일정에서 연결된 경우 컨텍스트 배너 */}
        {!isEdit && prefill?.sourceTitle && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
            <CalendarClock size={15} className="text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-700">{prefill.sourceTitle}</p>
              <p className="text-xs text-emerald-500">마감일이 전날로 자동 설정되었어요</p>
            </div>
          </div>
        )}

        {/* 제목 */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">숙제 내용 *</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="예: 수학 교과서 p.45 풀기"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* 과목 */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-2">과목</label>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(HW_SUBJECTS).map(([key, subj]) => (
              <button
                key={key}
                type="button"
                onClick={() => setForm(p => ({ ...p, subject: key }))}
                className={`py-2 rounded-xl text-sm font-medium border transition-all
                  ${form.subject === key
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-500'
                  }`}
              >
                {subj.label}
              </button>
            ))}
          </div>
        </div>

        {/* 마감일 + 우선순위 */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-600 mb-1">마감일 *</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-600 mb-1">중요도</label>
            <select
              value={form.priority}
              onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              {Object.entries(PRIORITY).map(([key, p]) => (
                <option key={key} value={key}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 매일 반복 */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setForm(p => ({ ...p, repeat: !p.repeat }))}
            className={`w-12 h-6 rounded-full transition-colors relative
              ${form.repeat ? 'bg-indigo-500' : 'bg-slate-200'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
              ${form.repeat ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm font-medium text-slate-600">매일 반복</span>
        </label>

        {/* 메모 */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">메모 (선택)</label>
          <textarea
            value={form.memo}
            onChange={e => setForm(p => ({ ...p, memo: e.target.value }))}
            placeholder="추가 설명을 입력하세요"
            rows={2}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          />
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSubmit}
          className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold text-base mt-2 active:bg-indigo-700"
        >
          {isEdit ? '수정 완료' : '숙제 추가'}
        </button>

        {/* 삭제 버튼 */}
        {isEdit && !showDeleteConfirm && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 text-red-400 py-2 text-sm font-medium"
          >
            <Trash2 size={14} /> 이 숙제 삭제
          </button>
        )}
        {isEdit && showDeleteConfirm && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <p className="text-sm text-red-600 font-medium mb-3">정말 삭제할까요?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium">취소</button>
              <button onClick={handleDelete} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold">삭제</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
