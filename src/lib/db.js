/**
 * Supabase app_data 테이블 CRUD 헬퍼
 * - supabase 미설정 시 no-op (localStorage 전용 모드)
 *
 * 타임스탬프 전략:
 *   로컬 저장 시 → kid-scheduler:ts:{key} 갱신
 *   Supabase 저장 성공 시 → kid-scheduler:ts:{key} 갱신 (Supabase 서버 시각으로)
 *   Supabase 로드 시 → 로컬 타임스탬프와 비교, 로컬이 더 최신이면 무시
 */
import { supabase } from './supabase'

const TABLE = 'app_data'
const LS_PREFIX = 'kid-scheduler:'

/**
 * localStorage 저장 + 타임스탬프 갱신 헬퍼
 * key: DB 키 (접두사 없이, e.g. 'homeworks')
 * value: 직렬화할 값
 */
export function localSave(key, value) {
  if (value === null || value === undefined) {
    localStorage.removeItem(`${LS_PREFIX}${key}`)
    localStorage.removeItem(`${LS_PREFIX}ts:${key}`)
  } else {
    localStorage.setItem(`${LS_PREFIX}${key}`, JSON.stringify(value))
    localStorage.setItem(`${LS_PREFIX}ts:${key}`, new Date().toISOString())
  }
}

/**
 * key에 해당하는 데이터 로드.
 * - Supabase의 updated_at이 로컬 타임스탬프보다 새로울 때만 값 반환
 * - 로컬이 더 최신이거나 실패 시 null 반환 (로컬 상태 유지)
 */
export async function dbLoad(key) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('value, updated_at')
      .eq('key', key)
      .maybeSingle()
    if (error) throw error
    if (!data) return null

    const localTs = localStorage.getItem(`${LS_PREFIX}ts:${key}`) ?? '1970-01-01T00:00:00.000Z'
    if (data.updated_at <= localTs) {
      console.log(`[DB] "${key}" — 로컬이 최신 (${localTs}), Supabase 로드 건너뜀`)
      return null
    }

    // Supabase가 더 최신 → 로컬 타임스탬프를 Supabase 시각으로 맞춤
    localStorage.setItem(`${LS_PREFIX}ts:${key}`, data.updated_at)
    console.log(`[DB] "${key}" — Supabase 최신 (${data.updated_at}), 로드 적용`)
    return data.value
  } catch (err) {
    console.error(`[DB] load "${key}" 실패:`, err.message)
    return null
  }
}

/** key에 데이터 저장 (upsert). 성공 시 로컬 타임스탬프도 갱신 */
export async function dbSave(key, value) {
  if (!supabase) return
  try {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from(TABLE)
      .upsert({ key, value, updated_at: now }, { onConflict: 'key' })
    if (error) throw error
    // 저장 성공 시 로컬 타임스탬프를 서버 시각으로 동기화
    localStorage.setItem(`${LS_PREFIX}ts:${key}`, now)
  } catch (err) {
    console.error(`[DB] save "${key}" 실패:`, err.message)
  }
}
