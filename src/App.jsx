import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext.jsx'
import Layout from './components/Layout.jsx'
import Setup from './screens/Setup.jsx'
import Dashboard from './screens/Dashboard.jsx'
import SubjectList from './screens/SubjectList.jsx'
import SubjectDetail from './screens/SubjectDetail.jsx'
import RevisionSession from './screens/RevisionSession.jsx'
import Flashcards from './screens/Flashcards.jsx'
import Activity from './screens/Activity.jsx'
import Progress from './screens/Progress.jsx'
import ParentDashboard from './screens/ParentDashboard.jsx'
import Settings from './screens/Settings.jsx'

function AppRoutes() {
  const { profile } = useApp()

  if (!profile) {
    return (
      <Routes>
        <Route path="*" element={<Setup />} />
      </Routes>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/subjects" element={<SubjectList />} />
        <Route path="/subjects/:subjectId" element={<SubjectDetail />} />
        <Route path="/session" element={<RevisionSession />} />
        <Route path="/session/:subjectId" element={<RevisionSession />} />
        <Route path="/flashcards" element={<Navigate to="/activity" replace />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/activity/:subjectId" element={<Activity />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/parent" element={<ParentDashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  )
}
