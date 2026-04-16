import { useState, useEffect } from 'react'

/**
 * 현재 시각을 1분마다 갱신하는 훅
 * @returns {Date} 현재 시각
 */
export function useCurrentTime() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    // 다음 분의 정각에 맞춰 첫 틱을 맞춤 (예: 3:45:23 → 16초 후 3:46:00에 첫 업데이트)
    const msUntilNextMinute = (60 - new Date().getSeconds()) * 1000
    let interval

    const timeout = setTimeout(() => {
      setNow(new Date())
      interval = setInterval(() => setNow(new Date()), 60_000)
    }, msUntilNextMinute)

    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [])

  return now
}

/**
 * "HH:MM" 문자열을 당일 기준 분(minutes)으로 변환
 */
export function timeStrToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

/**
 * 특정 일정이 현재 진행 중인지 판별
 * @param {string} startTime "HH:MM"
 * @param {string} endTime   "HH:MM"
 * @param {Date}   now
 * @returns {{ ongoing: boolean, progress: number }} progress: 0~100
 */
export function getOngoingStatus(startTime, endTime, now) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const start = timeStrToMinutes(startTime)
  const end   = timeStrToMinutes(endTime)

  if (currentMinutes < start || currentMinutes >= end) {
    return { ongoing: false, progress: 0 }
  }

  const progress = Math.round(((currentMinutes - start) / (end - start)) * 100)
  return { ongoing: true, progress }
}
