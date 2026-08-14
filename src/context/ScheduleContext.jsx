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

  // 다음학기 시간표 일괄 적용: 통째로 종료 + 통째로 새로 생성하는 단순한 방식
  // (baselineIds = 초안을 만들 때 기준이 됐던 기존 항목 id 목록, NextTermSetup에서 전달)
  // - baselineIds에 해당하는 기존 항목은 전부 종료 처리(effectiveTo)해서 과거 기록은 그대로 남김
  //   단, 이미 같은 effectiveDate로 발효 전 분기돼 있던 항목은 이력 남길 필요 없이 완전 삭제
  //   (그래야 하지 않으면 effectiveFrom==effectiveTo+1인 0일짜리 죽은 레코드가 생김)
  // - draftItems(최종 편집 결과)는 항목별 비교 없이 전부 새 버전으로 생성
  // - baselineIds에 없는 나머지 항목(다른 시점의 과거/미래 분기 등)은 그대로 둠
  // 예전엔 "바뀐 것만 골라 처리"하려고 항목별로 내용을 비교했는데, 이 방식이 여러 edge case에서
  // 깨져서(분류 기본값 차이로 오탐, 발효 전 분기 재수정 시 중복 등) 통째 교체로 단순화함
  const applyNextTermSchedule = useCallback((effectiveDate, draftItems, baselineIds) => {
    const prev_ = new Date(effectiveDate + 'T00:00:00')
    prev_.setDate(prev_.getDate() - 1)
    const effectiveTo = `${prev_.getFullYear()}-${String(prev_.getMonth() + 1).padStart(2, '0')}-${String(prev_.getDate()).padStart(2, '0')}`

    setSchedules(prev => {
      const baselineSet = new Set(baselineIds)
      let seq = 0
      const nextId = () => `schedule-${Date.now()}-${seq++}`

      const untouched = prev.filter(s => !baselineSet.has(s.id))

      const closed = prev
        .filter(s => baselineSet.has(s.id) && s.effectiveFrom !== effectiveDate)
        .map(s => ({ ...s, effectiveTo }))

      const newVersions = draftItems.map(d => ({
        ...d,
        id: nextId(),
        effectiveFrom: effectiveDate,
        effectiveTo: null,
        exceptions: [],
      }))

      return [...untouched, ...closed, ...newVersions]
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
