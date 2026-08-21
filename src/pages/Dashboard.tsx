import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Flame, Percent, BookOpen, MessageSquareText, Clock } from 'lucide-react'
import { db } from '@/db/schema'
import { useLanguagePairStore } from '@/store/language-pair-store'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const FILTERS: DashboardFilter[] = ['Day', 'Week', 'Month', 'Year', 'All Time']

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flame
  label: string
  value: string | number
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
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
  const filteredSessions = filterSessionsByPeriod(sessions ?? [], filter)

  const totalPracticeSec = filteredSessions.reduce((sum, s) => sum + s.usedDurationSec, 0)
  const totalCorrect = filteredSessions.reduce((sum, s) => sum + s.correctCount, 0)
  const totalAttempts = filteredSessions.reduce((sum, s) => sum + s.correctCount + s.wrongCount, 0)
  const accuracy = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0
  const dayStreak = computeDayStreak(sessions ?? [])

  const heatmapData = buildActivityHeatmapData(sessions ?? [])
  const trendData = buildTrendData(filteredSessions)
  const masteryData = buildMasteryData(words ?? [], phrases ?? [])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as DashboardFilter)}>
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f} value={f}>
                {f}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard icon={BookOpen} label="Total Words" value={wordCount ?? 0} />
        <KpiCard icon={MessageSquareText} label="Total Phrases" value={phraseCount ?? 0} />
        <KpiCard icon={Clock} label="Practice Time" value={`${Math.round(totalPracticeSec / 60)}m`} />
        <KpiCard icon={Percent} label="Accuracy" value={`${accuracy}%`} />
        <KpiCard icon={Flame} label="Day Streak" value={dayStreak} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Activity Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityHeatmap data={heatmapData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Accuracy & Speed Trends</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Accuracy</p>
              <TrendLineChart
                data={trendData}
                dataKey="accuracy"
                valueLabel="Accuracy"
                formatValue={(v) => `${v}%`}
                yDomain={[0, 100]}
                emptyLabel={filter === 'All Time' ? 'No sessions yet' : `No sessions in the last ${filter.toLowerCase()}`}
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Avg. Response Time</p>
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

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Words vs. Phrases Mastery</CardTitle>
          </CardHeader>
          <CardContent>
            <MasteryChart data={masteryData} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
