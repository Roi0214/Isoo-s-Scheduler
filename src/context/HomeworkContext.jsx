import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { HOMEWORKS, migrateHomework } from '../data/homeworkData'
import { localDateStr } from '../utils/weekUtils'
import { findNextClassDate, prevDayStr } from '../utils/scheduleUtils'
import { useSchedule } from './ScheduleContext'

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

  // ── 숙제 목록 상태 — 로드 시 마이그레이션 적용 ──────────
  const [homeworks, setHomeworks] = useState(() =>
    loadFromStorage('kid-scheduler:homeworks', HOMEWORKS).map(migrateHomework)
  )

  useEffect(() => {
    localStorage.setItem('kid-scheduler:homeworks', JSON.stringify(homeworks))
  }, [homeworks])

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

  // ── 완료 상태 ───────────────────────────────────────────
  const [completedSet, setCompletedSet] = useState(() =>
    new Set(loadFromStorage('kid-scheduler:hwCompleted', []))
  )

  useEffect(() => {
    localStorage.setItem('kid-scheduler:hwCompleted', JSON.stringify([...completedSet]))
  }, [completedSet])

  // ── 학원 연동 숙제 자동 재활성화 ────────────────────────
  // schedules가 로드되거나 변경될 때 실행:
  //   마감일이 지난 linked_event 숙제 → dueDate를 다음 수업 D-1로 갱신 + status 복구
  useEffect(() => {
    if (!schedules?.length) return
    const today = localDateStr(new Date())
    const recycledIds = []   // non-divisible 숙제 완료 상태 초기화 대상

    setHomeworks(prev => {
      let changed = false
      const updated = prev.map(hw => {
        // repeat 숙제 · linked_event 없음 · 아직 마감 안 됨 → 건너뜀
        if (hw.repeat || !hw.linked_event || !hw.dueDate) return hw
        if (hw.dueDate >= today) return hw

        // 다음 수업일 탐색
        const nextClass = findNextClassDate(hw.linked_event, schedules)
        if (!nextClass) return hw

        const newDueDate = prevDayStr(nextClass)
        if (newDueDate === hw.dueDate) return hw  // 변경 없음

        changed = true
        // non-divisible 숙제는 hwId만으로 완료 키를 쓰므로 초기화 대상에 추가
        if (!hw.is_divisible) recycledIds.push(hw.id)
        return { ...hw, dueDate: newDueDate, status: 'backlog' }
      })
      return changed ? updated : prev   // 변경 없으면 동일 참조 반환 → re-render 없음
    })

    // 재활성화된 숙제의 AI 블록 완료 상태 초기화
    if (recycledIds.length > 0) {
      setCompletedSet(prev => {
        const next = new Set(prev)
        recycledIds.forEach(id => next.delete(id))
        return next
      })
    }
  }, [schedules])

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
