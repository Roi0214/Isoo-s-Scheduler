import { createContext, useContext, useCallback } from 'react'
import { useGoogleCalendar } from '../hooks/useGoogleCalendar'

// 개인 캘린더
const MY_ICAL_URL =
  'https://calendar.google.com/calendar/ical/s3u1l8d1enbctf5hk0at35njcg%40group.calendar.google.com/private-785c95aa858b003bdcbac749c233508d/basic.ics'

// 한국 공휴일 캘린더
const HOLIDAY_ICAL_URL =
  'https://calendar.google.com/calendar/ical/ko.south_korea%23holiday%40group.v.calendar.google.com/public/basic.ics'

const GoogleCalendarContext = createContext(null)

export function GoogleCalendarProvider({ children }) {
  const my       = useGoogleCalendar(MY_ICAL_URL)
  const holidays = useGoogleCalendar(HOLIDAY_ICAL_URL)

  // 두 캘린더의 시간대 이벤트 합산
  const getEventsForDate = useCallback((date) => {
    return [...my.getEventsForDate(date), ...holidays.getEventsForDate(date)]
  }, [my.getEventsForDate, holidays.getEventsForDate])

  // 공휴일 공식 캘린더 + 개인 캘린더 종일 이벤트 합산
  const getAllDayForDate = useCallback((date) => {
    return [...my.getAllDayForDate(date), ...holidays.getAllDayForDate(date)]
  }, [my.getAllDayForDate, holidays.getAllDayForDate])

  const value = {
    loading: my.loading || holidays.loading,
    error:   my.error || holidays.error,
    getEventsForDate,
    getAllDayForDate,
    refetch: () => { my.refetch(); holidays.refetch() },
  }

  return (
    <GoogleCalendarContext.Provider value={value}>
      {children}
    </GoogleCalendarContext.Provider>
  )
}

export function useGCal() {
  const ctx = useContext(GoogleCalendarContext)
  if (!ctx) throw new Error('useGCal must be used inside GoogleCalendarProvider')
  return ctx
}
