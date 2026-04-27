import { useState, useEffect } from 'react'
import { Trash2, CalendarClock, Scissors, Wand2 } from 'lucide-react'
import Modal from '../common/Modal'
import { HW_SUBJECTS, PRIORITY, DIFFICULTY } from '../../data/homeworkData'
import { useHomework } from '../../context/HomeworkContext'
import { useAISchedule } from '../../context/AIScheduleContext'
import { useSchedule } from '../../context/ScheduleContext'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

/** 학원 이름에 해당하는 다음 수업일 반환 (최대 14일 탐색) */
function findNextClassDate(eventTitle, schedules) {
  if (!eventTitle?.trim()) return null
  // 공백 기준으로 쪼갠 토큰 전부가 일정 제목 토큰과 정확히 일치해야 매칭
  // ex) "픽션" → "트윈클 픽션" 매칭 O, "트윈클 논픽션" 매칭 X ("논픽션" ≠ "픽션")
  const kwTokens = eventTitle.trim().toLowerCase().split(/\s+/)
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dow = d.getDay()
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    for (const s of schedules) {
      const titleTokens = s.title.toLowerCase().split(/\s+/)
      // 모든 키워드 토큰이 제목 토큰 중 하나와 정확히 일치해야 함
      if (!kwTokens.every(kw => titleTokens.some(t => t === kw))) continue
      if (!s.days.includes(dow)) continue
      if (s.exceptions?.includes(dateStr)) continue
      if (s.effectiveFrom && dateStr < s.effectiveFrom) continue
      if (s.effectiveTo && dateStr > s.effectiveTo) continue
      return dateStr
    }
  }
  return null
}

function prevDayStr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - 1)
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
  fixed_d1: false,
}

export default function HomeworkFormModal({ isOpen, onClose, editItem = null, prefill = null }) {
  const { addHomework, updateHomework, deleteHomework } = useHomework()
  const { removeBlocksByHomeworkId, syncUpdatedHomework } = useAISchedule()
  const { schedules } = useSchedule()
  const isEdit = !!editItem
  const [autoDateLabel, setAutoDateLabel] = useState(null) // 자동 설정된 학원 이름

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
        fixed_d1: editItem.fixed_d1 ?? false,
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

  useEffect(() => {
    if (isOpen) {
      setForm(buildInitial())
      setShowDeleteConfirm(false)
      setAutoDateLabel(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // linked_event 변경 시 다음 수업일 D-1을 dueDate로 자동 설정
  useEffect(() => {
    if (form.repeat) return                          // repeat 모드엔 dueDate 불필요
    const title = form.linked_event?.trim()
    if (!title) { setAutoDateLabel(null); return }
    const nextClass = findNextClassDate(title, schedules)
    if (nextClass) {
      const due = prevDayStr(nextClass)
      setForm(p => ({ ...p, dueDate: due }))
      setAutoDateLabel(title)
    } else {
      setAutoDateLabel(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.linked_event, form.repeat, schedules])

  const resetAndClose = () => {
    setShowDeleteConfirm(false)
    onClose()
  }

  const handleSubmit = () => {
    if (!form.title.trim()) return alert('숙제 내용을 입력해 주세요.')
    if (!form.repeat && !form.dueDate) return alert('마감일을 선택해 주세요.')

    const payload = {
      ...form,
      dueDate: form.repeat ? null : form.dueDate,
      memo: form.memo.trim() || null,
      linkedScheduleTitle: prefill?.sourceTitle ?? editItem?.linkedScheduleTitle ?? null,
      linked_event: form.linked_event.trim() || null,
      unit: form.is_divisible ? (Number(form.unit) || null) : null,
      total_units: form.is_divisible ? (Number(form.estimated_minutes) || null) : null,
      estimated_minutes: Number(form.estimated_minutes) || 30,
    }
    if (isEdit) {
      updateHomework(editItem.id, payload)
      syncUpdatedHomework({ id: editItem.id, title: payload.title, subject: payload.subject })
    } else {
      addHomework(payload)
    }
    resetAndClose()
  }

  const handleDelete = () => {
    removeBlocksByHomeworkId(editItem.id)
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

        {/* 마감일 + 중요도 (repeat 모드엔 마감일 숨김) */}
        <div className="flex gap-3">
          {!form.repeat && (
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <label className="text-sm font-semibold text-slate-600">마감일 *</label>
                {autoDateLabel && (
                  <span className="flex items-center gap-0.5 text-xs text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md font-medium">
                    <Wand2 size={10} /> 자동
                  </span>
                )}
              </div>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => { setForm(p => ({ ...p, dueDate: e.target.value })); setAutoDateLabel(null) }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {autoDateLabel && (
                <p className="text-xs text-indigo-400 mt-1">{autoDateLabel} 수업 전날로 자동 설정</p>
              )}
            </div>
          )}
          <div className={form.repeat ? 'w-full' : 'flex-1'}>
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
            {form.repeat && (
              <p className="text-xs text-slate-400 mt-1">여유이면 바쁜 날은 배분에서 제외될 수 있어요</p>
            )}
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

        {/* 연결 학원 + 전날 고정 */}
        <div className="flex flex-col gap-2">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">연결 학원</label>
            <input
              type="text"
              value={form.linked_event}
              onChange={e => setForm(p => ({ ...p, linked_event: e.target.value }))}
              placeholder="예: 트윈클, 하윤네 수학"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          {form.linked_event?.trim() && (
            <div className="flex items-center justify-between pl-1">
              <div>
                <span className="text-sm font-medium text-slate-600">전날 고정 (D-1)</span>
                <p className="text-xs text-slate-400">단어 암기 등 반드시 수업 전날에만 배치</p>
              </div>
              <div
                onClick={() => setForm(p => ({ ...p, fixed_d1: !p.fixed_d1 }))}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0
                  ${form.fixed_d1 ? 'bg-rose-500' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                  ${form.fixed_d1 ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </div>
            </div>
          )}
        </div>

        {/* 분할 배분 설정 (기본 노출) */}
        <div className="bg-slate-50 rounded-2xl p-3 flex flex-col gap-3">
          <p className="text-xs font-bold text-slate-500">AI 배분 옵션</p>

          {/* 매일 반복 */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-slate-600">매일 반복</span>
              <p className="text-xs text-slate-400">연산·구몬 등 매일 하는 숙제</p>
            </div>
            <div
              onClick={() => setForm(p => ({ ...p, repeat: !p.repeat, is_divisible: false, unit: null }))}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0
                ${form.repeat ? 'bg-indigo-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                ${form.repeat ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </div>
          </div>

          {/* 분할 배분 — 매일 반복이면 숨김 */}
          {!form.repeat && (
            <>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <Scissors size={14} className="text-slate-400" />
                  <div>
                    <span className="text-sm font-medium text-slate-600">분할 배분 가능</span>
                    <p className="text-xs text-slate-400">슬롯 부족 시 여러 날에 나눠서 배치</p>
                  </div>
                </div>
                <div
                  onClick={() => setForm(p => ({ ...p, is_divisible: !p.is_divisible, unit: null }))}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0
                    ${form.is_divisible ? 'bg-indigo-500' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                    ${form.is_divisible ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </div>
              </div>

              {form.is_divisible && (
                <div className="flex items-center gap-3 pl-6">
                  <label className="text-xs text-slate-500 flex-shrink-0">1회 최소</label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={form.unit ?? ''}
                    onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                    placeholder="예: 40"
                    className="w-24 border border-slate-200 rounded-xl px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  />
                  <label className="text-xs text-slate-500">분 단위로 분할</label>
                </div>
              )}
            </>
          )}
        </div>

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
