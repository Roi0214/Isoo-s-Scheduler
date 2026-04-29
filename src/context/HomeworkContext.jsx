import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { HOMEWORKS, migrateHomework } from '../data/homeworkData'
import { localDateStr } from '../utils/weekUtils'
import { findNextClassDate, prevDayStr } from '../utils/scheduleUtils'
import { useSchedule } from './ScheduleContext'
import { dbLoad, dbSave, localSave } from '../lib/db'

const HomeworkContext = createContext(null)

function loadFromStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

export function HomeworkProvider({ children }) {
  const { schedules } = useSchedule()

  // ── 숙제 목록 ───────────────────────────────────────────
  const [homeworks, setHomeworks] = useState(() =>
    loadFromStorage('kid-scheduler:homeworks', HOMEWORKS).map(migrateHomework)
  )

  // ── 완료 상태 ───────────────────────────────────────────
  const [completedSet, setCompletedSet] = useState(() =>
    new Set(loadFromStorage('kid-scheduler:hwCompleted', []))
  )

  // ── DB 초기 로드 완료 플래그 ────────────────────────────
  const [dbLoaded, setDbLoaded] = useState(false)

  // ── Supabase 초기 로드 (앱 시작 시 1회) ─────────────────
  useEffect(() => {
    Promise.all([
      dbLoad('homeworks'),
      dbLoad('hwCompleted'),
    ]).then(([remoteHw, remoteCompleted]) => {
      if (remoteHw   !== null) setHomeworks(remoteHw.map(migrateHomework))
      if (remoteCompleted !== null) setCompletedSet(new Set(remoteCompleted))
    }).catch(err => {
      console.warn('[HomeworkContext] DB 로드 실패, localStorage 사용:', err?.message)
    }).finally(() => setDbLoaded(true))
  }, [])

  // ── 숙제 변경 → localStorage + Supabase 저장 ───────────
  useEffect(() => {
    localSave('homeworks', homeworks)
    if (dbLoaded) dbSave('homeworks', homeworks)
  }, [homeworks, dbLoaded])

  // ── 완료 상태 변경 → localStorage + Supabase 저장 ───────
  useEffect(() => {
    const arr = [...completedSet]
    localSave('hwCompleted', arr)
    if (dbLoaded) dbSave('hwCompleted', arr)
  }, [completedSet, dbLoaded])

  // ── 학원 연동 숙제 자동 재활성화 ────────────────────────
  // DB 로드 완료 + schedules 준비 후 실행:
  //   마감일이 지난 linked_event 숙제 → dueDate를 다음 수업 D-1로 갱신 + status 복구
  useEffect(() => {
    if (!dbLoaded || !schedules?.length) return
    const today = localDateStr(new Date())
    const recycledIds = []

    setHomeworks(prev => {
      let changed = false
      const updated = prev.map(hw => {
        if (hw.repeat || !hw.linked_event || !hw.dueDate) return hw
        if (hw.dueDate >= today) return hw

        const nextClass = findNextClassDate(hw.linked_event, schedules)
        if (!nextClass) return hw

        const newDueDate = prevDayStr(nextClass)
        if (newDueDate === hw.dueDate) return hw

        changed = true
        if (!hw.is_divisible) recycledIds.push(hw.id)
        return { ...hw, dueDate: newDueDate, status: 'backlog' }
      })
      return changed ? updated : prev
    })

    if (recycledIds.length > 0) {
      setCompletedSet(prev => {
        const next = new Set(prev)
        recycledIds.forEach(id => next.delete(id))
        return next
      })
    }
  }, [dbLoaded, schedules])

  // ── CRUD ────────────────────────────────────────────────
  const addHomework = useCallback((item) => {
    setHomeworks(prev => [
      ...prev,
      migrateHomework({ ...item, id: `hw-${Date.now()}`, googleCalendarId: null }),
    ])
  }, [])

  const updateHomework = useCallback((id, updates) => {
    setHomeworks(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
  }, [])

  const deleteHomework = useCallback((id) => {
    setHomeworks(prev => prev.filter(h => h.id !== id))
  }, [])

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
      dbLoaded,
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
