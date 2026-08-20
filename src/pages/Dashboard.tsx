import { useLiveQuery } from 'dexie-react-hooks'
import { Flame, Percent, BookOpen, MessageSquareText, Clock } from 'lucide-react'
import { db } from '@/db/schema'
import { useLanguagePairStore } from '@/store/language-pair-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const FILTERS = ['Day', 'Week', 'Month', 'Year', 'All Time'] as const

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

export function Dashboard() {
  const { selectedPairId } = useLanguagePairStore()

  const wordCount = useLiveQuery(
    () => (selectedPairId ? db.words.where('pairId').equals(selectedPairId).count() : 0),
    [selectedPairId],
  )
  const phraseCount = useLiveQuery(
    () => (selectedPairId ? db.phrases.where('pairId').equals(selectedPairId).count() : 0),
    [selectedPairId],
  )
  const sessions = useLiveQuery(
    () => (selectedPairId ? db.sessions.where('pairId').equals(selectedPairId).toArray() : []),
    [selectedPairId],
  )

  const totalPracticeSec = sessions?.reduce((sum, s) => sum + s.usedDurationSec, 0) ?? 0
  const totalCorrect = sessions?.reduce((sum, s) => sum + s.correctCount, 0) ?? 0
  const totalAttempts =
    (sessions?.reduce((sum, s) => sum + s.correctCount + s.wrongCount, 0) ?? 0) || 1
  const accuracy = sessions?.length ? Math.round((totalCorrect / totalAttempts) * 100) : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <Tabs defaultValue="All Time">
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
        <KpiCard icon={Flame} label="Day Streak" value={0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Activity Heatmap</CardTitle>
          </CardHeader>
          <CardContent className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No activity yet
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Accuracy & Speed Trends</CardTitle>
          </CardHeader>
          <CardContent className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No sessions yet
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Words vs. Phrases Mastery</CardTitle>
          </CardHeader>
          <CardContent className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No data yet
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
