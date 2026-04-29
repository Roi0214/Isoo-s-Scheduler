import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { localDateStr, getWeekDates } from '../utils/weekUtils'
import { dbLoad, dbSave, localSave } from '../lib/db'

const AIScheduleContext = createContext(null)

function loadFromStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

// ── 더미 데이터 (API 없이 UI 확인용) ──────────────────────────
function buildDummySchedule() {
  const now = new Date()
  const weekDates = getWeekDates(now)
  const weekStart = localDateStr(weekDates[0])

  // 오늘 ~ 이번주 범위 내에서 더미 블록 생성
  const d0 = localDateStr(weekDates[1]) // 화
  const d1 = localDateStr(weekDates[2]) // 수
  const d2 = localDateStr(weekDates[3]) // 목

  return {
    week_start: weekStart,
    generated_at: new Date().toISOString(),
    blocks: [
      {
        homework_id: 'dummy-1',
        homework_title: '[더미] 단원평가 1장 (하윤네 수학)',
        subject: 'math',
        date: d0,
        start_time: '19:00',
        end_time: '19:30',
        units_today: null,
        reason: '난이도 중, 학원 전날 배치',
      },
      {
        homework_id: 'dummy-2',
        homework_title: '[더미] 트윈클 픽션 리딩 지문',
        subject: 'english',
        date: d0,
        start_time: '19:30',
        end_time: '20:00',
        units_today: null,
        reason: '학원 D-1 배치',
      },
      {
        homework_id: 'dummy-3',
        homework_title: '[더미] 수학과외 숙제 Part 1',
        subject: 'math',
        date: d1,
        start_time: '19:00',
        end_time: '19:40',
        units_today: null,
        reason: '난이도 상, 저녁 19~21시 배치',
      },
      {
        homework_id: 'dummy-4',
        homework_title: '[더미] 트윈클 보카 20개',
        subject: 'english',
        date: d2,
        start_time: '20:00',
        end_time: '20:20',
        units_today: 20,
        reason: '분할 배분, 학원 D-1',
      },
    ],
    unscheduled: [
      {
        homework_id: 'dummy-x',
        homework_title: '[더미] CNA 주간 과제',
        reason: '주말로 이월 (22:30 초과)',
      },
    ],
  }
}

export function AIScheduleProvider({ children }) {
  const [aiSchedule, setAiSchedule] = useState(() =>
    loadFromStorage('kid-scheduler:aiSchedule', null)
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [dbLoaded, setDbLoaded] = useState(false)

  // ── Supabase 초기 로드 ────────────────────────────────
  useEffect(() => {
    dbLoad('aiSchedule').then(remote => {
      if (remote !== null) setAiSchedule(remote)
    }).catch(err => {
      console.warn('[AIScheduleContext] DB 로드 실패:', err?.message)
    }).finally(() => setDbLoaded(true))
  }, [])

  // ── 동기적 중복 호출 방어 ref ──────────────────────────────
  const inFlightRef = useRef(false)

  useEffect(() => {
    localSave('aiSchedule', aiSchedule ?? null)
    if (dbLoaded) dbSave('aiSchedule', aiSchedule ?? null)
  }, [aiSchedule, dbLoaded])

  // ──────────────────────────────────────────────────────────
  // ※ 자동 호출 없음 — generateSchedule은 오직 사용자 버튼 클릭으로만 실행됨.
  //   useEffect로 API를 자동 호출하는 코드는 이 파일에 존재하지 않음.
  // ──────────────────────────────────────────────────────────

  /** API 없이 더미 데이터로 즉시 UI 확인 */
  const loadDummySchedule = useCallback(() => {
    console.log('[AISchedule] 더미 데이터 로드 — API 미호출')
    setAiSchedule(buildDummySchedule())
    setError(null)
  }, [])

  /** 에러만 초기화 (schedule 유지) */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /** schedule + error 전체 초기화 */
  const clearSchedule = useCallback(() => {
    setAiSchedule(null)
    setError(null)
  }, [])

  /** AI 주간 배분 생성 — 오직 사용자 명시적 호출로만 실행 */
  const generateSchedule = useCallback(async (homeworks, schedules, googleEvents, weekMonday, customRulesText) => {
    // 중복 호출 원천 차단 (동기 ref)
    if (inFlightRef.current) {
      console.log('[AISchedule] ⚠️ 이미 생성 중 — 중복 호출 차단')
      return
    }

    inFlightRef.current = true
    setIsGenerating(true)
    setError(null)

    const weekStart = localDateStr(weekMonday)
    console.log(`[AISchedule] ▶ Gemini API 호출 시작 — weekStart: ${weekStart}, 숙제 수: ${homeworks.length}`)

    try {
      const response = await fetch('/api/schedule-homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeworks, schedules, googleEvents, weekStart, customRulesText }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? `서버 오류 ${response.status}`)
      }

      const data = await response.json()
      console.log(`[AISchedule] ✅ Gemini API 완료 — blocks: ${data.blocks?.length ?? 0}`)

      const blocks = data.blocks ?? []
      const scheduledIds = new Set(blocks.map(b => b.homework_id))
      const unscheduled = (data.unscheduled ?? []).filter(
        u => !scheduledIds.has(u.homework_id)
      )

      setAiSchedule({
        week_start: weekStart,
        generated_at: new Date().toISOString(),
        blocks,
        unscheduled,
      })
    } catch (err) {
      console.error('[AISchedule] ❌ 실패:', err.message)
      setError(err.message)
    } finally {
      inFlightRef.current = false
      setIsGenerating(false)
      console.log('[AISchedule] ■ 호출 종료')
    }
  }, [])

  const getBlocksForDate = useCallback((dateStr) => {
    if (!aiSchedule) return []
    return aiSchedule.blocks.filter(b => b.date === dateStr)
  }, [aiSchedule])

  /**
   * 미완료 과거 블록을 남은 주간에 재배분
   * - 고/중 우선순위: 남은 날짜에 분산 배치 (dueDate 존중)
   * - 저 우선순위: 이번 주 마감 초과 시 unscheduled로 이동
   */
  const redistributeIncomplete = useCallback((today, isCompletedFn, homeworks) => {
    if (!aiSchedule) return 0

    const hwMap = Object.fromEntries((homeworks || []).map(h => [h.id, h]))

    // 이번 주 남은 날짜 (오늘 포함 ~ 일요일)
    const todayObj = new Date(today + 'T00:00:00')
    const dayOfWeek = todayObj.getDay()
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek
    const remainingDays = []
    for (let i = 0; i <= daysUntilSunday; i++) {
      const d = new Date(todayObj)
      d.setDate(todayObj.getDate() + i)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      remainingDays.push(`${y}-${m}-${dd}`)
    }

    // 미완료 과거 블록 (이미 재배분된 것 제외)
    const incompletePast = aiSchedule.blocks.filter(
      b => b.date < today && !isCompletedFn(b.homework_id) && !b.rolledOver
    )
    if (incompletePast.length === 0) return 0

    const highMed = incompletePast.filter(b => (hwMap[b.homework_id]?.priority ?? 'medium') !== 'low')
    const low = incompletePast.filter(b => hwMap[b.homework_id]?.priority === 'low')

    // 고/중 우선순위 → 남은 날짜에 순서대로 분산
    let dayIdx = 0
    const redistributed = highMed.map(block => {
      const hw = hwMap[block.homework_id]
      // dueDate가 있으면 그 이전 날들만 대상
      let validDays = remainingDays
      if (hw?.dueDate && hw.dueDate <= remainingDays[remainingDays.length - 1]) {
        validDays = remainingDays.filter(d => d <= hw.dueDate)
      }
      if (validDays.length === 0) validDays = [today]
      const targetDay = validDays[dayIdx % validDays.length]
      dayIdx++
      return { ...block, date: targetDay, rolledOver: true, originalDate: block.date }
    })

    // 저 우선순위 → unscheduled 이동
    const newUnscheduled = low.map(b => ({
      homework_id: b.homework_id,
      homework_title: b.homework_title,
      reason: '우선순위 낮음 — 주간 마감 초과, 다음 주로 이월',
    }))

    setAiSchedule(prev => ({
      ...prev,
      blocks: [
        // 완료된 과거 블록 + 오늘 이후 블록은 유지, 미완료 과거는 제거
        ...prev.blocks.filter(b =>
          b.date >= today || isCompletedFn(b.homework_id) || b.rolledOver
        ),
        ...redistributed,
      ],
      unscheduled: [
        ...(prev.unscheduled || []).filter(
          u => !low.some(b => b.homework_id === u.homework_id)
        ),
        ...newUnscheduled,
      ],
    }))

    return incompletePast.length
  }, [aiSchedule])

  /** 숙제 삭제 시 AI 스케줄에서 해당 블록 제거 */
  const removeBlocksByHomeworkId = useCallback((hwId) => {
    if (!aiSchedule) return
    setAiSchedule(prev => ({
      ...prev,
      blocks: prev.blocks.filter(b => b.homework_id !== hwId),
      unscheduled: (prev.unscheduled || []).filter(u => u.homework_id !== hwId),
    }))
  }, [aiSchedule])

  /** 숙제 수정 시 AI 스케줄의 제목/과목 동기화 */
  const syncUpdatedHomework = useCallback((hw) => {
    if (!aiSchedule) return
    setAiSchedule(prev => ({
      ...prev,
      blocks: prev.blocks.map(b =>
        b.homework_id === hw.id
          ? { ...b, homework_title: hw.title, subject: hw.subject }
          : b
      ),
    }))
  }, [aiSchedule])

  return (
    <AIScheduleContext.Provider value={{
      aiSchedule,
      isGenerating,
      error,
      generateSchedule,
      loadDummySchedule,
      clearError,
      clearSchedule,
      getBlocksForDate,
      redistributeIncomplete,
      removeBlocksByHomeworkId,
      syncUpdatedHomework,
    }}>
      {children}
    </AIScheduleContext.Provider>
  )
}

export function useAISchedule() {
  const ctx = useContext(AIScheduleContext)
  if (!ctx) throw new Error('useAISchedule must be used inside AIScheduleProvider')
  return ctx
}
