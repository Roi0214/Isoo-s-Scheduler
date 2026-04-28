import { useEffect } from 'react'
import { AppProvider, useApp, TABS } from './context/AppContext'
import { ScheduleProvider } from './context/ScheduleContext'
import { HomeworkProvider } from './context/HomeworkContext'
import { GoogleCalendarProvider } from './context/GoogleCalendarContext'
import { AIScheduleProvider } from './context/AIScheduleContext'
import Header from './components/layout/Header'
import BottomNav from './components/layout/BottomNav'
import SchedulePage from './pages/SchedulePage'
import HomeworkPage from './pages/HomeworkPage'
import WeeklyPage from './pages/WeeklyPage'
import { syncRulesFromDB } from './data/aiRules'
import './index.css'

function PageRouter() {
  const { activeTab } = useApp()

  if (activeTab === TABS.SCHEDULE) return <SchedulePage />
  if (activeTab === TABS.HOMEWORK) return <HomeworkPage />
  if (activeTab === TABS.WEEKLY)   return <WeeklyPage />
  return null
}

function AppShell() {
  useEffect(() => { syncRulesFromDB() }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-4 pb-20 overflow-y-auto">
        <PageRouter />
      </main>
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
            <AIScheduleProvider>
              <AppShell />
            </AIScheduleProvider>
          </GoogleCalendarProvider>
        </HomeworkProvider>
      </ScheduleProvider>
    </AppProvider>
  )
}
