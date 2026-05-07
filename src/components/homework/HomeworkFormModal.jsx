import { useState, useEffect, useMemo } from 'react'
import { Trash2, CalendarClock, Wand2 } from 'lucide-react'
import Modal from '../common/Modal'
import { HW_SUBJECTS } from '../../data/homeworkData'
import { useHomework } from '../../context/HomeworkContext'
import { useSchedule } from '../../context/ScheduleContext'
import { findNextClassDate, prevDayStr } from '../../utils/scheduleUtils'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const EMPTY_FORM = {
  title: '',
  subject: 'math',
  dueDate: todayStr(),
  memo: '',
  repeat: false,
  status: 'backlog',
  estimated_minutes: 30,
  linked_event: '',
  fixed_d1: false,
}

export default function HomeworkFormModal({ isOpen, onClose, editItem = null, prefill = null }) {
  const { addHomework, updateHomework, deleteHomework } = useHomework()
  const { schedules } = useSchedule()
  const isEdit = !!editItem

  // 학원 선택지: mission·school 카테고리 제외, 중복 제거, 가나다 정렬
  const academyOptions = useMemo(() => {
    const seen = new Set()
    return schedules
      .filter(s => s.category !== 'mission' && s.category !== 'school')
      .map(s => s.title)
      .filter(t => { if (seen.has(t)) return false; seen.add(t); return true })
      .sort((a, b) => a.localeCompare(b, 'ko'))
  }, [schedules])

  // 자동 날짜: 편집 모드에선 기존 날짜 유지, 신규엔 자동 설정
  const [autoDateActive, setAutoDateActive] = useState(false)
  const [linkedEventWarning, setLinkedEventWarning] = useState(false)

  const buildInitial = () => {
    if (editItem) {
      return {
        title: editItem.title,
        subject: editItem.subject,
        dueDate: editItem.dueDate,
        memo: editItem.memo ?? '',
        repeat: editItem.repeat,
        status: editItem.status ?? 'backlog',
        estimated_minutes: editItem.estimated_minutes ?? 30,
        linked_event: editItem.linked_event ?? '',
        fixed_d1: editItem.fixed_d1 ?? false,
      }
    }
    if (prefill) {
      return {
        ...EMPTY_FORM,
        subject: prefill.subject ?? EMPTY_FORM.subject,
        dueDate: prefill.dueDate ?? todayStr(),
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
      setLinkedEventWarning(false)
      // 편집 시에는 날짜 자동설정 OFF, 신규 추가 시에는 ON
      setAutoDateActive(!isEdit)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // linked_event 변경 시 자동 날짜 설정 (autoDateActive일 때만)
  useEffect(() => {
    if (form.repeat || !autoDateActive) return
    const title = (form.linked_event === '__custom__' ? '' : form.linked_event)?.trim()
    if (!title) { setLinkedEventWarning(false); return }
    const nextClass = findNextClassDate(title, schedules)
    if (nextClass) {
      setForm(p => ({ ...p, dueDate: prevDayStr(nextClass) }))
      setLinkedEventWarning(false)
    } else {
      setLinkedEventWarning(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.linked_event, form.repeat, schedules, autoDateActive])

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
      linked_event: (form.linked_event === '__custom__' ? '' : form.linked_event).trim() || null,
      estimated_minutes: Number(form.estimated_minutes) || 30,
      // 삭제된 필드 기본값 유지 (기존 데이터 호환)
      priority: editItem?.priority ?? 'medium',
      difficulty: editItem?.difficulty ?? '중',
      is_divisible: editItem?.is_divisible ?? false,
      unit: editItem?.unit ?? null,
      total_units: editItem?.total_units ?? null,
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

        {/* 매일 반복 */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-slate-600">매일 반복</span>
            <p className="text-xs text-slate-400">연산·구몬 등 매일 하는 숙제</p>
          </div>
          <div
            onClick={() => setForm(p => ({ ...p, repeat: !p.repeat }))}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0
              ${form.repeat ? 'bg-indigo-500' : 'bg-slate-200'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
              ${form.repeat ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </div>
        </div>

        {/* 마감일 (repeat 모드엔 숨김) */}
        {!form.repeat && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-semibold text-slate-600">마감일 *</label>
                {autoDateActive && form.linked_event?.trim() && form.linked_event !== '__custom__' && (
                  <span className="flex items-center gap-0.5 text-xs text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md font-medium">
                    <Wand2 size={10} /> 자동
                  </span>
                )}
              </div>
              {/* 자동↔직접 전환 버튼 */}
              {form.linked_event?.trim() && form.linked_event !== '__custom__' && (
                <button
                  type="button"
                  onClick={() => setAutoDateActive(v => !v)}
                  className="text-xs text-slate-400 underline"
                >
                  {autoDateActive ? '직접 입력' : '자동 설정'}
                </button>
              )}
            </div>
            <input
              type="date"
              value={form.dueDate ?? ''}
              onChange={e => {
                setForm(p => ({ ...p, dueDate: e.target.value }))
                setAutoDateActive(false)
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {autoDateActive && form.linked_event?.trim() && form.linked_event !== '__custom__' && (
              <p className="text-xs text-indigo-400 mt-1">{form.linked_event} 수업 전날로 자동 설정</p>
            )}
          </div>
        )}

        {/* 연결 학원 + 전날 고정 */}
        <div className="flex flex-col gap-2">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">연결 학원</label>
            <select
              value={
                !form.linked_event?.trim() ? ''
                : academyOptions.includes(form.linked_event.trim()) ? form.linked_event.trim()
                : '__custom__'
              }
              onChange={e => {
                if (e.target.value === '__custom__') {
                  setForm(p => ({ ...p, linked_event: '__custom__' }))
                } else {
                  setForm(p => ({ ...p, linked_event: e.target.value, fixed_d1: false }))
                }
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="">선택 안 함</option>
              {academyOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
              <option value="__custom__">기타 (직접 입력)</option>
            </select>
            {/* 기타 선택 시 직접 입력 */}
            {(form.linked_event === '__custom__' ||
              (!academyOptions.includes(form.linked_event?.trim() ?? '') && form.linked_event?.trim())
            ) && (
              <input
                type="text"
                value={form.linked_event === '__custom__' ? '' : form.linked_event}
                onChange={e => setForm(p => ({ ...p, linked_event: e.target.value }))}
                placeholder="학원 이름 직접 입력"
                autoFocus
                className="mt-2 w-full border border-indigo-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            )}
          </div>
          {linkedEventWarning && (
            <p className="text-xs text-amber-500 bg-amber-50 rounded-xl px-3 py-2 mt-1">
              ⚠ 등록된 학원 일정을 찾을 수 없어요. 마감일이 자동 설정되지 않습니다.<br />
              <span className="text-amber-400">일정 탭에서 학원 이름을 확인해 주세요.</span>
            </p>
          )}
          {form.linked_event?.trim() && form.linked_event !== '__custom__' && (
            <div className="flex items-center justify-between pl-1">
              <div>
                <span className="text-sm font-medium text-slate-600">전날 고정 (D-1)</span>
                <p className="text-xs text-slate-400">단어 암기 등 반드시 수업 전날에만</p>
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

        {/* 소요시간 */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">소요시간 (분)</label>
          <input
            type="number"
            min="5"
            step="5"
            value={form.estimated_minutes}
            onChange={e => setForm(p => ({ ...p, estimated_minutes: e.target.value }))}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
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
