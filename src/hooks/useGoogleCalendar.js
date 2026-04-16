import { useState, useEffect, useCallback } from 'react'
import ICAL from 'ical.js'

const PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
]

// 타임아웃 포함 fetch (AbortSignal.timeout 미지원 브라우저 대응)
async function fetchWithTimeout(url, ms = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: 'no-cache',                          // 브라우저 캐시 무시
      headers: { 'Cache-Control': 'no-cache' },
    })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchWithFallback(icalUrl) {
  // 1) 직접 시도
  try {
    const res  = await fetchWithTimeout(icalUrl, 5000)
    const text = await res.text()
    if (text.includes('BEGIN:VCALENDAR')) {
      console.log('[GCal] 직접 fetch 성공')
      return text
    }
  } catch (e) {
    console.warn('[GCal] 직접 fetch 실패:', e.message)
  }

  // 2) 프록시 순차 시도
  for (const makeUrl of PROXIES) {
    const proxyUrl = makeUrl(icalUrl)
    try {
      const res  = await fetchWithTimeout(proxyUrl)
      if (!res.ok) { console.warn('[GCal] proxy HTTP', res.status, proxyUrl); continue }
      const text = await res.text()
      if (text.includes('BEGIN:VCALENDAR')) {
        console.log('[GCal] proxy 성공:', proxyUrl)
        return text
      }
      console.warn('[GCal] proxy 응답이 ICS 아님:', text.slice(0, 120))
    } catch (e) {
      console.warn('[GCal] proxy 실패:', proxyUrl, e.message)
    }
  }

  throw new Error('모든 경로 실패 — 캘린더가 공개/비밀 주소인지 확인해 주세요.')
}

// floating time (TZID 없음) 여부
function isFloating(icalTime) {
  return icalTime.zone === ICAL.Timezone.localTimezone
}

// ICAL.Time → 'YYYY-MM-DD'
function toDateStr(icalTime) {
  if (isFloating(icalTime)) {
    return `${icalTime.year}-${String(icalTime.month).padStart(2,'0')}-${String(icalTime.day).padStart(2,'0')}`
  }
  return icalTime.toJSDate().toLocaleDateString('sv-SE')
}

// ICAL.Time → 'HH:MM'
function toTimeStr(icalTime) {
  if (isFloating(icalTime)) {
    return `${String(icalTime.hour).padStart(2,'0')}:${String(icalTime.minute).padStart(2,'0')}`
  }
  const d = icalTime.toJSDate()
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

// 범위 비교용 Date
function toCompareDate(icalTime) {
  if (isFloating(icalTime)) {
    return new Date(icalTime.year, icalTime.month - 1, icalTime.day, icalTime.hour, icalTime.minute)
  }
  return icalTime.toJSDate()
}

function buildEntry(uid, startDate, endDate, summary) {
  const allDay = startDate.isDate
  return {
    id:        `gcal-${uid}-${startDate.toString()}`,
    title:     summary || '(제목 없음)',
    date:      toDateStr(startDate),
    startTime: allDay ? '00:00' : toTimeStr(startDate),
    endTime:   allDay ? '23:59' : toTimeStr(endDate),
    allDay,
    isExternal: true,
  }
}

function expandEvents(comp, rangeStart, rangeEnd) {
  for (const tz of comp.getAllSubcomponents('vtimezone')) {
    try { ICAL.TimezoneService.register(new ICAL.Timezone(tz)) } catch (_) {}
  }

  const results = []
  for (const vevent of comp.getAllSubcomponents('vevent')) {
    try {
      const ev = new ICAL.Event(vevent)
      if (!ev.startDate) continue

      if (ev.isRecurring()) {
        const iter  = ev.iterator()
        let next
        let guard   = 0
        while ((next = iter.next()) && guard++ < 500) {
          const cmp = toCompareDate(next)
          if (cmp > rangeEnd)   break
          if (cmp < rangeStart) continue
          const occ = ev.getOccurrenceDetails(next)
          results.push(buildEntry(ev.uid, occ.startDate, occ.endDate, ev.summary))
        }
      } else {
        const cmp = toCompareDate(ev.startDate)
        if (cmp >= rangeStart && cmp <= rangeEnd) {
          results.push(buildEntry(ev.uid, ev.startDate, ev.endDate, ev.summary))
        }
      }
    } catch (_) {}
  }
  return results
}

export function useGoogleCalendar(icalUrl) {
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const fetchAndParse = useCallback(async () => {
    if (!icalUrl) return
    setLoading(true)
    setError(null)
    try {
      const text = await fetchWithFallback(icalUrl)
      const comp = new ICAL.Component(ICAL.parse(text))

      const now        = new Date()
      const rangeStart = new Date(now); rangeStart.setMonth(now.getMonth() - 3)
      const rangeEnd   = new Date(now); rangeEnd.setMonth(now.getMonth() + 6)

      const parsed = expandEvents(comp, rangeStart, rangeEnd)
      console.log(`[GCal] 파싱 완료 (${icalUrl.slice(0,40)}…): ${parsed.length}개`)
      setEvents(parsed)
    } catch (err) {
      console.error('[GCal] 최종 실패:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [icalUrl])

  // 마운트 시 + 30분마다 갱신
  useEffect(() => {
    fetchAndParse()
    const timer = setInterval(fetchAndParse, 30 * 60 * 1000)
    return () => clearInterval(timer)
  }, [fetchAndParse])

  // 탭/창이 다시 포커스될 때도 갱신
  useEffect(() => {
    const onFocus = () => fetchAndParse()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [fetchAndParse])

  const getEventsForDate = useCallback((date) => {
    const dateStr = date.toLocaleDateString('sv-SE')
    return events.filter(e => e.date === dateStr && !e.allDay)
  }, [events])

  const getAllDayForDate = useCallback((date) => {
    const dateStr = date.toLocaleDateString('sv-SE')
    return events.filter(e => e.date === dateStr && e.allDay)
  }, [events])

  return { loading, error, getEventsForDate, getAllDayForDate, refetch: fetchAndParse }
}
