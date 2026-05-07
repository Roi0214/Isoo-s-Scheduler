/**
 * 데이터 버전 관리
 * - 이 값을 바꾸면 모든 기기의 localStorage가 초기화되어 코드에 박힌 기본값으로 재시작
 * - 사용법: PC에서 데이터 수정 후 → scheduleData.js / homeworkData.js 기본값 업데이트 → 이 버전 bump → 배포
 */
export const DATA_VERSION = '2026-05-07-v1'

export function checkAndResetIfNeeded() {
  const KEY = 'kid-scheduler:dataVersion'
  if (localStorage.getItem(KEY) !== DATA_VERSION) {
    // 기존 모든 kid-scheduler 데이터 제거 → 코드의 기본값으로 재시작
    Object.keys(localStorage)
      .filter(k => k.startsWith('kid-scheduler:'))
      .forEach(k => localStorage.removeItem(k))
    localStorage.setItem(KEY, DATA_VERSION)
    console.log('[DataVersion] 새 버전 감지 → localStorage 초기화:', DATA_VERSION)
  }
}
