import { useState, useEffect } from 'react'
import { Trash2, CalendarClock, ChevronDown, ChevronUp } from 'lucide-react'
import Modal from '../common/Modal'
import { HW_SUBJECTS, PRIORITY, DIFFICULTY } from '../../data/homeworkData'
import { useHomework } from '../../context/HomeworkContext'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

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
  // AI 배분용 신규 필드
  status: 'backlog',
  difficulty: '중',
  estimated_minutes: 30,
  is_divisible: false,
  unit: null,
  total_units: null,
  linked_event: '',
}

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
        status: editItem.status ?? 'backlog',
        difficulty: editItem.difficulty ?? '중',
        estimated_minutes: editItem.estimated_minutes ?? 30,
        is_divisible: editItem.is_divisible ?? false,
        unit: editItem.unit ?? null,
        total_units: editItem.total_units ?? null,
        linked_event: editItem.linked_event ?? '',
      }
    }
    if (prefill) {
      return {
        ...EMPTY_FORM,
        subject: prefill.subject ?? EMPTY_FORM.subject,
        dueDate: prefill.dueDate ?? todayStr(),
        priority: 'high',
        linked_event: prefill.linked_event ?? '',
      }
    }
    return { ...EMPTY_FORM, dueDate: todayStr() }
  }

  const [form, setForm] = useState(buildInitial)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setForm(buildInitial())
      setShowAdvanced(false)
      setShowDeleteConfirm(false)
    }
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
      linked_event: form.linked_event.trim() || null,
      unit: form.is_divisible ? (Number(form.unit) || null) : null,
      total_units: form.is_divisible ? (Number(form.estimated_minutes) || null) : null,
      estimated_minutes: Number(form.estimated_minutes) || 30,
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

        {/* 마감일 + 중요도 */}
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

        {/* 난이도 + 소요시간 */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-600 mb-1">난이도 (AI 배분용)</label>
            <div className="flex gap-1.5">
              {Object.entries(DIFFICULTY).map(([key, d]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, difficulty: key }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all
                    ${form.difficulty === key
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-500'
                    }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-600 mb-1">총 소요시간(분)</label>
            <input
              type="number"
              min="5"
              step="5"
              value={form.estimated_minutes}
              onChange={e => setForm(p => ({ ...p, estimated_minutes: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        {/* 연결 학원 */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">
            연결 학원 <span className="text-slate-400 font-normal">(규칙 A·B: 전날 완료)</span>
          </label>
          <input
            type="text"
            value={form.linked_event}
            onChange={e => setForm(p => ({ ...p, linked_event: e.target.value }))}
            placeholder="예: 트윈클 픽션, 하윤네 수학"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* 고급 옵션 토글 */}
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-1.5 text-sm text-slate-400 font-medium w-fit"
        >
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          고급 옵션 (분할 배분·매일반복)
        </button>

        {showAdvanced && (
          <div className="flex flex-col gap-4 pl-1 border-l-2 border-slate-100">
            {/* 분할 가능 여부 */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setForm(p => ({ ...p, is_divisible: !p.is_divisible }))}
                className={`w-12 h-6 rounded-full transition-colors relative
                  ${form.is_divisible ? 'bg-indigo-500' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                  ${form.is_divisible ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </div>
              <div>
                <span className="text-sm font-medium text-slate-600">분할 배분 허용</span>
                <p className="text-xs text-slate-400">슬롯 부족 시 여러 날에 나눠서 배치 가능</p>
              </div>
            </label>

            {/* 분할 상세: 최소 단위만 입력 */}
            {form.is_divisible && (
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  최소 분할 단위 (분)
                  <span className="ml-1 font-normal text-slate-400">— 한 번에 최소 이 만큼 진행</span>
                </label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={form.unit ?? ''}
                  onChange={e => setForm(p => ({ ...p, unit: e.target.value, total_units: form.estimated_minutes }))}
                  placeholder="예: 40"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}

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
          </div>
        )}

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
