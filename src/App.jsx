import { AppProvider, useApp, TABS } from './context/AppContext'
import { ScheduleProvider } from './context/ScheduleContext'
import { HomeworkProvider } from './context/HomeworkContext'
import { GoogleCalendarProvider } from './context/GoogleCalendarContext'
import Header from './components/layout/Header'
import BottomNav from './components/layout/BottomNav'
import SchedulePage from './pages/SchedulePage'
import HomeworkPage from './pages/HomeworkPage'
import WeeklyPage from './pages/WeeklyPage'
import './index.css'

// 탭에 따라 페이지를 전환하는 라우터 역할
function PageRouter() {
  const { activeTab } = useApp()

  if (activeTab === TABS.SCHEDULE) return <SchedulePage />
  if (activeTab === TABS.HOMEWORK) return <HomeworkPage />
  if (activeTab === TABS.WEEKLY) return <WeeklyPage />
  return null
}

function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 상단 고정 헤더 */}
      <Header />

      {/* 메인 콘텐츠 영역 — 헤더(56px) + 하단 네비(64px) 공간 확보 */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-4 pb-20 overflow-y-auto">
        <PageRouter />
      </main>

      {/* 하단 고정 네비게이션 */}
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <ScheduleProvider>
        <HomeworkProvider>
          <GoogleCalendarProvider>
            <AppShell />
          </GoogleCalendarProvider>
        </HomeworkProvider>
      </ScheduleProvider>
    </AppProvider>
  )
}
