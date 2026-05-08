import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const MemoContext = createContext(null)

const LS_PREFIX = 'kid-scheduler:memo:'

function lsKey(dateStr) {
  return `${LS_PREFIX}${dateStr}`
}

function loadLocal(dateStr) {
  try {
    return localStorage.getItem(lsKey(dateStr)) ?? ''
  } catch {
    return ''
  }
}

function saveLocal(dateStr, text) {
  try {
    localStorage.setItem(lsKey(dateStr), text)
  } catch {}
}

export function MemoProvider({ children }) {
  // { [dateStr]: string }
  const [memos, setMemos] = useState({})
  const channelRef = useRef(null)

  // Supabase Realtime 구독 — app_data 테이블의 memo: 키 변경 감지
  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel('daily-memos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_data' },
        (payload) => {
          const row = payload.new ?? payload.old
          if (!row?.key?.startsWith('memo:')) return

          const dateStr = row.key.slice(5) // 'memo:' 제거
          const text = (payload.eventType === 'DELETE') ? '' : (row.value?.text ?? '')

          setMemos(prev => {
            // 자신이 방금 저장한 내용이 돌아오는 경우 무시 (낙관적 업데이트 이미 반영)
            if (prev[dateStr] === text) return prev
            return { ...prev, [dateStr]: text }
          })
          saveLocal(dateStr, text)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  /** 특정 날짜의 메모 텍스트 반환 (없으면 localStorage에서 로드) */
  const getMemo = useCallback((dateStr) => {
    if (dateStr in memos) return memos[dateStr]
    const local = loadLocal(dateStr)
    if (local) {
      setMemos(prev => ({ ...prev, [dateStr]: local }))
    }
    return local
  }, [memos])

  /** 메모 저장 — 낙관적 업데이트 후 Supabase upsert */
  const saveMemo = useCallback(async (dateStr, text) => {
    // 낙관적 업데이트
    setMemos(prev => ({ ...prev, [dateStr]: text }))
    saveLocal(dateStr, text)

    if (!supabase) return

    const key = `memo:${dateStr}`
    const now = new Date().toISOString()
    try {
      const { error } = await supabase
        .from('app_data')
        .upsert({ key, value: { text }, updated_at: now }, { onConflict: 'key' })
      if (error) throw error
    } catch (err) {
      console.error('[MemoContext] 저장 실패:', err.message)
    }
  }, [])

  /** 날짜 전환 시 Supabase에서 최신 메모 로드. 로드된 텍스트 반환 (없으면 null) */
  const fetchMemo = useCallback(async (dateStr) => {
    if (!supabase) return null

    try {
      const { data, error } = await supabase
        .from('app_data')
        .select('value, updated_at')
        .eq('key', `memo:${dateStr}`)
        .maybeSingle()
      if (error) throw error
      if (!data) return null

      const text = data.value?.text ?? ''
      setMemos(prev => ({ ...prev, [dateStr]: text }))
      saveLocal(dateStr, text)
      return text
    } catch (err) {
      console.error('[MemoContext] 로드 실패:', err.message)
      return null
    }
  }, [])

  return (
    <MemoContext.Provider value={{ getMemo, saveMemo, fetchMemo }}>
      {children}
    </MemoContext.Provider>
  )
}

export function useMemo_() {
  const ctx = useContext(MemoContext)
  if (!ctx) throw new Error('useMemo_ must be used inside MemoProvider')
  return ctx
}
