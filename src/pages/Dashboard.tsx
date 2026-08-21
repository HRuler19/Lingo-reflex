import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Flame, Percent, BookOpen, MessageSquareText, Clock, LayoutDashboard } from 'lucide-react'
import { db } from '@/db/schema'
import { useLanguagePairStore } from '@/store/language-pair-store'
import { cn } from '@/lib/utils'
import {
  buildActivityHeatmapData,
  buildMasteryData,
  buildTrendData,
  filterSessionsByPeriod,
  toDateKey,
  type DashboardFilter,
} from '@/lib/analytics'
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap'
import { TrendLineChart } from '@/components/dashboard/TrendLineChart'
import { MasteryChart } from '@/components/dashboard/MasteryChart'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const FILTERS: DashboardFilter[] = ['Day', 'Week', 'Month', 'Year', 'All Time']

const KPI_TINTS = {
  primary: 'border-primary text-primary',
  info: 'border-info text-info',
  success: 'border-success text-success',
  flame: 'border-amber-500 text-amber-500',
} as const

function KpiCard({
  icon: Icon,
  label,
  value,
  tint = 'primary',
}: {
  icon: typeof Flame
  label: string
  value: string | number
  tint?: keyof typeof KPI_TINTS
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl border-2', KPI_TINTS[tint])}>
          <Icon className="size-5" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-lg leading-tight tabular-nums">{value}</span>
          <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
        </div>
      </CardContent>
    </Card>
  )
}

/** Consecutive days (ending today or yesterday) with at least one session. */
function computeDayStreak(sessions: { timestamp: number }[]): number {
  if (sessions.length === 0) return 0
  const days = new Set(sessions.map((s) => toDateKey(s.timestamp)))
  const cursor = new Date()
  let streak = 0
  // Allow the streak to still count if today has no session yet but yesterday does.
  if (!days.has(toDateKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1)
  }
  while (days.has(toDateKey(cursor.getTime()))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function Dashboard() {
  const { selectedPairId } = useLanguagePairStore()
  const [filter, setFilter] = useState<DashboardFilter>('All Time')

  const wordCount = useLiveQuery(
    () => (selectedPairId ? db.words.where('pairId').equals(selectedPairId).count() : 0),
    [selectedPairId],
  )
  const phraseCount = useLiveQuery(
    () => (selectedPairId ? db.phrases.where('pairId').equals(selectedPairId).count() : 0),
    [selectedPairId],
  )
  const words = useLiveQuery(
    () => (selectedPairId ? db.words.where('pairId').equals(selectedPairId).toArray() : []),
    [selectedPairId],
  )
  const phrases = useLiveQuery(
    () => (selectedPairId ? db.phrases.where('pairId').equals(selectedPairId).toArray() : []),
    [selectedPairId],
  )
  const sessions = useLiveQuery(
    () => (selectedPairId ? db.sessions.where('pairId').equals(selectedPairId).toArray() : []),
    [selectedPairId],
  )

  // The Day/Week/Month/Year/All Time filter scopes the session-derived KPIs
  // and trend charts. The heatmap always shows its own fixed 13-week window,
  // and the day streak is inherently "as of today", so neither reacts to it.
  //
  // Memoized rather than recomputed inline: useLiveQuery re-renders this
  // component on every matching IndexedDB write (e.g. mid-session ticks
  // elsewhere aren't relevant, but any word/phrase/session change is), so an
  // unmemoized reduce over the full session list would redo that work on
  // renders that didn't actually change the underlying data.
  const filteredSessions = useMemo(
    () => filterSessionsByPeriod(sessions ?? [], filter),
    [sessions, filter],
  )

  const { accuracy, totalPracticeSec } = useMemo(() => {
    const totalPracticeSec = filteredSessions.reduce((sum, s) => sum + s.usedDurationSec, 0)
    const totalCorrect = filteredSessions.reduce((sum, s) => sum + s.correctCount, 0)
    const totalAttempts = filteredSessions.reduce((sum, s) => sum + s.correctCount + s.wrongCount, 0)
    return {
      totalPracticeSec,
      accuracy: totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0,
    }
  }, [filteredSessions])

  const dayStreak = useMemo(() => computeDayStreak(sessions ?? []), [sessions])
  const heatmapData = useMemo(() => buildActivityHeatmapData(sessions ?? []), [sessions])
  const trendData = useMemo(() => buildTrendData(filteredSessions), [filteredSessions])
  const masteryData = useMemo(
    () => buildMasteryData(words ?? [], phrases ?? []),
    [words, phrases],
  )
  const latestTrend = trendData.at(-1)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description="Your discipline, quantified."
        action={
          <Tabs value={filter} onValueChange={(v) => setFilter(v as DashboardFilter)}>
            <TabsList>
              {FILTERS.map((f) => (
                <TabsTrigger key={f} value={f}>
                  {f}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard icon={BookOpen} label="Total Words" value={wordCount ?? 0} />
        <KpiCard icon={MessageSquareText} label="Total Phrases" value={phraseCount ?? 0} tint="info" />
        <KpiCard icon={Clock} label="Practice Time" value={`${Math.round(totalPracticeSec / 60)}m`} />
        <KpiCard icon={Percent} label="Accuracy" value={`${accuracy}%`} tint="success" />
        <KpiCard icon={Flame} label="Day Streak" value={dayStreak} tint="flame" />
      </div>

      {/*
        The heatmap gets its own full-width row rather than sharing a
        lg:grid-cols-2 row with the (taller) trends card: a 13-week
        calendar grid is inherently wide and short, and CSS grid stretches
        row siblings to match height by default — squeezed into a half
        column, it looked like a tiny grid floating in a mostly-empty card.
      */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Activity Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityHeatmap data={heatmapData} />
        </CardContent>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Accuracy & Speed Trends</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Accuracy</p>
                {latestTrend && (
                  <span className="rounded-md border-2 border-success px-1.5 py-0.5 text-xs font-medium text-success">
                    {latestTrend.accuracy}% latest
                  </span>
                )}
              </div>
              <TrendLineChart
                data={trendData}
                dataKey="accuracy"
                valueLabel="Accuracy"
                formatValue={(v) => `${v}%`}
                yDomain={[0, 100]}
                emptyLabel={filter === 'All Time' ? 'No sessions yet' : `No sessions in the last ${filter.toLowerCase()}`}
                hideXAxisLabels
              />
            </div>
            <div className="my-3 border-t border-border" />
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Avg. Response Time</p>
                {latestTrend && (
                  <span className="rounded-md border-2 border-info px-1.5 py-0.5 text-xs font-medium text-info">
                    {(latestTrend.avgResponseMs / 1000).toFixed(1)}s latest
                  </span>
                )}
              </div>
              <TrendLineChart
                data={trendData}
                dataKey="avgResponseMs"
                valueLabel="Avg. response"
                formatValue={(v) => `${(v / 1000).toFixed(1)}s`}
                emptyLabel={filter === 'All Time' ? 'No sessions yet' : `No sessions in the last ${filter.toLowerCase()}`}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Words vs. Phrases Mastery</CardTitle>
          </CardHeader>
          <CardContent>
            <MasteryChart data={masteryData} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
