import { createContext, useContext, useState } from 'react'

// 탭 상수 정의 — 추후 라우트 연동 시 이 값을 키로 사용
export const TABS = {
  SCHEDULE: 'schedule',
  HOMEWORK: 'homework',
  WEEKLY: 'weekly',
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [activeTab, setActiveTab] = useState(TABS.SCHEDULE)

  return (
    <AppContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
