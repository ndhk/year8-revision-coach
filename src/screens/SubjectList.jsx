import React from 'react'
import { useApp } from '../context/AppContext.jsx'
import SubjectCard from '../components/SubjectCard.jsx'

export default function SubjectList() {
  const { subjects } = useApp()

  return (
    <div className="screen">
      <p className="screen__sub">Tap a subject to see topics and checklist items.</p>
      <div className="subject-grid">
        {subjects.map((subject) => (
          <SubjectCard key={subject.id} subject={subject} showDetail />
        ))}
      </div>
    </div>
  )
}
