export const BADGE_DEFINITIONS = [
  {
    id: 'first_session',
    title: 'First Step',
    description: 'Completed your very first revision session.',
    emoji: '🚀',
    condition: (sessions) => sessions.length >= 1,
  },
  {
    id: 'five_sessions',
    title: 'On a Roll',
    description: 'Completed 5 revision sessions.',
    emoji: '🔥',
    condition: (sessions) => sessions.length >= 5,
  },
  {
    id: 'ten_sessions',
    title: 'Revision Machine',
    description: 'Completed 10 revision sessions.',
    emoji: '⚡',
    condition: (sessions) => sessions.length >= 10,
  },
  {
    id: 'maths_started',
    title: 'Number Cruncher',
    description: 'Started revising Maths.',
    emoji: '📐',
    condition: (sessions) => sessions.some((s) => s.subjectId === 'maths'),
  },
  {
    id: 'english_started',
    title: 'Word Wizard',
    description: 'Started revising English.',
    emoji: '📖',
    condition: (sessions) => sessions.some((s) => s.subjectId === 'english'),
  },
  {
    id: 'science_started',
    title: 'Lab Coat Ready',
    description: 'Started revising Science.',
    emoji: '🔬',
    condition: (sessions) => sessions.some((s) => s.subjectId === 'science'),
  },
  {
    id: 'first_secure',
    title: 'Locked In',
    description: 'Marked your first checklist item as Secure.',
    emoji: '🔒',
    condition: (_sessions, subjects) => {
      for (const subject of subjects) {
        for (const topic of subject.topics) {
          if (topic.checklistItems.some((c) => c.status === 'secure')) return true
        }
      }
      return false
    },
  },
  {
    id: 'all_subjects',
    title: 'All-Rounder',
    description: 'Started at least one session for every subject.',
    emoji: '🌟',
    condition: (sessions, subjects) => {
      const coveredIds = new Set(sessions.map((s) => s.subjectId))
      return subjects.every((sub) => coveredIds.has(sub.id))
    },
  },
]
