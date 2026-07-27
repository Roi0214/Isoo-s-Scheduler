import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { SCHEDULES, DEFAULT_CATEGORIES, buildCategories } from '../data/scheduleData'
import { dbLoad, dbSave, localSave } from '../lib/db'
import { localDateStr } from '../utils/weekUtils'

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
    if (dbLoaded) {
      localSave('categoryMap', categoryMap)
      dbSave('categoryMap', categoryMap)
    } else {
      localStorage.setItem('kid-scheduler:categoryMap', JSON.stringify(categoryMap))
    }
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
    if (dbLoaded) {
      localSave('schedules', schedules)
      dbSave('schedules', schedules)
    } else {
      localStorage.setItem('kid-scheduler:schedules', JSON.stringify(schedules))
    }
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

  // 이번 주만 쉬기: weekDates 중 해당 요일에 맞는 날짜를 전부 exceptions에 추가
  // (반복 패턴 자체는 건드리지 않으므로 다음 주부터는 원래대로 돌아옴)
  const skipThisWeek = useCallback((id, weekDates) => {
    setSchedules(prev => {
      const target = prev.find(s => s.id === id)
      if (!target) return prev
      const newDates = weekDates
        .filter(d => target.days.includes(d.getDay()))
        .map(localDateStr)
        .filter(dateStr => !target.exceptions.includes(dateStr))
      if (newDates.length === 0) return prev
      return prev.map(s => s.id === id
        ? { ...s, exceptions: [...s.exceptions, ...newDates] }
        : s)
    })
  }, [])

  // 이번 주만 추가: effectiveFrom/To를 해당 주(월~일)로 한정해서 새 항목 추가
  const addThisWeekOnly = useCallback((item, weekDates) => {
    const effectiveFrom = localDateStr(weekDates[0])
    const effectiveTo = localDateStr(weekDates[weekDates.length - 1])
    setSchedules(prev => [...prev, {
      ...item,
      id: `schedule-${Date.now()}`,
      exceptions: [],
      googleCalendarId: null,
      effectiveFrom,
      effectiveTo,
    }])
  }, [])

  // 다음학기 시간표 일괄 적용: draftItems를 effectiveDate부터 반영
  // - 기존 항목과 id 같고 내용 동일 → 유지
  // - 기존 항목과 id 같고 내용 다름:
  //   - 이미 같은 effectiveDate로 분기된(아직 발효 전) 항목이면 → 재분기 없이 그대로 덮어쓰기
  //     (발효 전 다음학기 안을 다시 열어 계속 고치는 경우 — 재분기하면 effectiveFrom>effectiveTo인
  //      죽은 레코드가 생기므로 주의)
  //   - 그 외(현재 활성 중인 항목) → 기존은 종료, draft 내용으로 새 버전 분기
  // - 기존에만 있음(draft에서 삭제됨):
  //   - 아직 발효 전 분기였다면 → 이력 남길 필요 없이 완전 삭제
  //   - 그 외 → 기존을 종료 (완전 삭제 아님)
  // - draft에만 있음(신규 추가) → effectiveFrom부터 새로 추가
  const applyNextTermSchedule = useCallback((effectiveDate, draftItems) => {
    const prev_ = new Date(effectiveDate + 'T00:00:00')
    prev_.setDate(prev_.getDate() - 1)
    const effectiveTo = `${prev_.getFullYear()}-${String(prev_.getMonth() + 1).padStart(2, '0')}-${String(prev_.getDate()).padStart(2, '0')}`

    const SAME_FIELDS = ['title', 'startTime', 'endTime', 'category']
    const sameContent = (a, b) =>
      SAME_FIELDS.every(f => a[f] === b[f]) &&
      a.days.length === b.days.length &&
      a.days.every(d => b.days.includes(d))

    setSchedules(prev => {
      const draftById = new Map(draftItems.map(d => [d.id, d]))
      const currentIds = new Set(prev.map(s => s.id))
      let seq = 0
      const nextId = () => `schedule-${Date.now()}-${seq++}`

      const result = []
      for (const s of prev) {
        const draft = draftById.get(s.id)
        const isPendingBranch = s.effectiveFrom === effectiveDate

        if (!draft) {
          if (isPendingBranch) {
            continue // 발효 전 분기를 draft에서 삭제 → 이력 없이 완전 제거
          }
          result.push({ ...s, effectiveTo })
        } else if (sameContent(s, draft)) {
          // 변경 없음 → 유지
          result.push(s)
        } else if (isPendingBranch) {
          // 발효 전 분기를 다시 수정 → 재분기 없이 덮어쓰기
          result.push({ ...s, ...draft, effectiveFrom: effectiveDate, effectiveTo: null })
        } else {
          // 변경됨 → 기존 종료 + 새 버전 분기
          result.push({ ...s, effectiveTo })
          result.push({
            ...draft,
            id: nextId(),
            effectiveFrom: effectiveDate,
            effectiveTo: null,
            exceptions: [],
          })
        }
      }

      // draft에만 있는 신규 항목
      for (const d of draftItems) {
        if (!currentIds.has(d.id)) {
          result.push({
            ...d,
            id: nextId(),
            effectiveFrom: effectiveDate,
            effectiveTo: null,
            exceptions: [],
          })
        }
      }

      return result
    })
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
    if (dbLoaded) {
      localSave('scheduleCompleted', completedMap)
      dbSave('scheduleCompleted', completedMap)
    } else {
      localStorage.setItem('kid-scheduler:scheduleCompleted', JSON.stringify(completedMap))
    }
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
      applyNextTermSchedule, skipThisWeek, addThisWeekOnly,
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
