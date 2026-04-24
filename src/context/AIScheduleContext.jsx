import { createContext, useContext, useState, useCallback, useEffect } from 'react'
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

/**
 * AI 배분 결과 스키마:
 * {
 *   week_start: 'YYYY-MM-DD',
 *   generated_at: 'ISO datetime',
 *   blocks: [
 *     {
 *       homework_id: string,
 *       homework_title: string,
 *       subject: string,
 *       date: 'YYYY-MM-DD',
 *       start_time: 'HH:MM',
 *       end_time: 'HH:MM',
 *       units_today: number | null,
 *       reason: string,
 *     }
 *   ],
 *   unscheduled: [{ homework_id, homework_title, reason }],
 * }
 */

export function AIScheduleProvider({ children }) {
  const [aiSchedule, setAiSchedule] = useState(() =>
    loadFromStorage('kid-scheduler:aiSchedule', null)
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (aiSchedule) {
      localStorage.setItem('kid-scheduler:aiSchedule', JSON.stringify(aiSchedule))
    } else {
      localStorage.removeItem('kid-scheduler:aiSchedule')
    }
  }, [aiSchedule])

  /**
   * AI 주간 배분 생성
   * @param {object[]} homeworks  - 백로그 숙제 목록
   * @param {object[]} schedules  - 고정 일정 목록 (ScheduleContext)
   * @param {object[]} googleEvents - Google 캘린더 이벤트
   * @param {Date}     weekMonday  - 배분할 주의 월요일 Date 객체
   */
  const generateSchedule = useCallback(async (homeworks, schedules, googleEvents, weekMonday) => {
    setIsGenerating(true)
    setError(null)

    try {
      const weekStart = localDateStr(weekMonday)

      const response = await fetch('/api/schedule-homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeworks,
          schedules,
          googleEvents,
          weekStart,
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? `서버 오류 ${response.status}`)
      }

      const data = await response.json()
      setAiSchedule({
        week_start: weekStart,
        generated_at: new Date().toISOString(),
        blocks: data.blocks ?? [],
        unscheduled: data.unscheduled ?? [],
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const clearSchedule = useCallback(() => {
    setAiSchedule(null)
    setError(null)
  }, [])

  /** 특정 날짜의 AI 배분 블록 반환 */
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
