import { useState, useEffect } from 'react'
import { Trash2, Settings2 } from 'lucide-react'
import Modal from '../common/Modal'
import { useSchedule } from '../../context/ScheduleContext'
import CategoryManagerModal from './CategoryManagerModal'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

const EMPTY_FORM = {
  title: '',
  startTime: '15:00',
  endTime: '16:00',
  days: [1, 2, 3, 4, 5],
  category: 'personal',
}

export default function ScheduleFormModal({ isOpen, onClose, editItem = null, applyDate = null }) {
  const { addSchedule, updateSchedule, scheduleChangeFrom, deleteSchedule, deleteScheduleFrom, categories } = useSchedule()
  const [catManagerOpen, setCatManagerOpen] = useState(false)
  const isEdit = !!editItem

  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [fromMode, setFromMode] = useState('immediate')  // 'immediate' | 'date'
  const [fromDate, setFromDate] = useState('')

  // 모달이 열릴 때마다 editItem으로 폼 채우기
  useEffect(() => {
    if (isOpen) {
      setShowDeleteConfirm(false)
      setFromMode('immediate')
      setFromDate('')
      setForm(editItem
        ? { title: editItem.title, startTime: editItem.startTime, endTime: editItem.endTime, days: [...editItem.days], category: editItem.category }
        : { ...EMPTY_FORM }
      )
    }
  }, [isOpen, editItem])

  const resetAndClose = () => {
    setForm({ ...EMPTY_FORM })
    setShowDeleteConfirm(false)
    setFromMode('immediate')
    setFromDate('')
    onClose()
  }

  const toggleDay = (day) => {
    setForm(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day].sort(),
    }))
  }

  const handleSubmit = () => {
    if (!form.title.trim()) return alert('일정 이름을 입력해 주세요.')
    if (form.days.length === 0) return alert('요일을 하나 이상 선택해 주세요.')
    if (form.startTime >= form.endTime) return alert('종료 시간이 시작 시간보다 늦어야 해요.')

    if (isEdit) {
      if (fromMode === 'date') {
        if (!fromDate) return alert('변경 시작일을 선택해 주세요.')
        scheduleChangeFrom(editItem.id, fromDate, form)
      } else {
        // 즉시 적용: 현재 보고 있는 날짜부터 분기
        scheduleChangeFrom(editItem.id, applyDate ?? todayStr, form)
      }
    } else {
      addSchedule(form)
    }
    resetAndClose()
  }

  const handleDelete = () => {
    if (fromMode === 'date') {
      if (!fromDate) return alert('삭제 시작일을 선택해 주세요.')
      deleteScheduleFrom(editItem.id, fromDate)
    } else {
      deleteScheduleFrom(editItem.id, applyDate ?? todayStr)
    }
    resetAndClose()
  }

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <>
    <Modal isOpen={isOpen} onClose={resetAndClose} title={isEdit ? '일정 수정' : '일정 추가'}>
      <div className="flex flex-col gap-4">

        {/* 제목 */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">일정 이름 *</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="예: 수학학원"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* 시간 */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-600 mb-1">시작 시간 *</label>
            <input
              type="time"
              value={form.startTime}
              onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-600 mb-1">종료 시간 *</label>
            <input
              type="time"
              value={form.endTime}
              onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        {/* 반복 요일 */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-2">반복 요일 *</label>
          <div className="flex gap-2 justify-between">
            {DAY_LABELS.map((label, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleDay(idx)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all
                  ${form.days.includes(idx)
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 카테고리 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-slate-600">분류</label>
            <button
              type="button"
              onClick={() => setCatManagerOpen(true)}
              className="flex items-center gap-1 text-xs text-indigo-500 font-medium hover:text-indigo-700"
            >
              <Settings2 size={12} /> 분류 관리
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(categories).map(([key, cat]) => (
              <button
                key={key}
                type="button"
                onClick={() => setForm(p => ({ ...p, category: key }))}
                className={`py-2 rounded-xl text-sm font-medium border transition-all
                  ${form.category === key
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 변경 적용 방식 (수정 모드만) */}
        {isEdit && (
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">변경 적용</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFromMode('immediate')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all
                  ${fromMode === 'immediate'
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-500'}`}
              >
                즉시 적용
              </button>
              <button
                type="button"
                onClick={() => setFromMode('date')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all
                  ${fromMode === 'date'
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-500'}`}
              >
                날짜 지정
              </button>
            </div>
            {fromMode === 'date' && (
              <div className="mt-2">
                <input
                  type="date"
                  value={fromDate}
                  min={todayStr}
                  onChange={e => setFromDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {fromDate && (
                  <p className="mt-1.5 text-xs text-indigo-500 font-medium">
                    ※ 이전 시간표는 {fromDate} 전날까지 유지됩니다
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 저장 버튼 */}
        <button
          onClick={handleSubmit}
          className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold text-base mt-2 active:bg-indigo-700"
        >
          {isEdit ? '수정 완료' : '일정 추가'}
        </button>

        {/* 삭제 버튼 (수정 모드) */}
        {isEdit && !showDeleteConfirm && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 text-red-400 py-2 text-sm font-medium"
          >
            <Trash2 size={14} /> 이 일정 삭제
          </button>
        )}
        {isEdit && showDeleteConfirm && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <p className="text-sm text-red-600 font-medium mb-1">정말 삭제할까요?</p>
            <p className="text-xs text-red-400 mb-3">
              {fromMode === 'date' && fromDate
                ? `${fromDate} 이후 일정이 삭제됩니다`
                : `${applyDate ?? todayStr} 이후 일정이 삭제됩니다`}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium">취소</button>
              <button onClick={handleDelete} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold">삭제</button>
            </div>
          </div>
        )}
      </div>
    </Modal>

    <CategoryManagerModal
      isOpen={catManagerOpen}
      onClose={() => setCatManagerOpen(false)}
    />
    </>
  )
}
