import { useState } from 'react'
import { X } from 'lucide-react'
import { DEFAULT_SLOT_SETTINGS, saveSlotSettings } from '../../data/slotSettings'

const FIELDS = [
  { key: 'weekdaySlotStart', label: '평일 공부 시작', desc: '학교 수업 후 공부 가능 시각' },
  { key: 'weekendSlotStart', label: '주말 공부 시작', desc: '주말·공휴일 공부 시작 시각' },
  { key: 'hardDeadline',     label: '취침 시간',      desc: '이 시각 이후는 절대 배치 안 함' },
  { key: 'dinnerStart',      label: '저녁 식사 시작', desc: null },
  { key: 'dinnerEnd',        label: '저녁 식사 종료', desc: null },
]

export default function SlotSettingsModal({ isOpen, onClose, settings, onSave }) {
  const [form, setForm] = useState(settings)

  if (!isOpen) return null

  const handleSave = () => {
    saveSlotSettings(form)
    onSave(form)
    onClose()
  }

  const handleReset = () => {
    const defaults = { ...DEFAULT_SLOT_SETTINGS }
    setForm(defaults)
    saveSlotSettings(defaults)
    onSave(defaults)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-3xl p-5 pb-safe"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-slate-700">슬롯 설정</h3>
          <button onClick={onClose}>
            <X size={18} className="text-slate-400" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          실제 일과에 맞게 조정하면 배분 정확도가 높아집니다.
        </p>

        <div className="divide-y divide-slate-100">
          {FIELDS.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-slate-700">{label}</p>
                {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
              </div>
              <input
                type="time"
                value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm text-center
                           focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white w-28"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          className="mt-5 w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold text-sm active:bg-indigo-700"
        >
          저장
        </button>
        <button
          onClick={handleReset}
          className="mt-2 w-full text-xs text-slate-400 py-1.5 text-center"
        >
          기본값으로 초기화
        </button>
      </div>
    </div>
  )
}
