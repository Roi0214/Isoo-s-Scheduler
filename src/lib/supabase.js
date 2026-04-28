import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('[Supabase] 환경변수 미설정 — localStorage 전용 모드')
}

export const supabase = (url && key) ? createClient(url, key) : null
