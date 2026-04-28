/**
 * Supabase app_data 테이블 CRUD 헬퍼
 * - supabase 미설정 시 no-op (localStorage 전용 모드)
 */
import { supabase } from './supabase'

const TABLE = 'app_data'

/** key에 해당하는 데이터 로드. 없거나 실패 시 null 반환 */
export async function dbLoad(key) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('value')
      .eq('key', key)
      .maybeSingle()
    if (error) throw error
    return data?.value ?? null
  } catch (err) {
    console.error(`[DB] load "${key}" 실패:`, err.message)
    return null
  }
}

/** key에 데이터 저장 (upsert). 실패 시 콘솔 경고만 */
export async function dbSave(key, value) {
  if (!supabase) return
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) throw error
  } catch (err) {
    console.error(`[DB] save "${key}" 실패:`, err.message)
  }
}
