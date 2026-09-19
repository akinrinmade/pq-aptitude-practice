import Papa from 'papaparse'
import { type ChangeEvent, useEffect, useMemo, useState } from 'react'

type ParseHeader = string

type QuestionType = 'Tech' | 'Numerical' | 'Verbal' | 'Logical' | 'Abstract'
type Difficulty = 'Easy' | 'Medium' | 'Hard'

type Question = {
  id: string
  type: QuestionType
  difficulty: Difficulty
  prompt: string
  options: string[]
  answerIndex: number | null
  explanation: string
}

type AttemptRecord = {
  id: string
  date: string
  score: number
  total: number
  timeSpent: number
  accuracy: number
  mode: 'Practice' | 'Timed Mock'
}

const STORAGE_BANK_KEY = 'pq-aptitude-bank-v3'
const STORAGE_HISTORY_KEY = 'pq-aptitude-history'

const defaultQuestions: Question[] = [
  {
    id: 'q1',
    type: 'Numerical',
    difficulty: 'Medium',
    prompt: 'A machine produces 240 units in 6 hours. At the same rate, how many units will it produce in 9 hours?',
    options: ['300', '330', '360', '420'],
    answerIndex: 2,
    explanation: '240 ÷ 6 = 40 units per hour, so 40 × 9 = 360.',
  },
  {
    id: 'q2',
    type: 'Verbal',
    difficulty: 'Easy',
    prompt: 'Select the option that most closely matches the meaning of the word “pragmatic”.',
    options: ['Idealistic', 'Practical', 'Cautious', 'Vague'],
    answerIndex: 1,
    explanation: 'Pragmatic means practical and focused on real-world results.',
  },
  {
    id: 'q3',
    type: 'Logical',
    difficulty: 'Hard',
    prompt: 'All analysts are detail-oriented. Some detail-oriented people are not managers. Which conclusion is valid?',
    options: [
      'All analysts are managers',
      'Some analysts are managers',
      'Some managers are analysts',
      'No conclusion follows',
    ],
    answerIndex: 3,
    explanation: 'The premises do not connect analysts to managers, so no valid conclusion can be drawn.',
  },
  {
    id: 'q4',
    type: 'Numerical',
    difficulty: 'Easy',
    prompt: 'If a salary rises from 2,400 to 2,640, what is the percentage increase?',
    options: ['8%', '10%', '12%', '15%'],
    answerIndex: 1,
    explanation: 'Increase is 240; 240 ÷ 2,400 = 0.10, or 10%.',
  },
  {
    id: 'q5',
    type: 'Abstract',
    difficulty: 'Medium',
    prompt: 'Which option completes the pattern: 2, 6, 12, 20, ?',
    options: ['28', '30', '32', '36'],
    answerIndex: 0,
    explanation: 'The sequence increases by 4, 6, 8, 10, so the next value is 28.',
  },
  {
    id: 'q6',
    type: 'Verbal',
    difficulty: 'Medium',
    prompt: 'Choose the sentence that is grammatically correct.',
    options: [
      'The team were pleased with their progress.',
      'The team was pleased with their progress.',
      'The team were pleased with its progress.',
      'The team was pleased with its progresss.',
    ],
    answerIndex: 1,
    explanation: '“Team” is singular here, so “was” is correct; “their” is acceptable in modern usage.',
  },
  {
    id: 'q7',
    type: 'Logical',
    difficulty: 'Hard',
    prompt: 'If every consultant is a specialist and some specialists are trainers, which statement must be true?',
    options: [
      'All trainers are consultants',
      'Some consultants are trainers',
      'All specialists are consultants',
      'Some specialists are not trainers',
    ],
    answerIndex: 3,
    explanation: 'Because not all specialists are trainers, it must be true that some specialists are not trainers.',
  },
  {
    id: 'q8',
    type: 'Abstract',
    difficulty: 'Easy',
    prompt: 'Which number should replace the question mark? 3, 9, 27, 81, ?',
    options: ['162', '243', '324', '729'],
    answerIndex: 1,
    explanation: 'Each term is multiplied by 3, so 81 × 3 = 243.',
  },
]

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.max(0, seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const parseOptionsFromField = (value: string | undefined) => {
  if (!value) return []
  const cleaned = value.trim()
  if (!cleaned) return []

  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === 'string')
  } catch {
    // ignore
  }

  return cleaned
    .split(/\||\n|\r\n|;\s*/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `q-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const normalizeImportedQuestion = (raw: Record<string, unknown>, index: number): Question | null => {
  const prompt = String(raw.prompt ?? raw.question ?? raw.statement ?? raw.problem ?? '').trim()
  if (!prompt) return null

  const schemaOptions = ['option_a', 'option_b', 'option_c', 'option_d', 'option_e']
    .map((key) => raw[key])
    .filter((entry) => typeof entry === 'string' && entry.trim())
  const optionsField = schemaOptions.length > 0 ? schemaOptions : raw.options ?? raw.answers ?? raw.choices ?? raw.option_list
  const optionList = Array.isArray(optionsField)
    ? optionsField.filter((entry) => typeof entry === 'string').map((entry) => String(entry))
    : parseOptionsFromField(typeof optionsField === 'string' ? optionsField : undefined)

  const literalOptions = optionList.length > 0 ? optionList : ['Option A', 'Option B', 'Option C', 'Option D']

  const correctOption = String(raw.correct_option ?? '').trim().toUpperCase()
  const rawAnswer = raw.answerIndex ?? raw.correctIndex ?? raw.correct ?? raw.answer
  const answerValue = Number(rawAnswer ?? 0)
  const answerIndex = rawAnswer === null
    ? null
    : correctOption.length === 1 && 'ABCDE'.includes(correctOption)
    ? 'ABCDE'.indexOf(correctOption)
    : Number.isFinite(answerValue) && answerValue >= 0 ? answerValue : 0

  const qType = String(raw.section ?? raw.type ?? raw.category ?? 'Numerical').trim() as QuestionType
  const qDifficulty = String(raw.difficulty ?? raw.level ?? 'Medium').trim().toLowerCase()

  return {
    id: String(raw.id ?? `import-${index + 1}`),
    type: qType in ['Tech', 'Numerical', 'Verbal', 'Logical', 'Abstract'] ? qType : 'Numerical',
    difficulty: qDifficulty === 'easy' ? 'Easy' : qDifficulty === 'hard' ? 'Hard' : 'Medium',
    prompt,
    options: literalOptions.slice(0, 5),
    answerIndex: answerIndex === null ? null : Math.min(answerIndex, literalOptions.length - 1),
    explanation: String(raw.explanation ?? 'No explanation provided for this item.'),
  }
}

function App() {
  const [questions, setQuestions] = useState<Question[]>(() => {
    if (typeof window === 'undefined') return defaultQuestions
    const saved = window.localStorage.getItem(STORAGE_BANK_KEY)
    if (!saved) return defaultQuestions

    try {
      const parsed = JSON.parse(saved) as Question[]
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultQuestions
    } catch {
      return defaultQuestions
    }
  })
  const [screen, setScreen] = useState<'setup' | 'exam' | 'results'>('setup')
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number | null>>({})
  const [flagged, setFlagged] = useState<Record<string, boolean>>({})
  const [durationMinutes, setDurationMinutes] = useState(20)
  const [questionCount, setQuestionCount] = useState(8)
  const [sectionFilter, setSectionFilter] = useState<'Balanced' | QuestionType>('Balanced')
  const [difficultyFilter, setDifficultyFilter] = useState<'Mixed' | Difficulty>('Mixed')
  const [mode, setMode] = useState<'Practice' | 'Timed Mock'>('Timed Mock')
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60)
  const [importError, setImportError] = useState('')
  const [history, setHistory] = useState<AttemptRecord[]>(() => {
    if (typeof window === 'undefined') return []
    const saved = window.localStorage.getItem(STORAGE_HISTORY_KEY)
    if (!saved) return []

    try {
      return JSON.parse(saved) as AttemptRecord[]
    } catch {
      return []
    }
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_BANK_KEY, JSON.stringify(questions))
  }, [questions])

  useEffect(() => {
    if (questions !== defaultQuestions) return

    fetch('/question-bank.json')
      .then((response) => {
        if (!response.ok) throw new Error('Bundled question bank unavailable')
        return response.json() as Promise<Record<string, unknown>[]>
      })
      .then((rawQuestions) => {
        const bundledQuestions = rawQuestions
          .map((question, index) => normalizeImportedQuestion(question, index))
          .filter((question): question is Question => question !== null)
        if (bundledQuestions.length > 0) setQuestions(bundledQuestions)
      })
      .catch(() => undefined)
  }, [questions])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history))
  }, [history])

  useEffect(() => {
    if (screen !== 'exam') return

    const countdown = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(countdown)
          setScreen('results')
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(countdown)
  }, [screen])

  const activeQuestionPool = useMemo(() => {
    const sectionPool = sectionFilter === 'Balanced' ? questions : questions.filter((question) => question.type === sectionFilter)
    const difficultyPool = difficultyFilter === 'Mixed'
      ? sectionPool
      : sectionPool.filter((question) => question.difficulty === difficultyFilter)
    const fallbackPool = difficultyPool.length >= questionCount ? difficultyPool : sectionPool

    if (sectionFilter !== 'Balanced') return fallbackPool.slice(0, Math.min(questionCount, fallbackPool.length))

    const balanced: Question[] = []
    const buckets = ['Numerical', 'Verbal', 'Logical', 'Abstract'] as QuestionType[]
    let position = 0
    while (balanced.length < Math.min(questionCount, fallbackPool.length) && position < fallbackPool.length * 2) {
      const bucket = buckets[position % buckets.length]
      const next = fallbackPool.find((question) => question.type === bucket && !balanced.some((item) => item.id === question.id))
      if (next) balanced.push(next)
      position += 1
    }

    return balanced.length > 0 ? balanced : fallbackPool.slice(0, questionCount)
  }, [difficultyFilter, questionCount, questions, sectionFilter])

  const currentQuestion = selectedQuestions[currentIndex] ?? null

  const answeredCount = Object.values(answers).filter((value) => value !== null && value !== undefined).length
  const score = selectedQuestions.reduce((total, question) => {
    return total + (answers[question.id] === question.answerIndex ? 1 : 0)
  }, 0)
  const accuracy = selectedQuestions.length > 0 ? Math.round((score / selectedQuestions.length) * 100) : 0

  const handleStartExam = () => {
    const examSet = activeQuestionPool.length > 0
      ? activeQuestionPool
      : defaultQuestions.slice(0, Math.min(questionCount, defaultQuestions.length))

    setSelectedQuestions(examSet)
    setAnswers({})
    setFlagged({})
    setCurrentIndex(0)
    setTimeLeft(durationMinutes * 60)
    setScreen('exam')
  }

  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    setAnswers((previous) => ({ ...previous, [questionId]: optionIndex }))
  }

  const handleSubmitExam = () => {
    const total = selectedQuestions.length
    const finalScore = selectedQuestions.reduce((count, question) => {
      return count + (answers[question.id] === question.answerIndex ? 1 : 0)
    }, 0)
    const spent = durationMinutes * 60 - timeLeft
    const attempt: AttemptRecord = {
      id: createId(),
      date: new Date().toISOString(),
      score: finalScore,
      total,
      timeSpent: spent,
      accuracy: total > 0 ? Math.round((finalScore / total) * 100) : 0,
      mode,
    }

    setHistory((previous) => [attempt, ...previous].slice(0, 8))
    setScreen('results')
  }

  const handleReset = () => {
    setScreen('setup')
    setSelectedQuestions([])
    setAnswers({})
    setFlagged({})
    setCurrentIndex(0)
    setTimeLeft(durationMinutes * 60)
  }

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const normalized: Question[] = []

      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(text)
        const rawList = Array.isArray(parsed) ? parsed : [parsed]
        for (const [index, entry] of rawList.entries()) {
          const result = normalizeImportedQuestion(entry as Record<string, unknown>, index)
          if (result) normalized.push(result)
        }
      } else if (file.name.toLowerCase().endsWith('.csv')) {
        const parsed = Papa.parse<Record<string, string>>(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: ParseHeader) => header.trim().toLowerCase(),
        })

        for (const [index, row] of parsed.data.entries()) {
          const result = normalizeImportedQuestion(row as Record<string, unknown>, index)
          if (result) normalized.push(result)
        }
      } else {
        throw new Error('Unsupported file type. Please use JSON or CSV.')
      }

      if (normalized.length === 0) {
        throw new Error('No valid questions were detected in the imported file.')
      }

      setQuestions(normalized)
      setQuestionCount(Math.min(questionCount, normalized.length))
      setImportError('')
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'The file could not be imported.')
    } finally {
      event.target.value = ''
    }
  }

  const downloadImportFile = (format: 'json' | 'csv') => {
    const sample = defaultQuestions.map((question) => ({
      id: question.id,
      type: question.type,
      difficulty: question.difficulty,
      prompt: question.prompt,
      options: question.options,
      answerIndex: question.answerIndex,
      explanation: question.explanation,
    }))
    const content = format === 'json'
      ? JSON.stringify(sample, null, 2)
      : Papa.unparse(sample.map((question) => ({ ...question, options: JSON.stringify(question.options) })))
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `pq-question-template.${format}`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const timerTone = timeLeft <= 60 ? 'border-rose-300 bg-rose-50 text-rose-700' : timeLeft <= 300 ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-sky-200 bg-sky-50 text-sky-700'
  const progressPercent = selectedQuestions.length > 0 ? Math.round((answeredCount / selectedQuestions.length) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        <header className="panel mb-6 flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Aptitude Practice</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">Assessment Simulator</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {mode}
            </span>
            {screen === 'exam' && (
              <div className={`rounded-full border px-3 py-1 text-sm font-semibold ${timerTone}`}>
                {formatTime(timeLeft)}
              </div>
            )}
          </div>
        </header>

        {screen === 'setup' && (
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <section className="panel p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-sky-700">Candidate Ready</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Prepare for your timed assessment</h2>
                </div>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
                  onClick={() => setQuestions(defaultQuestions)}
                >
                  Reset sample bank
                </button>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Mode</span>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none ring-0"
                    value={mode}
                    onChange={(event) => setMode(event.target.value as 'Practice' | 'Timed Mock')}
                  >
                    <option value="Practice">Practice</option>
                    <option value="Timed Mock">Timed Mock</option>
                  </select>
                </label>

                <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Section focus</span>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none ring-0"
                    value={sectionFilter}
                    onChange={(event) => setSectionFilter(event.target.value as 'Balanced' | QuestionType)}
                  >
                    <option value="Balanced">Balanced assessment</option>
                    <option value="Tech">Technical aptitude</option>
                    <option value="Numerical">Numerical reasoning</option>
                    <option value="Verbal">Verbal reasoning</option>
                    <option value="Logical">Logical reasoning</option>
                    <option value="Abstract">Abstract reasoning</option>
                  </select>
                </label>

                <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Difficulty</span>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none ring-0"
                    value={difficultyFilter}
                    onChange={(event) => setDifficultyFilter(event.target.value as 'Mixed' | Difficulty)}
                  >
                    <option value="Mixed">Mixed difficulty</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </label>

                <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Duration</span>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none ring-0"
                    value={durationMinutes}
                    onChange={(event) => setDurationMinutes(Number(event.target.value))}
                  >
                    <option value={10}>10 minutes</option>
                    <option value={20}>20 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                  </select>
                </label>

                <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Questions</span>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none ring-0"
                    value={questionCount}
                    onChange={(event) => setQuestionCount(Number(event.target.value))}
                  >
                    <option value={5}>5</option>
                    <option value={8}>8</option>
                    <option value={10}>10</option>
                    <option value={12}>12</option>
                    <option value={20}>20</option>
                    <option value={60}>60</option>
                  </select>
                </label>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Question Bank</span>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    <span>{questions.length} loaded</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Ready</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Import custom questions</p>
                    <p className="text-sm text-slate-500">JSON or CSV accepted</p>
                  </div>
                  <label className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                    Upload file
                    <input type="file" accept=".json,.csv" className="hidden" onChange={handleFileImport} />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-300" onClick={() => downloadImportFile('json')}>
                    Download JSON template
                  </button>
                  <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-300" onClick={() => downloadImportFile('csv')}>
                    Download CSV template
                  </button>
                </div>
                {importError && <p className="mt-3 text-sm text-red-600">{importError}</p>}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  className="rounded-xl bg-sky-600 px-5 py-3 text-base font-semibold text-white shadow-sm hover:bg-sky-500"
                  onClick={handleStartExam}
                >
                  Start assessment
                </button>
              </div>
            </section>

            <aside className="space-y-4">
              <div className="metric-card">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Overview</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-sm text-slate-500">Question mix</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {['Tech', 'Numerical', 'Verbal', 'Logical', 'Abstract'].map((type) => {
                        const count = questions.filter((q) => q.type === type).length
                        return (
                          <span key={type} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {type}: {count}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Selected profile</p>
                    <p className="mt-2 text-sm font-medium text-slate-800">{sectionFilter} · {difficultyFilter}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Best practices</p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-700">
                      <li>• Work through each question quickly</li>
                      <li>• Skip and return if needed</li>
                      <li>• Review flagged items before submitting</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Recent results</p>
                <div className="mt-4 space-y-3">
                  {history.length === 0 ? (
                    <p className="text-sm text-slate-500">No saved attempts yet.</p>
                  ) : (
                    history.slice(0, 4).map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-800">{entry.mode}</span>
                          <span className="text-slate-500">{new Date(entry.date).toLocaleDateString()}</span>
                        </div>
                        <p className="mt-2 text-lg font-semibold text-slate-900">
                          {entry.score}/{entry.total}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}

        {screen === 'exam' && currentQuestion && (
          <>
            <div className="panel mb-6 grid gap-4 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800">Assessment progress</span>
                  <span className="text-slate-500">{answeredCount} of {selectedQuestions.length} answered</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-sky-600 transition-[width]" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
              <div className={`rounded-xl border px-4 py-2 ${timerTone}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">Time remaining</p>
                <p className="mt-0.5 text-xl font-bold tabular-nums">{formatTime(timeLeft)}</p>
              </div>
              <p className="max-w-48 text-xs leading-5 text-slate-500">Your assessment submits automatically when the timer reaches zero.</p>
            </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <section className="panel p-6">
              <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Question {currentIndex + 1}</p>
                  <p className="mt-1 text-sm text-slate-500">{currentQuestion.type} reasoning · {currentQuestion.difficulty}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
                    onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
                    disabled={currentIndex === 0}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
                    onClick={() => setCurrentIndex((value) => Math.min(selectedQuestions.length - 1, value + 1))}
                    disabled={currentIndex === selectedQuestions.length - 1}
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="mb-6 rounded-2xl bg-slate-50 p-5">
                <p className="text-lg font-medium leading-8 text-slate-900">{currentQuestion.prompt}</p>
              </div>

              <div className="space-y-3">
                {currentQuestion.options.map((option, optionIndex) => {
                  const isSelected = answers[currentQuestion.id] === optionIndex
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleAnswerSelect(currentQuestion.id, optionIndex)}
                      className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                        isSelected
                          ? 'border-sky-600 bg-sky-50 text-sky-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border text-sm font-semibold ${
                          isSelected ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 bg-slate-100 text-slate-700'
                        }`}
                      >
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span className="flex-1 leading-7">{option}</span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                    flagged[currentQuestion.id]
                      ? 'border-amber-300 bg-amber-100 text-amber-700'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                  onClick={() =>
                    setFlagged((previous) => ({
                      ...previous,
                      [currentQuestion.id]: !previous[currentQuestion.id],
                    }))
                  }
                >
                  {flagged[currentQuestion.id] ? 'Flagged' : 'Flag for review'}
                </button>

                <button
                  type="button"
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
                  onClick={handleSubmitExam}
                >
                  Submit assessment
                </button>
              </div>
            </section>

            <aside className="space-y-4">
              <div className="metric-card">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Progress</p>
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                    <span>{answeredCount} answered</span>
                    <span>{selectedQuestions.length} total</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-sky-600"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Question map</p>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {selectedQuestions.map((question, index) => {
                    const isCurrent = index === currentIndex
                    const isAnswered = answers[question.id] !== undefined && answers[question.id] !== null
                    const isFlaggedItem = flagged[question.id]

                    return (
                      <button
                        key={question.id}
                        type="button"
                        className={`relative flex h-10 items-center justify-center rounded-xl border text-sm font-medium ${
                          isCurrent
                            ? 'border-sky-600 bg-sky-50 text-sky-700'
                            : isAnswered
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                        onClick={() => setCurrentIndex(index)}
                      >
                        {index + 1}
                        {isFlaggedItem && (
                          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-white bg-amber-400" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </aside>
          </div>
          </>
        )}

        {screen === 'results' && (
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <section className="panel p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Results</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900">{score}/{selectedQuestions.length}</h2>
              <p className="mt-2 text-sm text-slate-500">Accuracy: {accuracy}%</p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Correct</p>
                  <p className="mt-3 text-2xl font-semibold text-emerald-600">{score}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Wrong</p>
                  <p className="mt-3 text-2xl font-semibold text-rose-600">{selectedQuestions.length - score}</p>
                </div>
              </div>

              <button
                type="button"
                className="mt-8 w-full rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white hover:bg-sky-500"
                onClick={handleReset}
              >
                Back to setup
              </button>
            </section>

            <section className="panel p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-900">Question review</h3>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                  {flagged ? Object.values(flagged).filter(Boolean).length : 0} flagged
                </span>
              </div>

              <div className="space-y-4">
                {selectedQuestions.map((question, index) => {
                  const selectedAnswer = answers[question.id]
                  const isCorrect = selectedAnswer === question.answerIndex

                  return (
                    <div key={question.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-800">Q{index + 1} · {question.type}</p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {isCorrect ? 'Correct' : 'Review'}
                        </span>
                      </div>

                      <p className="text-base leading-7 text-slate-700">{question.prompt}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        Your answer: {selectedAnswer !== undefined && selectedAnswer !== null ? question.options[selectedAnswer] : 'Unanswered'}
                      </p>
                      <p className="mt-1 text-sm text-emerald-700">
                        Correct answer: {question.answerIndex === null ? 'Not available in source' : question.options[question.answerIndex]}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">{question.explanation}</p>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
