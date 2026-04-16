import { useState } from 'react'
import { Pencil, Clock, CalendarDays } from 'lucide-react'
import Modal from '../common/Modal'
import ScheduleFormModal from '../schedule/ScheduleFormModal'
import { CATEGORIES } from '../../data/scheduleData'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

const BLOCK_COLORS = {
  school:   { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },
  math:     { bg: '#ffedd5', border: '#f97316', text: '#c2410c' },
  english:  { bg: '#dcfce7', border: '#22c55e', text: '#15803d' },
  arts:     { bg: '#fce7f3', border: '#ec4899', text: '#be185d' },
  reading:  { bg: '#f3e8ff', border: '#a855f7', text: '#7e22ce' },
  personal: { bg: '#f1f5f9', border: '#94a3b8', text: '#475569' },
}

export default function ScheduleDetailModal({ isOpen, onClose, schedule }) {
  const [editOpen, setEditOpen] = useState(false)

  if (!schedule) return null

  const cat    = CATEGORIES[schedule.category] ?? CATEGORIES.personal
  const colors = BLOCK_COLORS[schedule.category] ?? BLOCK_COLORS.personal

  // 분 계산 → "N시간 M분" 표시
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const duration = toMin(schedule.endTime) - toMin(schedule.startTime)
  const durationLabel = duration >= 60
    ? `${Math.floor(duration / 60)}시간${duration % 60 > 0 ? ` ${duration % 60}분` : ''}`
    : `${duration}분`

  const handleEditClose = () => {
    setEditOpen(false)
    onClose() // 수정 완료 후 상세 모달도 닫기
  }

  return (
    <>
      <Modal isOpen={isOpen && !editOpen} onClose={onClose} title="일정 상세">
        <div className="flex flex-col gap-5">

          {/* 일정 타이틀 카드 */}
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ backgroundColor: colors.bg, borderLeft: `4px solid ${colors.border}` }}
          >
            <div className="flex-1">
              <p className="text-xl font-extrabold" style={{ color: colors.text }}>
                {schedule.title}
              </p>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${cat.color}`}>
                {cat.label}
              </span>
            </div>
          </div>

          {/* 상세 정보 */}
          <div className="flex flex-col gap-3">

            {/* 시간 */}
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
              <Clock size={16} className="text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium">시간</p>
                <p className="text-base font-bold text-slate-700">
                  {schedule.startTime} ~ {schedule.endTime}
                  <span className="ml-2 text-sm font-normal text-slate-400">({durationLabel})</span>
                </p>
              </div>
            </div>

            {/* 반복 요일 */}
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
              <CalendarDays size={16} className="text-slate-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-slate-400 font-medium mb-2">반복 요일</p>
                <div className="flex gap-1.5">
                  {DAY_LABELS.map((label, idx) => {
                    const active = schedule.days.includes(idx)
                    return (
                      <span
                        key={idx}
                        className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold
                          ${active
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 text-slate-400'
                          }`}
                      >
                        {label}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 수정 버튼 */}
          <button
            onClick={() => setEditOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 rounded-2xl font-bold text-base active:bg-indigo-700"
          >
            <Pencil size={16} />
            이 일정 수정하기
          </button>
        </div>
      </Modal>

      {/* 수정 모달 — 상세 모달 위에 겹쳐 열림 */}
      <ScheduleFormModal
        isOpen={editOpen}
        onClose={handleEditClose}
        editItem={schedule}
      />
    </>
  )
}
