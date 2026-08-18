import { useState, useEffect } from 'react'
import { X, Plus, CalendarClock } from 'lucide-react'
import WeeklyTimetable from '../weekly/WeeklyTimetable'
import NextTermItemModal from './NextTermItemModal'
import { getWeekDates, shiftWeek, localDateStr } from '../../utils/weekUtils'
import { useSchedule } from '../../context/ScheduleContext'

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return localDateStr(d)
}

// dateStr을 포함하는 주(월~금)를 반환하되, 그 주의 금요일이 dateStr보다 이르면
// (dateStr이 주말인 경우) 다음 주로 넘겨 평일 전체가 dateStr 이후가 되도록 함
function weekOnOrAfter(dateStr) {
  let week = getWeekDates(new Date(dateStr + 'T00:00:00'))
  if (localDateStr(week[4]) < dateStr) {
    week = shiftWeek(week, 1)
  }
  return week
}

// 현재 시간표를 기반으로 자유롭게 편집한 뒤, 특정 날짜부터 일괄 적용하는 전체화면 오버레이
export default function NextTermSetup({ isOpen, onClose }) {
  const { schedules, applyNextTermSchedule } = useSchedule()
  const today = new Date()
  const todayStr = localDateStr(today)
  const minDate = addDays(todayStr, 1)

  const [draft, setDraft] = useState([])
  const [baselineIds, setBaselineIds] = useState([])
  const [effectiveDate, setEffectiveDate] = useState('')
  const [originalNextTermDate, setOriginalNextTermDate] = useState(null)
  const [editItem, setEditItem] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [canvasWeek, setCanvasWeek] = useState(() => getWeekDates(today))

  // 이미 만들어둔(아직 발효 전) 다음학기 일정이 있고, 적용 날짜를 그 날짜 그대로 두고 있는 경우에만
  // "불러왔다" 안내를 보여준다. 사용자가 날짜를 다른 날로 바꾸면(=그 너머로 새 시간표를 짜는 중)
  // 더 이상 "이미 만들어진 시간표"가 아니므로 안내 문구도 그에 맞게 달라져야 한다.
  const loadedExisting = !!originalNextTermDate && effectiveDate === originalNextTermDate

  // 오버레이가 열릴 때마다 초안 구성:
  // - 이미 만들어둔(아직 발효 전) 다음학기 일정이 있으면 그 날짜 기준으로 불러와 이어서 편집
  // - 없으면 현재 활성 시간표를 기반으로 새로 시작
  useEffect(() => {
    if (isOpen) {
      // termBatch 태그가 있는 항목만 "다음학기 일괄 적용"으로 만든 것으로 간주한다.
      // effectiveFrom/effectiveTo만으로 판단하면, 기간 한정 일회성 항목("이번 주만 추가")이나
      // 그냥 미래 날짜로 개별 추가한 일정("이노블스" 같은)도 조건을 만족해버려서
      // 실제로 저장해 둔 다음학기 시간표 대신 그런 항목을 잘못 불러오는 문제가 있었다.
      const upcoming = schedules
        .filter(s => s.termBatch && s.termBatch > todayStr)
        .map(s => s.termBatch)
        .sort()
      const nextTermDate = upcoming[0] ?? null
      const refDate = nextTermDate ?? todayStr

      const active = schedules
        .filter(s => (!s.effectiveFrom || s.effectiveFrom <= refDate) && (!s.effectiveTo || s.effectiveTo >= refDate))
        .map(s => ({ ...s, exceptions: [] }))

      setDraft(active)
      setBaselineIds(active.map(s => s.id))
      setEffectiveDate(nextTermDate ?? '')
      setOriginalNextTermDate(nextTermDate)
      setShowConfirm(false)
      setCanvasWeek(nextTermDate ? weekOnOrAfter(nextTermDate) : getWeekDates(today))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // 적용 날짜를 바꾸면(기존에 불러온 날짜 너머로 다시 시간표를 짜려는 경우 포함) 캔버스도
  // 그 날짜가 있는 주로 따라가야 한다. 이게 없으면 날짜만 바뀌고 화면은 그대로라 편집이
  // 안 되는 것처럼 보인다.
  useEffect(() => {
    if (isOpen && effectiveDate) {
      setCanvasWeek(weekOnOrAfter(effectiveDate))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveDate])

  if (!isOpen) return null

  const handleSaveItem = (formData) => {
    if (editItem) {
      setDraft(prev => prev.map(d => d.id === editItem.id ? { ...d, ...formData } : d))
    } else {
      setDraft(prev => [...prev, { ...formData, id: `draft-${Date.now()}`, exceptions: [], googleCalendarId: null }])
    }
  }

  const handleDeleteItem = () => {
    setDraft(prev => prev.filter(d => d.id !== editItem.id))
  }

  const handleApply = () => {
    applyNextTermSchedule(effectiveDate, draft, baselineIds)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col">
      {/* 헤더 */}
      <div className="flex-shrink-0 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
            <CalendarClock size={18} className="text-indigo-500" />
            다음학기 시간표 만들기
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        <label className="block text-sm font-semibold text-slate-600 mb-1">이 날짜부터 적용</label>
        <input
          type="date"
          value={effectiveDate}
          min={minDate}
          onChange={e => setEffectiveDate(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        {loadedExisting ? (
          <p className="mt-1.5 text-xs text-indigo-500 font-medium leading-snug">
            📌 이미 만들어 둔 {effectiveDate} 시간표를 불러왔습니다. 계속 수정하고 저장하면
            그대로 갱신됩니다.
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-slate-400 leading-snug">
            현재 시간표를 기반으로 자유롭게 수정하세요. 저장하면 선택한 날짜부터 새 시간표가
            적용되고, 이전 시간표는 그 전날까지 그대로 유지됩니다.
          </p>
        )}
      </div>

      {/* 캔버스 — 기존 WeeklyTimetable 재사용 */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <WeeklyTimetable
          weekDates={canvasWeek}
          schedules={draft}
          today={today}
          onBlockClick={(item) => setEditItem(item)}
        />
      </div>

      {/* FAB */}
      <button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center active:scale-95 transition-transform z-40"
        aria-label="일정 추가"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {/* 하단 저장 바 */}
      <div className="flex-shrink-0 border-t border-slate-100 px-4 py-3">
        {showConfirm ? (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-center">
            <p className="text-sm text-indigo-700 font-medium mb-3">
              {effectiveDate}부터 적용됩니다. 진행할까요?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium">취소</button>
              <button onClick={handleApply} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold">적용</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!effectiveDate}
            className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold text-base active:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400"
          >
            다음학기 시간표로 저장
          </button>
        )}
      </div>

      <NextTermItemModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleSaveItem}
      />
      <NextTermItemModal
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        editItem={editItem}
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
      />
    </div>
  )
}
