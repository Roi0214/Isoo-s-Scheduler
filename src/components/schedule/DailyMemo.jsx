import { useState, useEffect, useRef, useCallback } from 'react'
import { NotebookPen, Check, Loader2, Wifi, WifiOff } from 'lucide-react'
import { useMemo_ } from '../../context/MemoContext'
import { supabase } from '../../lib/supabase'

const DEBOUNCE_MS = 800

export default function DailyMemo({ dateStr }) {
  const { getMemo, saveMemo, fetchMemo } = useMemo_()

  const [text, setText] = useState(() => getMemo(dateStr))
  const [status, setStatus] = useState('idle') // 'idle' | 'saving' | 'saved'
  const timerRef = useRef(null)
  const isMounted = useRef(true)

  // 날짜가 바뀌면 해당 날짜 메모 로드
  useEffect(() => {
    isMounted.current = true
    setText(getMemo(dateStr))
    fetchMemo(dateStr).then((remote) => {
      if (isMounted.current && remote !== null) {
        setText(remote)
      }
    })
    setStatus('idle')
    return () => {
      isMounted.current = false
      clearTimeout(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr])

  const handleChange = useCallback((e) => {
    const val = e.target.value
    setText(val)
    setStatus('saving')

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      await saveMemo(dateStr, val)
      if (isMounted.current) {
        setStatus('saved')
        setTimeout(() => {
          if (isMounted.current) setStatus('idle')
        }, 2000)
      }
    }, DEBOUNCE_MS)
  }, [dateStr, saveMemo])

  const isOnline = !!supabase

  return (
    <div className="mt-6 mb-2">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-slate-500">
          <NotebookPen size={14} />
          <span className="text-xs font-semibold">오늘의 메모</span>
        </div>

        <div className="flex items-center gap-1 text-[10px]">
          {status === 'saving' && (
            <>
              <Loader2 size={10} className="animate-spin text-indigo-400" />
              <span className="text-indigo-400">저장 중…</span>
            </>
          )}
          {status === 'saved' && (
            <>
              <Check size={10} className="text-emerald-500" />
              <span className="text-emerald-500">저장됨</span>
            </>
          )}
          {status === 'idle' && isOnline && (
            <>
              <Wifi size={10} className="text-slate-300" />
              <span className="text-slate-300">실시간 동기화</span>
            </>
          )}
          {status === 'idle' && !isOnline && (
            <>
              <WifiOff size={10} className="text-slate-300" />
              <span className="text-slate-300">로컬 저장</span>
            </>
          )}
        </div>
      </div>

      {/* 메모 입력창 */}
      <textarea
        value={text}
        onChange={handleChange}
        placeholder="이 날에 대한 메모를 입력하세요…"
        rows={3}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition leading-relaxed shadow-sm"
      />
    </div>
  )
}
