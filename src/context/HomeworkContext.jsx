import { createContext, useContext, useState, useCallback } from 'react'
import { HOMEWORKS } from '../data/homeworkData'

const HomeworkContext = createContext(null)

export function HomeworkProvider({ children }) {
  // ── 숙제 목록 상태 ──────────────────────────────
  const [homeworks, setHomeworks] = useState(HOMEWORKS)

  const addHomework = useCallback((item) => {
    setHomeworks(prev => [...prev, { ...item, id: `hw-${Date.now()}`, googleCalendarId: null }])
  }, [])

  const updateHomework = useCallback((id, updates) => {
    setHomeworks(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
  }, [])

  const deleteHomework = useCallback((id) => {
    setHomeworks(prev => prev.filter(h => h.id !== id))
  }, [])

  // ── 완료 상태 ───────────────────────────────────
  const [completedSet, setCompletedSet] = useState(new Set())

  const isCompleted = useCallback((hwId) => completedSet.has(hwId), [completedSet])

  const toggleCompleted = useCallback((hwId) => {
    setCompletedSet(prev => {
      const next = new Set(prev)
      next.has(hwId) ? next.delete(hwId) : next.add(hwId)
      return next
    })
  }, [])

  const completedCount = completedSet.size

  return (
    <HomeworkContext.Provider value={{
      homeworks,
      addHomework, updateHomework, deleteHomework,
      isCompleted, toggleCompleted, completedCount,
    }}>
      {children}
    </HomeworkContext.Provider>
  )
}

export function useHomework() {
  const ctx = useContext(HomeworkContext)
  if (!ctx) throw new Error('useHomework must be used inside HomeworkProvider')
  return ctx
}
