/**
 * 슬롯 설정 — 평일/주말 공부 시작·취침·식사 시각
 * 결정론적 스케줄러가 이 값을 사용해 가용 슬롯을 계산합니다.
 */
import { dbLoad, dbSave, localSave } from '../lib/db'

export const DEFAULT_SLOT_SETTINGS = {
  weekendSlotStart: '09:00',   // 주말 공부 시작 (평일은 학원 일정으로 자동 계산)
  hardDeadline:     '22:30',   // 취침 시간 (이후 절대 배치 금지)
  dinnerStart:      '18:00',   // 저녁 식사 시작
  dinnerEnd:        '19:00',   // 저녁 식사 종료
}

const KEY = 'slotSettings'

export function loadSlotSettings() {
  try {
    const saved = localStorage.getItem(`kid-scheduler:${KEY}`)
    if (!saved) return { ...DEFAULT_SLOT_SETTINGS }
    return { ...DEFAULT_SLOT_SETTINGS, ...JSON.parse(saved) }
  } catch {
    return { ...DEFAULT_SLOT_SETTINGS }
  }
}

export function saveSlotSettings(settings) {
  localSave(KEY, settings)
  dbSave(KEY, settings)
}

export async function syncSlotSettingsFromDB() {
  try {
    const remote = await dbLoad(KEY)
    if (!remote) return
    localSave(KEY, remote)
  } catch {
    // 오프라인이면 무시
  }
}
