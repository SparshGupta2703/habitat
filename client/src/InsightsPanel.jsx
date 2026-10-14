import { useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const macroKeys = ['calories', 'protein', 'carbohydrates', 'fats']
const macroLabels = [['Calories', 'kcal'], ['Protein', 'g'], ['Carbohydrates', 'g'], ['Fats', 'g']]
const formatDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
const shortDate = (value, firstDate) => {
  const date = new Date(`${value}T12:00:00`)
  const first = new Date(`${firstDate}T12:00:00`)
  return date.getFullYear() !== first.getFullYear() || date.getMonth() === 0 && date.getDate() === 1 ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
const nutritionReady = (entry) => Boolean(entry.analysis && (entry.analysisStatus === 'analyzed' || !entry.analysisStatus))

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value
  if (value === null || value === undefined) return null
  return <div className="chart-tooltip"><strong>{formatDate(label)}</strong><span>{Number(value).toFixed(1).replace(/\.0$/, '')} {unit}</span></div>
}

export default function InsightsPanel(p) {
  const [showPastDays, setShowPastDays] = useState(false)
  const { food, selectedNutritionDate, dateKey } = p
  const nutritionEntries = useMemo(() => food.filter((entry) => (entry.localDate || dateKey(entry.eatenAt)) === selectedNutritionDate).sort((a, b) => new Date(a.eatenAt) - new Date(b.eatenAt)), [food, selectedNutritionDate, dateKey])
  const totals = useMemo(() => Object.fromEntries(macroKeys.map((key) => [key, nutritionEntries.filter(nutritionReady).reduce((sum, entry) => sum + Number(entry.analysis[key] || 0), 0)])), [nutritionEntries])
  const completeEntries = nutritionEntries.filter(nutritionReady).length
  const failedEntries = nutritionEntries.filter((entry) => entry.analysisStatus === 'failed').length
  const pendingEntries = nutritionEntries.length - completeEntries - failedEntries
  const selectedHabit = p.analytics.habits.find((habit) => habit.id === p.selectedHabitId) || p.analytics.habits[0]
  const selectedHistory = selectedHabit?.history || []
  const firstWeekdayOffset = selectedHistory.length ? (new Date(`${selectedHistory[0].date}T12:00:00`).getDay() + 6) % 7 : 0
  const heatmapCells = [...Array(firstWeekdayOffset).fill(null), ...selectedHistory]
  const quantitative = selectedHabit?.trackQuantity
  const timeBased = quantitative && selectedHabit.quantityType === 'duration'
  const sourceValues = selectedHistory.filter((entry) => entry.completed && Number.isFinite(entry.quantity)).map((entry) => entry.quantity)
  const showHours = timeBased && sourceValues.some((value) => value >= 120)
  const habitData = selectedHistory.map((entry) => ({ ...entry, value: entry.completed ? (timeBased && showHours ? entry.quantity / 60 : entry.quantity) : null }))
  const chartData = p.analytics.series || []
  const hasSleep = chartData.some((entry) => entry.sleepHours !== null && entry.sleepHours !== undefined)
  const hasCalories = chartData.some((entry) => entry.calories !== null && entry.calories !== undefined)
  const hasHabit = selectedHabit && selectedHistory.some((entry) => entry.completed)
  const moveDate = (amount) => {
    const date = new Date(`${p.selectedNutritionDate}T12:00:00`)
    date.setDate(date.getDate() + amount)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    if (key <= p.today) p.setSelectedNutritionDate(key)
  }
  const retry = (entry) => p.analyze(entry.localDate || p.dateKey(entry.eatenAt), [String(entry._id)])

  return <div className="screen-scroll insight-screen">
    <header className="insight-intro"><div><p className="micro-label">INSIGHTS</p><h2>Your patterns, <em>over time.</em></h2></div><div className="period-control" aria-label="Insight date range">{[[7, '7D'], [30, '30D'], [90, '90D']].map(([days, label]) => <button key={days} className={p.period === days ? 'active' : ''} aria-pressed={p.period === days} onClick={() => p.setPeriod(days)}>{label}</button>)}</div></header>

    <section className="nutrition-section">
      <div className="insight-section-heading"><div><p className="micro-label">NUTRITION</p><h3>{formatDate(p.selectedNutritionDate)}</h3></div><div className="nutrition-date-actions"><button className="glass-button" onClick={() => setShowPastDays((open) => !open)}>{showPastDays ? 'Close dates' : 'View Past Days'}</button><button className="glass-button date-step" onClick={() => moveDate(-1)} aria-label="Previous day">←</button><button className="glass-button date-step" onClick={() => moveDate(1)} disabled={p.selectedNutritionDate >= p.today} aria-label="Next day">→</button></div></div>
      {showPastDays && <label className="past-day-picker">Select a day<input type="date" value={p.selectedNutritionDate} max={p.today} onChange={(event) => event.target.value && p.setSelectedNutritionDate(event.target.value)}/></label>}
      <div className="macro-summary">{macroLabels.map(([label, unit], index) => <div className="macro-total" key={label}><span>{label}</span><b>{Math.round(totals[macroKeys[index]]).toLocaleString()}<small>{unit}</small></b></div>)}</div>
      {!nutritionEntries.length ? <p className="chart-empty">No food entries are recorded for this day.</p> : <>
        {(pendingEntries > 0 || failedEntries > 0) && <p className="nutrition-status-note">{pendingEntries ? `${pendingEntries} awaiting analysis` : ''}{pendingEntries && failedEntries ? ' · ' : ''}{failedEntries ? `${failedEntries} failed — retry available` : ''}</p>}
        <div className="nutrition-entry-list">{nutritionEntries.map((entry) => <article className="nutrition-entry" key={entry._id}><div><strong>{entry.analysis?.name || entry.text}</strong><small>{entry.analysis?.quantity || new Date(entry.eatenAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></div>{nutritionReady(entry) ? <span>{Math.round(entry.analysis.calories)} kcal</span> : <div className="nutrition-entry-state"><span>{entry.analysisStatus === 'failed' ? 'Analysis failed' : 'Pending'}</span>{entry.analysisStatus === 'failed' && <button className="text-action" disabled={p.mutating} onClick={() => retry(entry)}>Retry</button>}</div>}</article>)}</div>
        {completeEntries !== nutritionEntries.length && <p className="chart-footnote">Daily totals include analyzed entries. Unanalyzed foods are not estimated until analysis succeeds.</p>}
      </>}
    </section>

    <div className="graph-grid">
      <article className="glass-panel graph-panel"><header><div><p className="micro-label">SLEEP DURATION</p><h3>Rest &amp; recovery</h3></div><span>hours</span></header>{hasSleep ? <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}><CartesianGrid stroke="rgba(255,255,255,.12)" vertical={false}/><XAxis dataKey="date" tickFormatter={(value) => shortDate(value, chartData[0]?.date || value)} tick={{ fill: 'rgba(255,255,255,.72)', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={14}/><YAxis width={32} tick={{ fill: 'rgba(255,255,255,.7)', fontSize: 10 }} axisLine={false} tickLine={false} unit="h"/><Tooltip content={<ChartTooltip unit="hours"/>}/><Area type="monotone" dataKey="sleepHours" stroke="#f6f4ef" strokeWidth={2} fill="url(#sleep-gradient)" connectNulls={false}/><defs><linearGradient id="sleep-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fff" stopOpacity={.36}/><stop offset="100%" stopColor="#fff" stopOpacity={.02}/></linearGradient></defs></AreaChart></ResponsiveContainer></div> : <p className="chart-empty">No completed sleep sessions in this range.</p>}</article>

      <article className="glass-panel graph-panel"><header><div><p className="micro-label">DAILY CALORIES</p><h3>Energy &amp; nourishment</h3></div><span>kcal</span></header>{hasCalories ? <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}><CartesianGrid stroke="rgba(255,255,255,.12)" vertical={false}/><XAxis dataKey="date" tickFormatter={(value) => shortDate(value, chartData[0]?.date || value)} tick={{ fill: 'rgba(255,255,255,.72)', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={14}/><YAxis width={42} tick={{ fill: 'rgba(255,255,255,.7)', fontSize: 10 }} axisLine={false} tickLine={false}/><Tooltip content={<ChartTooltip unit="kcal"/>}/><Area type="monotone" dataKey="calories" stroke="#f6f4ef" strokeWidth={2} fill="url(#calorie-gradient)" connectNulls={false}/><defs><linearGradient id="calorie-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fff" stopOpacity={.36}/><stop offset="100%" stopColor="#fff" stopOpacity={.02}/></linearGradient></defs></AreaChart></ResponsiveContainer></div> : <p className="chart-empty">No fully analyzed food days in this range.</p>}</article>
    </div>

    <div className="habit-panels-row"><section className={`glass-panel habit-analytics-panel ${selectedHabit && !quantitative ? 'boolean-habit-panel' : ''}`}><header className="habit-analytics-heading"><div><p className="micro-label">HABIT ANALYTICS</p><h3>{selectedHabit?.name || 'Choose a habit'}</h3></div><label>Habit<select value={selectedHabit?.id || ''} onChange={(event) => p.setSelectedHabitId(event.target.value)}>{p.analytics.habits.map((habit) => <option key={habit.id} value={habit.id}>{habit.name}</option>)}</select></label></header>
      {!selectedHabit ? <p className="chart-empty">Create a habit to see its history here.</p> : quantitative ? hasHabit ? <><p className="chart-unit-label">{timeBased ? (showHours ? 'hours per day' : 'minutes per day') : `${selectedHabit.quantityUnit || 'count'} per day`}</p><div className="chart-area habit-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={habitData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}><CartesianGrid stroke="rgba(255,255,255,.12)" vertical={false}/><XAxis dataKey="date" tickFormatter={(value) => shortDate(value, habitData[0]?.date || value)} tick={{ fill: 'rgba(255,255,255,.72)', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={14}/><YAxis width={38} tick={{ fill: 'rgba(255,255,255,.7)', fontSize: 10 }} axisLine={false} tickLine={false}/><Tooltip content={<ChartTooltip unit={timeBased ? (showHours ? 'hours' : 'minutes') : (selectedHabit.quantityUnit || 'count')}/>} cursor={{ fill: '#ffffff12' }}/><Bar dataKey="value" fill="#d9e6f2" radius={[5, 5, 0, 0]} maxBarSize={28}/></BarChart></ResponsiveContainer></div></> : <p className="chart-empty">No completed quantity logs for this habit in this range.</p> : <><div className="heatmap-legend"><span><i className="heatmap-dot done"/>Completed</span><span><i className="heatmap-dot unknown"/>No log recorded</span></div><div className="heatmap-layout"><div className="heatmap-weekdays" aria-hidden="true"><span>Mon</span><i/><span>Wed</span><i/><span>Fri</span><i/></div><div className="habit-heatmap">{heatmapCells.map((entry, index) => entry ? <button key={entry.date} type="button" className={`heatmap-day ${entry.completed ? 'completed' : 'unknown'}`} aria-label={`${formatDate(entry.date)}: ${entry.completed ? 'completed' : 'no log recorded'}`} title={`${formatDate(entry.date)} · ${entry.completed ? 'Completed' : 'No log recorded'}`} onClick={() => p.setSelectedNutritionDate(entry.date)}><span>{new Date(`${entry.date}T12:00:00`).getDate()}</span></button> : <span key={`spacer-${index}`} className="heatmap-spacer"/>)}</div></div></>}
      {selectedHabit && <p className="chart-footnote">No log means unknown; it is not counted as a missed day.</p>}
    </section>

    <section className="glass-panel history-panel"><p className="micro-label">HABIT HISTORY</p><h2>Recorded days</h2>{p.analytics.habits.length ? p.analytics.habits.map((habit) => { const recorded = habit.history.filter((entry) => entry.completed).length; return <div className="history-entry" key={habit.id}><span>{habit.name}</span><div>{habit.history.slice(-14).map((entry) => <i key={entry.date} className={entry.completed ? 'filled' : ''} title={`${formatDate(entry.date)} · ${entry.completed ? 'completed' : 'no log'}`}/>)}</div><small>{recorded} recorded</small></div> }) : <p className="chart-empty">No habits to show.</p>}</section></div>
  </div>
}
