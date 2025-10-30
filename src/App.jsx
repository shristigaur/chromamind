import { useEffect, useState } from 'react'
import './App.css'
import questionsData from './data/questions'

// API base (use Vite environment variable in dev if set)
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000'

function Header({ dark, setDark, onHistory }) {
  return (
    <header className="cm-header">
      <h1 className="brand">ChromaMind</h1>
      <div className="controls">
        <button className="btn ghost" onClick={() => window.location.reload()} aria-label="Home">Home</button>
        <button className="btn ghost" onClick={onHistory} aria-label="History">History</button>
        <button
          className="btn"
          onClick={() => setDark((d) => !d)}
          aria-pressed={dark}
        >
          {dark ? 'Light' : 'Dark'}
        </button>
      </div>
    </header>
  )
}

function History({ onBack }) {
  const [items, setItems] = useState(null)
  const [serverCount, setServerCount] = useState(0)
  const [localCount, setLocalCount] = useState(0)
  useEffect(() => {
    fetch(`${API_BASE}/api/submissions`)
      .then(r => r.json())
      .then(async (serverItems) => {
        // load local submissions (saved when user finished quiz while offline)
        const localRaw = localStorage.getItem('chromamind_local_submissions')
        let localItems = []
        try { localItems = localRaw ? JSON.parse(localRaw) : [] } catch (e) { localItems = [] }
        setServerCount((serverItems || []).length)
        setLocalCount((localItems || []).length)
        // merge, preferring server items for same sessionId
        const map = new Map()
        ;(serverItems || []).forEach(s => map.set(s.sessionId, s))
        ;(localItems || []).forEach(s => { if (!map.has(s.sessionId)) map.set(s.sessionId, s) })
        const merged = Array.from(map.values()).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
        setItems(merged)
      })
      .catch(() => {
        // if server unreachable, fall back to local submissions
        const localRaw = localStorage.getItem('chromamind_local_submissions')
        let localItems = []
        try { localItems = localRaw ? JSON.parse(localRaw) : [] } catch (e) { localItems = [] }
        setServerCount(0)
        setLocalCount(localItems.length)
        setItems(localItems.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)))
      })
  }, [])
  useEffect(() => {
    let mounted = true
    async function fetchAndMerge() {
      try {
        const r = await fetch(`${API_BASE}/api/submissions`)
        const serverItems = await r.json()
        // load local submissions (saved when user finished quiz while offline)
        const localRaw = localStorage.getItem('chromamind_local_submissions')
        let localItems = []
        try { localItems = localRaw ? JSON.parse(localRaw) : [] } catch (e) { localItems = [] }
        // merge, preferring server items for same sessionId
        const map = new Map()
        ;(serverItems || []).forEach(s => map.set(s.sessionId, s))
        ;(localItems || []).forEach(s => { if (!map.has(s.sessionId)) map.set(s.sessionId, s) })
        const merged = Array.from(map.values()).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
        if (mounted) {
          setServerCount((serverItems || []).length)
          setLocalCount((localItems || []).length)
          setItems(merged)
        }
      } catch (err) {
        const localRaw = localStorage.getItem('chromamind_local_submissions')
        let localItems = []
        try { localItems = localRaw ? JSON.parse(localRaw) : [] } catch (e) { localItems = [] }
        if (mounted) {
          setServerCount(0)
          setLocalCount(localItems.length)
          setItems(localItems.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)))
        }
      }
    }

    fetchAndMerge()
    // listen for background sync events to refresh history
    const onUpdate = () => { fetchAndMerge() }
    window.addEventListener('chromamind:submissions:updated', onUpdate)
    return () => { mounted = false; window.removeEventListener('chromamind:submissions:updated', onUpdate) }
  }, [])

  return (
    <main className="container">
      <h2>Submission History</h2>
      <p className="lead">Recent quiz results (name, age, assigned color).</p>
      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="btn ghost" onClick={onBack}>Back</button>
        <button className="btn" onClick={() => fetchAndMerge()}>Refresh</button>
        <div style={{ marginLeft: 8, color: '#9CA3AF', fontSize: 13 }}>
          Server: {serverCount} • Local: {localCount}
        </div>
        <button className="btn danger" onClick={async () => {
          if (!confirm('Clear all submissions? This will remove local and server data.')) return
          // optimistic UI
          setItems([])
          try {
            await fetch(`${API_BASE}/api/submissions`, { method: 'DELETE' })
          } catch (e) {
            // ignore
          }
          // clear local storage as well
          localStorage.removeItem('chromamind_local_submissions')
        }}>Clear All</button>
      </div>
      <div style={{ marginTop: 16 }}>
        {items === null && <div>Loading…</div>}
        {items && items.length === 0 && <div>No submissions yet.</div>}
        {items && items.length > 0 && (
          <ul className="history-list">
            {items.map((s) => (
              <li key={s.sessionId} className="history-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div><strong>{s.name || 'Anonymous'}</strong> — {s.age || '—'} yrs</div>
                    <div>Color: <strong>{s.assignedColor}</strong></div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{new Date(s.timestamp).toLocaleString()}</div>
                  </div>
                  <div>
                    <button className="btn ghost" onClick={async () => {
                      // optimistic UI remove
                      setItems((prev) => prev.filter(x => x.sessionId !== s.sessionId))
                      try {
                        const res = await fetch(`${API_BASE}/api/submissions/${s.sessionId}`, { method: 'DELETE' })
                        if (!res.ok) {
                          // if server failed, revert removal and also cleanup localStorage if present
                          const localRaw = localStorage.getItem('chromamind_local_submissions')
                          let local = []
                          try { local = localRaw ? JSON.parse(localRaw) : [] } catch (e) { local = [] }
                          // remove local item if present
                          local = local.filter(x => x.sessionId !== s.sessionId)
                          localStorage.setItem('chromamind_local_submissions', JSON.stringify(local))
                        } else {
                          // deleted on server - also remove from local storage if present
                          const localRaw = localStorage.getItem('chromamind_local_submissions')
                          let local = []
                          try { local = localRaw ? JSON.parse(localRaw) : [] } catch (e) { local = [] }
                          local = local.filter(x => x.sessionId !== s.sessionId)
                          localStorage.setItem('chromamind_local_submissions', JSON.stringify(local))
                        }
                      } catch (e) {
                        // network error - remove from local storage anyway
                        const localRaw = localStorage.getItem('chromamind_local_submissions')
                        let local = []
                        try { local = localRaw ? JSON.parse(localRaw) : [] } catch (e) { local = [] }
                        local = local.filter(x => x.sessionId !== s.sessionId)
                        localStorage.setItem('chromamind_local_submissions', JSON.stringify(local))
                      }
                    }}>Delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

function Landing({ onStart }) {
  return (
    <section className="landing">
      <div className="hero">
        <h2>Discover your personality color</h2>
        <p className="lead">A short 10-question quiz that reveals your dominant color personality.</p>
        <button className="cta" onClick={onStart}>Start Quiz</button>
      </div>
    </section>
  )
}

function UserInfo({ onNext, user, setUser }) {
  return (
    <section className="userinfo container">
      <h2>Tell us a bit about yourself</h2>
      <p className="lead">This helps personalize your result. We won't share your data.</p>
      <form onSubmit={(e) => { e.preventDefault(); onNext(); }} className="userinfo-form">
        <label>
          Name
          <input type="text" value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} placeholder="Your name" />
        </label>
        <label>
          Age (optional)
          <input type="number" value={user.age || ''} onChange={(e) => setUser({ ...user, age: e.target.value ? Number(e.target.value) : '' })} placeholder="Age" />
        </label>
        <label className="consent">
          <input type="checkbox" checked={user.consent} onChange={(e) => setUser({ ...user, consent: e.target.checked })} />
          I agree to the terms and that my anonymous responses may be used to improve the app.
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn ghost" type="button" onClick={() => { setUser({ name: '', age: '', consent: false }); }}>Clear</button>
          <button className="btn primary" type="submit" disabled={!user.consent}>Proceed</button>
        </div>
      </form>
    </section>
  )
}

function Progress({ index, total }) {
  const pct = Math.round(((index) / total) * 100)
  return (
    <div className="progress" aria-hidden>
      <div className="progress-bar" style={{ width: `${pct}%` }} />
      <div className="progress-text">Question {index} of {total}</div>
    </div>
  )
}

function QuestionCard({ q, onAnswer, selected }) {
  return (
    <article className="question-card">
      <h3 className="q-text">{q.questionText}</h3>
      <div className="options">
        {q.options.map((opt, i) => (
          <button key={i} className={`option ${selected === i ? 'selected' : ''}`} onClick={() => onAnswer(opt, i)}>
            {opt.optionText}
          </button>
        ))}
      </div>
    </article>
  )
}

function Results({ profile, onRetake }) {
  if (!profile) return null
  const bg = { background: profile.hexCode }
  const textColor = getContrastYIQ(profile.hexCode)
  const textStyle = { color: textColor }

  return (
    <section className="results" style={bg}>
      <div className="results-card" style={textStyle}>
        <h2 className="color-name">{profile.colorName} — <span className="title">{profile.title}</span></h2>
        <p className="summary">{profile.summary}</p>
        <div className="full">{profile.fullDescription}</div>
        <div className="actions">
          <button className="btn primary" onClick={onRetake}>Retake Quiz</button>
          <div className="share">
            <a className="share-btn" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("I'm a " + profile.colorName + " on ChromaMind!")}`} target="_blank" rel="noreferrer">Share</a>
          </div>
        </div>
      </div>
    </section>
  )
}

// Small helper to pick readable text color based on background hex
function getContrastYIQ(hex) {
  if (!hex) return '#000'
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0,2), 16)
  const g = parseInt(h.substring(2,4), 16)
  const b = parseInt(h.substring(4,6), 16)
  const yiq = (r*299 + g*587 + b*114) / 1000
  return (yiq >= 128) ? '#111' : '#fff'
}

export default function App() {
  const total = questionsData.length
  const [dark, setDark] = useState(false)
  const [stage, setStage] = useState('landing') // landing, quiz, results
  const [user, setUser] = useState({ name: '', age: '', consent: false })
  const [index, setIndex] = useState(1)
  // answers will be an array where each entry is the selected option object or null
  const [answers, setAnswers] = useState(Array(total).fill(null))
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  function start() {
    // go to user info first
    setStage('userinfo')
    setIndex(1)
    setAnswers(Array(total).fill(null))
    setProfile(null)
  }

  function proceedToQuiz() {
    setStage('quiz')
  }

  function handleAnswer(option, optIndex) {
    // record answer for current index (1-based index)
    setAnswers((prev) => {
      const copy = [...prev]
      copy[index - 1] = option
      return copy
    })
  }

  function goNext() {
    // if last question, compute results
    if (index >= total) {
      // compute locally (since backend isn't wired here)
      const breakdown = { red: 0, blue: 0, yellow: 0, green: 0, purple: 0, orange: 0, teal: 0, pink: 0 }
      ;answers.forEach(o => {
        if (!o) return
        const w = o.weights || {}
        breakdown.red += w.red || 0
        breakdown.blue += w.blue || 0
        breakdown.yellow += w.yellow || 0
        breakdown.green += w.green || 0
        breakdown.purple += w.purple || 0
        breakdown.orange += w.orange || 0
        breakdown.teal += w.teal || 0
        breakdown.pink += w.pink || 0
      })
      // determine highest (handle ties by ordering)
      const order = ['red','blue','yellow','green','purple','orange','teal','pink']
      let assigned = order[0]
      order.forEach(k => {
        if (breakdown[k] > breakdown[assigned]) assigned = k
      })
      // local profiles (extended)
      const profiles = {
        red: { colorName: 'Red', hexCode: '#EF4444', title: 'The Driver', summary: 'Bold and decisive', fullDescription: 'You are action-oriented and thrive when taking charge.' },
        blue: { colorName: 'Blue', hexCode: '#3B82F6', title: 'The Analyst', summary: 'Thoughtful and steady', fullDescription: 'You value logic, calm, and thoughtful planning.' },
        yellow: { colorName: 'Yellow', hexCode: '#F59E0B', title: 'The Inspirer', summary: 'Warm and enthusiastic', fullDescription: 'You energize others with optimism and creativity.' },
        green: { colorName: 'Green', hexCode: '#10B981', title: 'The Supporter', summary: 'Empathetic and steady', fullDescription: 'You are dependable and value harmony in relationships.' },
        purple: { colorName: 'Purple', hexCode: '#8B5CF6', title: 'The Visionary', summary: 'Creative and introspective', fullDescription: 'You imagine futures and bring original ideas into being.' },
        orange: { colorName: 'Orange', hexCode: '#FB923C', title: 'The Enthusiast', summary: 'Adventurous and outgoing', fullDescription: 'You love high energy, excitement, and inspiring others.' },
        teal: { colorName: 'Teal', hexCode: '#14B8A6', title: 'The Harmonizer', summary: 'Calm and systematic', fullDescription: 'You balance practical systems with a calm presence.' },
        pink: { colorName: 'Pink', hexCode: '#F472B6', title: 'The Nurturer', summary: 'Compassionate and warm', fullDescription: 'You prioritize care, kindness, and emotional connection.' },
      }
      // Prepare raw answers and a local submission record
      const raw = answers.map(a => a ? a.optionText.split(/\s+/)[0] : '')
      const localSessionId = `${Date.now()}-${Math.floor(Math.random()*10000)}`
      const localDoc = {
        sessionId: localSessionId,
        name: user?.name || 'Anonymous',
        age: user?.age || null,
        timestamp: new Date().toISOString(),
        rawAnswers: raw,
        scoreBreakdown: breakdown,
        assignedColor: assigned
      }
      // save locally so History shows entries even if backend/Atlas is down
      try {
        const existing = JSON.parse(localStorage.getItem('chromamind_local_submissions') || '[]')
        existing.push(localDoc)
        localStorage.setItem('chromamind_local_submissions', JSON.stringify(existing))
      } catch (e) {
        // ignore localStorage failures
      }

      // Attempt to save to backend (best-effort). If successful the backend will store it;
      // we still keep the local copy so UI shows the submission immediately.
      try {
        // try fire-and-forget
        fetch(`${API_BASE}/api/quiz/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: { name: user.name, age: user.age }, answers: raw })
        }).then(() => {
          // if backend accepted, dispatch update so History can refresh
          window.dispatchEvent(new Event('chromamind:submissions:updated'))
        }).catch(() => {})
      } catch (e) {}

      // schedule background sync attempts in case the server is unreachable now
      scheduleLocalSync()

      setProfile(profiles[assigned])
      setStage('results')
      return
    }
    setIndex((i) => Math.min(total, i + 1))
  }

  function goPrev() {
    setIndex((i) => Math.max(1, i - 1))
  }
  function retake() {
    start()
  }

  // ---- background sync for local submissions ----
  let syncTimer = null
  function scheduleLocalSync() {
    if (syncTimer) return
    // attempt after a short delay and then every 30s
    syncTimer = setInterval(() => attemptSyncLocalSubmissions(), 30000)
    // also attempt immediately
    attemptSyncLocalSubmissions()
  }

  async function attemptSyncLocalSubmissions() {
    const raw = localStorage.getItem('chromamind_local_submissions')
    let local = []
    try { local = raw ? JSON.parse(raw) : [] } catch (e) { local = [] }
    if (!local || local.length === 0) return
    // process sequentially
    for (const doc of [...local]) {
      try {
        const res = await fetch(`${API_BASE}/api/quiz/submit`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: { name: doc.name, age: doc.age }, answers: doc.rawAnswers })
        })
        if (res.ok) {
          // remove from local
          local = local.filter(x => x.sessionId !== doc.sessionId)
          localStorage.setItem('chromamind_local_submissions', JSON.stringify(local))
          // notify UI
          window.dispatchEvent(new Event('chromamind:submissions:updated'))
        }
      } catch (e) {
        // network error - stop attempts for now
        return
      }
    }
  }

  // attempt sync on window focus
  useEffect(() => {
    const onFocus = () => { attemptSyncLocalSubmissions() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  return (
    <div className="app-root">
      <Header dark={dark} setDark={setDark} onHistory={() => setStage('history')} />

  {stage === 'landing' && <Landing onStart={start} />}
  {stage === 'userinfo' && <UserInfo onNext={proceedToQuiz} user={user} setUser={setUser} />}

      {stage === 'quiz' && (
        <main className="container">
          <Progress index={index} total={total} />
          <QuestionCard q={questionsData[index-1]} onAnswer={handleAnswer} selected={answers[index-1] ? questionsData[index-1].options.findIndex(o => o.optionText === answers[index-1].optionText) : -1} />
          <div className="nav-buttons">
            <button className="btn ghost" onClick={goPrev} disabled={index===1}>Previous</button>
            <button className="btn primary" onClick={goNext} disabled={!answers[index-1]}>{index===total ? 'Finish' : 'Next'}</button>
          </div>
        </main>
      )}

      {stage === 'history' && (
        <History onBack={() => setStage('landing')} />
      )}

      {stage === 'results' && (
        <Results profile={profile} onRetake={retake} />
      )}

      <footer className="footer">Made with ❤️ — ChromaMind</footer>
    </div>
  )
}
