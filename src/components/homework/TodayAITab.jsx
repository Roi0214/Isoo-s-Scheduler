import { Sparkles, AlertTriangle, RefreshCw, Trash2, ChevronDown, ChevronRight, FlaskConical, RotateCcw } from 'lucide-react'
import AIHomeworkBlock from './AIHomeworkBlock'
import { useAISchedule } from '../../context/AIScheduleContext'
import { useHomework } from '../../context/HomeworkContext'
import { useSchedule } from '../../context/ScheduleContext'
import { useGCal } from '../../context/GoogleCalendarContext'
import { getWeekDates, localDateStr } from '../../utils/weekUtils'
import { useState } from 'react'

const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토']

function dateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_KR[d.getDay()]})`
}

export default function TodayAITab() {
  const {
    aiSchedule, isGenerating, error,
    generateSchedule, loadDummySchedule, clearError, clearSchedule,
    rolloverPastBlocks,
  } = useAISchedule()
  const { homeworks, isCompleted } = useHomework()
  const { schedules } = useSchedule()
  const { getEventsForDate } = useGCal()
  const [expandedDays, setExpandedDays] = useState({})
  const [rolledOver, setRolledOver] = useState(false)

  const now = new Date()
  const today = localDateStr(now)
  const weekDates = getWeekDates(now)
  const weekMonday = weekDates[0]

  // Google 이벤트 수집 — API는 자동 호출하지 않고 데이터만 준비
  const allGoogleEvents = weekDates.flatMap(d => {
    const dateStr = localDateStr(d)
    return (getEventsForDate(d) || []).map(e => ({ ...e, date: dateStr }))
  })

  // ── 밀린 숙제 감지 ──────────────────────────────────────────
  const pastIncomplete = aiSchedule?.blocks.filter(
    b => b.date < today && !isCompleted(b.homework_id) && !b.rolledOver
  ) ?? []

  const handleRollover = () => {
    const count = rolloverPastBlocks(today, isCompleted)
    if (count > 0) setRolledOver(true)
  }

  // ── 버튼 핸들러 ─────────────────────────────────────────────
  // ※ generateSchedule은 오직 이 함수를 통해서만 호출됨 (자동 호출 없음)
  const handleGenerate = () => {
    if (isGenerating) {
      console.log('[TodayAITab] ⚠️ 생성 중 — 클릭 무시')
      return
    }
    generateSchedule(homeworks, schedules, allGoogleEvents, weekMonday)
  }

  const handleDummy = () => {
    loadDummySchedule()
  }

  const toggleDay = (dateStr) =>
    setExpandedDays(prev => ({ ...prev, [dateStr]: !prev[dateStr] }))

  // 날짜별 블록 그룹화
  const blocksByDate = {}
  if (aiSchedule?.blocks) {
    for (const block of aiSchedule.blocks) {
      if (!blocksByDate[block.date]) blocksByDate[block.date] = []
      blocksByDate[block.date].push(block)
    }
    for (const dateStr of Object.keys(blocksByDate)) {
      blocksByDate[dateStr].sort((a, b) => a.start_time.localeCompare(b.start_time))
    }
  }
  const scheduledDates = Object.keys(blocksByDate).sort()

  // ── 생성 중 ────────────────────────────────────────────────
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center animate-pulse">
          <Sparkles size={26} className="text-indigo-500" />
        </div>
        <p className="text-sm font-semibold text-slate-600">AI가 최적 시간표를 계산하는 중...</p>
        <p className="text-xs text-slate-400">5대 규칙 분석 중, 잠시만 기다려 주세요</p>
      </div>
    )
  }

  // ── 에러 상태 ──────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle size={22} className="text-red-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-red-600 mb-1">배분 생성 실패</p>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs break-all">{error}</p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm disabled:opacity-50"
          >
            <RefreshCw size={14} /> 다시 시도
          </button>
          <button
            onClick={handleDummy}
            className="flex items-center justify-center gap-2 bg-slate-100 text-slate-600 px-5 py-2.5 rounded-2xl font-semibold text-sm"
          >
            <FlaskConical size={14} /> 더미 데이터로 UI 확인
          </button>
          <button
            onClick={clearError}
            className="text-xs text-slate-400 py-1 text-center"
          >
            에러 무시하고 초기 화면으로
          </button>
        </div>
      </div>
    )
  }

  // ── 미생성 초기 상태 ───────────────────────────────────────
  if (!aiSchedule) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-5">
        <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
          <Sparkles size={30} className="text-indigo-400" />
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-slate-700 mb-1">AI 주간 배분이 아직 없어요</p>
          <p className="text-sm text-slate-400 leading-relaxed">
            전체 숙제 리스트의 항목을 기반으로<br />
            이번 주 최적 시간표를 자동 생성합니다.
          </p>
        </div>

        {/* 실제 AI 생성 버튼 */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles size={16} />
          AI 주간 배분 생성
        </button>

        {/* 더미 데이터 미리보기 버튼 */}
        <button
          onClick={handleDummy}
          className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 px-4 py-2 rounded-xl font-medium"
        >
          <FlaskConical size={12} />
          더미 데이터로 UI 미리보기
        </button>

        <p className="text-xs text-slate-300 text-center leading-relaxed px-4">
          Gemini 2.0 Flash Lite · 5대 규칙 적용<br />
          (전날 완료·보카 복습·분할·난이도·수면 보호)
        </p>
      </div>
    )
  }

  // ── 생성 완료 ──────────────────────────────────────────────
  const isDummy = aiSchedule.blocks.some(b => b.homework_id?.startsWith('dummy-'))

  return (
    <div>
      {/* 상단 메타 + 액션 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-indigo-500" />
            <p className="text-sm font-bold text-slate-700">
              AI 주간 배분 결과
              {isDummy && (
                <span className="ml-1.5 text-xs font-normal text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md">
                  더미 데이터
                </span>
              )}
            </p>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {aiSchedule.week_start} 주차 · {aiSchedule.blocks.length}개 블록
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw size={11} /> {isDummy ? 'AI 생성' : '재생성'}
          </button>
          <button
            onClick={clearSchedule}
            className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl font-semibold"
          >
            <Trash2 size={11} /> 초기화
          </button>
        </div>
      </div>

      {/* 밀린 숙제 배너 */}
      {pastIncomplete.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw size={14} className="text-orange-500" />
              <p className="text-sm font-bold text-orange-700">
                완료 못 한 숙제 {pastIncomplete.length}개
              </p>
            </div>
            <button
              onClick={handleRollover}
              className="text-xs font-bold text-orange-600 bg-orange-100 px-3 py-1.5 rounded-xl active:bg-orange-200"
            >
              오늘로 옮기기
            </button>
          </div>
          <div className="mt-2 flex flex-col gap-1">
            {pastIncomplete.map(b => (
              <p key={b.homework_id} className="text-xs text-orange-500 truncate pl-1">
                · {b.homework_title}
                <span className="text-orange-300 ml-1">({b.date})</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {rolledOver && pastIncomplete.length === 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-3 py-2 mb-3 text-xs text-indigo-500 font-medium">
          ↩ 밀린 숙제를 오늘 일정에 추가했어요
        </div>
      )}

      {/* 미배분 경고 */}
      {aiSchedule.unscheduled?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-amber-500" />
            <p className="text-xs font-bold text-amber-700">
              {aiSchedule.unscheduled.length}개 미배분
            </p>
          </div>
          <div className="flex flex-col gap-1">
            {aiSchedule.unscheduled.map(u => (
              <div key={u.homework_id} className="flex gap-2 text-xs">
                <span className="text-amber-600 font-medium truncate max-w-[140px]">{u.homework_title}</span>
                <span className="text-amber-400">— {u.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 날짜별 블록 */}
      {scheduledDates.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">배분된 숙제가 없어요</div>
      ) : (
        scheduledDates.map(dateStr => {
          const isToday = dateStr === today
          const blocks = blocksByDate[dateStr]
          const isOpen = isToday ? (expandedDays[dateStr] !== false) : (expandedDays[dateStr] === true)

          return (
            <div key={dateStr} className="mb-4">
              <button
                onClick={() => toggleDay(dateStr)}
                className="w-full flex items-center gap-2 mb-2 group"
              >
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full
                  ${isToday ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                >
                  {isToday ? '오늘 ' : ''}{dateLabel(dateStr)}
                </span>
                <span className="text-xs text-slate-300">{blocks.length}개</span>
                <span className="ml-auto text-slate-300 group-hover:text-slate-400">
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              </button>

              {isOpen && (
                <div className="flex flex-col gap-2">
                  {blocks.map((block, idx) => (
                    <AIHomeworkBlock key={`${block.homework_id}-${idx}`} block={block} />
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
