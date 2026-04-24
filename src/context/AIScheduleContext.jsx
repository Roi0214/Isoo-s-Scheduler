import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { localDateStr } from '../utils/weekUtils'

const AIScheduleContext = createContext(null)

function loadFromStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

export function AIScheduleProvider({ children }) {
  const [aiSchedule, setAiSchedule] = useState(() =>
    loadFromStorage('kid-scheduler:aiSchedule', null)
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)

  // ── 동기적 중복 호출 방어용 ref ──────────────────────────────
  // React state 업데이트는 비동기라서 연속 클릭 시 isGenerating이
  // true가 되기 전에 두 번째 호출이 시작될 수 있음.
  // useRef는 동기적으로 즉시 반영되므로 확실하게 막아줌.
  const inFlightRef = useRef(false)

  useEffect(() => {
    if (aiSchedule) {
      localStorage.setItem('kid-scheduler:aiSchedule', JSON.stringify(aiSchedule))
    } else {
      localStorage.removeItem('kid-scheduler:aiSchedule')
    }
  }, [aiSchedule])

  const generateSchedule = useCallback(async (homeworks, schedules, googleEvents, weekMonday) => {
    // ── 중복 호출 원천 차단 (동기 ref 체크) ─────────────────────
    if (inFlightRef.current) {
      console.log('[AISchedule] ⚠️ 이미 생성 중 — 중복 호출 차단됨')
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
        body: JSON.stringify({ homeworks, schedules, googleEvents, weekStart }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? `서버 오류 ${response.status}`)
      }

      const data = await response.json()
      console.log(`[AISchedule] ✅ Gemini API 호출 완료 — blocks: ${data.blocks?.length ?? 0}, unscheduled: ${data.unscheduled?.length ?? 0}`)

      setAiSchedule({
        week_start: weekStart,
        generated_at: new Date().toISOString(),
        blocks: data.blocks ?? [],
        unscheduled: data.unscheduled ?? [],
      })
    } catch (err) {
      console.error('[AISchedule] ❌ Gemini API 호출 실패:', err.message)
      setError(err.message)
    } finally {
      inFlightRef.current = false
      setIsGenerating(false)
      console.log('[AISchedule] ■ 호출 종료 — inFlight 해제')
    }
  }, [])

  const clearSchedule = useCallback(() => {
    setAiSchedule(null)
    setError(null)
  }, [])

  const getBlocksForDate = useCallback((dateStr) => {
    if (!aiSchedule) return []
    return aiSchedule.blocks.filter(b => b.date === dateStr)
  }, [aiSchedule])

  return (
    <AIScheduleContext.Provider value={{
      aiSchedule,
      isGenerating,
      error,
      generateSchedule,
      clearSchedule,
      getBlocksForDate,
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
