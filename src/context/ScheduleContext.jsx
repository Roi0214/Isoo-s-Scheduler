import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { SCHEDULES, DEFAULT_CATEGORIES, buildCategories } from '../data/scheduleData'
import { dbLoad, dbSave, localSave } from '../lib/db'

const ScheduleContext = createContext(null)

function loadFromStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

export function ScheduleProvider({ children }) {
  // ── DB 초기 로드 완료 플래그 ──────────────────────
  const [dbLoaded, setDbLoaded] = useState(false)

  // ── 분류 상태 ───────────────────────────────────
  const [categoryMap, setCategoryMap] = useState(() =>
    loadFromStorage('kid-scheduler:categoryMap', DEFAULT_CATEGORIES)
  )

  useEffect(() => {
    localSave('categoryMap', categoryMap)
    if (dbLoaded) dbSave('categoryMap', categoryMap)
  }, [categoryMap, dbLoaded])

  // color/dot 포함된 완성형 분류 객체 (메모이제이션)
  const categories = useMemo(() => buildCategories(categoryMap), [categoryMap])

  const addCategory = useCallback((id, label, colorKey) => {
    setCategoryMap(prev => ({ ...prev, [id]: { label, colorKey } }))
  }, [])

  const updateCategory = useCallback((id, label, colorKey) => {
    setCategoryMap(prev => ({ ...prev, [id]: { label, colorKey } }))
  }, [])

  const deleteCategory = useCallback((id) => {
    setCategoryMap(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  // ── 일정 목록 상태 ──────────────────────────────
  const [schedules, setSchedules] = useState(() =>
    loadFromStorage('kid-scheduler:schedules', SCHEDULES)
  )

  useEffect(() => {
    localSave('schedules', schedules)
    if (dbLoaded) dbSave('schedules', schedules)
  }, [schedules, dbLoaded])

  const addSchedule = useCallback((item) => {
    setSchedules(prev => [...prev, { ...item, id: `schedule-${Date.now()}`, exceptions: [], googleCalendarId: null }])
  }, [])

  const updateSchedule = useCallback((id, updates) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }, [])

  // 특정 날짜부터 변경된 일정을 새 버전으로 분기
  const scheduleChangeFrom = useCallback((id, fromDate, newFields) => {
    const prev_ = new Date(fromDate + 'T00:00:00')
    prev_.setDate(prev_.getDate() - 1)
    const effectiveTo = `${prev_.getFullYear()}-${String(prev_.getMonth() + 1).padStart(2, '0')}-${String(prev_.getDate()).padStart(2, '0')}`

    setSchedules(prev => {
      const existing = prev.find(s => s.id === id)
      if (!existing) return prev
      const closed = prev.map(s => s.id === id ? { ...s, effectiveTo } : s)
      const newEntry = {
        ...existing,
        ...newFields,
        id: `schedule-${Date.now()}`,
        effectiveFrom: fromDate,
        effectiveTo: null,
        exceptions: [],
      }
      return [...closed, newEntry]
    })
  }, [])

  const deleteSchedule = useCallback((id) => {
    setSchedules(prev => prev.filter(s => s.id !== id))
  }, [])

  // 특정 날짜부터 일정 종료 (effectiveTo 설정)
  // fromDate 이전에 이미 시작한 일정이면 effectiveTo 설정, 같은 날 시작이면 완전 삭제
  const deleteScheduleFrom = useCallback((id, fromDate) => {
    setSchedules(prev => {
      const target = prev.find(s => s.id === id)
      if (!target) return prev
      const startDate = target.effectiveFrom ?? '0000-01-01'
      if (fromDate <= startDate) {
        // 시작일과 같거나 이전이면 완전 삭제
        return prev.filter(s => s.id !== id)
      }
      const prevDay = new Date(fromDate + 'T00:00:00')
      prevDay.setDate(prevDay.getDate() - 1)
      const effectiveTo = `${prevDay.getFullYear()}-${String(prevDay.getMonth() + 1).padStart(2, '0')}-${String(prevDay.getDate()).padStart(2, '0')}`
      return prev.map(s => s.id === id ? { ...s, effectiveTo } : s)
    })
  }, [])

  // ── 날짜별 완료 상태 ────────────────────────────
  const [completedMap, setCompletedMap] = useState(() =>
    loadFromStorage('kid-scheduler:scheduleCompleted', {})
  )

  useEffect(() => {
    localSave('scheduleCompleted', completedMap)
    if (dbLoaded) dbSave('scheduleCompleted', completedMap)
  }, [completedMap, dbLoaded])

  // ── Supabase 초기 로드 ───────────────────────────
  useEffect(() => {
    Promise.all([
      dbLoad('schedules'),
      dbLoad('categoryMap'),
      dbLoad('scheduleCompleted'),
    ]).then(([remoteSch, remoteCat, remoteComp]) => {
      if (remoteSch  !== null) setSchedules(remoteSch)
      if (remoteCat  !== null) setCategoryMap(remoteCat)
      if (remoteComp !== null) setCompletedMap(remoteComp)
    }).catch(err => {
      console.warn('[ScheduleContext] DB 로드 실패, localStorage 사용:', err?.message)
    }).finally(() => setDbLoaded(true))
  }, [])

  const isCompleted = useCallback((scheduleId, dateStr) =>
    !!completedMap[`${scheduleId}_${dateStr}`], [completedMap])

  const toggleCompleted = useCallback((scheduleId, dateStr) => {
    const key = `${scheduleId}_${dateStr}`
    setCompletedMap(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  return (
    <ScheduleContext.Provider value={{
      categories, categoryMap,
      addCategory, updateCategory, deleteCategory,
      schedules,
      addSchedule, updateSchedule, scheduleChangeFrom, deleteSchedule, deleteScheduleFrom,
      isCompleted, toggleCompleted,
    }}>
      {children}
    </ScheduleContext.Provider>
  )
}

export function useSchedule() {
  const ctx = useContext(ScheduleContext)
  if (!ctx) throw new Error('useSchedule must be used inside ScheduleProvider')
  return ctx
}
