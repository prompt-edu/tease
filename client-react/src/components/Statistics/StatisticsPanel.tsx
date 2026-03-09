import { useState } from 'react'
import { BarChart2 } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { useDataStore } from '../../store/useDataStore'
import { useAllocationStore } from '../../store/useAllocationStore'
import { Gender, Device, SkillProficiency } from '../../types'
import { PROFICIENCY_ACTIVE_COLORS } from '../../lib/proficiencyColors'

// ─── Metric definitions ──────────────────────────────────────────────────────

type MetricKey =
  | 'gender'
  | 'introCourseProficiency'
  | 'skillsProficiency'
  | 'devices'
  | 'studyProgram'
  | 'studyDegree'
  | 'projectPriority'

const METRIC_LABELS: Record<MetricKey, string> = {
  gender: 'Gender',
  introCourseProficiency: 'Intro Course Proficiency',
  skillsProficiency: 'Skills Proficiency',
  devices: 'Devices',
  studyProgram: 'Study Program',
  studyDegree: 'Study Degree',
  projectPriority: 'Project Priority',
}

// Fixed ordered categories for proficiency metrics
const PROFICIENCY_ORDER = [
  SkillProficiency.Novice,
  SkillProficiency.Intermediate,
  SkillProficiency.Advanced,
  SkillProficiency.Expert,
]

const PROFICIENCY_COLORS = PROFICIENCY_ORDER.map(p => PROFICIENCY_ACTIVE_COLORS[p])

const GENDER_COLORS: Record<string, string> = {
  [Gender.Female]: '#ec4899',
  [Gender.Male]: '#3b82f6',
  [Gender.Other]: '#a855f7',
  [Gender.PreferNotToSay]: '#94a3b8',
}

const DEVICE_COLORS: Record<string, string> = {
  [Device.Mac]: '#6366f1',
  [Device.IPhone]: '#3b82f6',
  [Device.IPad]: '#06b6d4',
  [Device.Watch]: '#8b5cf6',
}

const CHART_PALETTE = [
  '#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#6366f1',
  '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4',
]

interface ChartEntry {
  name: string
  value: number
  color?: string
}

interface ProjectBreakdown {
  projectName: string
  [category: string]: string | number
}

// ─── Data builders ───────────────────────────────────────────────────────────

function useStatisticsData(metric: MetricKey) {
  const { students, projects } = useDataStore()
  const { allocations } = useAllocationStore()

  const allocatedIds = new Set(Object.values(allocations).flat())
  const allocated = students.filter(s => allocatedIds.has(s.id))

  let aggregate: ChartEntry[] = []
  let categories: string[] = []
  let colors: string[] = []
  let denominatorNote: string | null = null

  switch (metric) {
    case 'gender': {
      categories = Object.values(Gender)
      colors = categories.map(g => GENDER_COLORS[g] ?? '#94a3b8')
      aggregate = categories
        .map(g => ({ name: g, value: allocated.filter(s => s.gender === g).length, color: GENDER_COLORS[g] }))
        .filter(d => d.value > 0)
      break
    }
    case 'introCourseProficiency': {
      categories = PROFICIENCY_ORDER
      colors = PROFICIENCY_COLORS
      aggregate = PROFICIENCY_ORDER.map((p, i) => ({
        name: p,
        value: allocated.filter(s => s.introCourseProficiency === p).length,
        color: PROFICIENCY_COLORS[i],
      })).filter(d => d.value > 0)
      break
    }
    case 'skillsProficiency': {
      categories = PROFICIENCY_ORDER
      colors = PROFICIENCY_COLORS
      denominatorNote = 'skill assessments, not students'
      aggregate = PROFICIENCY_ORDER.map((p, i) => ({
        name: p,
        value: allocated.flatMap(s => s.skills).filter(sk => sk.proficiency === p).length,
        color: PROFICIENCY_COLORS[i],
      })).filter(d => d.value > 0)
      break
    }
    case 'devices': {
      const deviceList = [Device.Mac, Device.IPhone, Device.IPad, Device.Watch]
      categories = deviceList
      colors = deviceList.map(d => DEVICE_COLORS[d] ?? '#94a3b8')
      aggregate = deviceList.map((d, i) => ({
        name: d,
        value: allocated.filter(s => s.devices.includes(d)).length,
        color: colors[i],
      }))
      break
    }
    case 'studyProgram': {
      const programCounts = new Map<string, number>()
      allocated.forEach(s => {
        if (s.studyProgram) programCounts.set(s.studyProgram, (programCounts.get(s.studyProgram) ?? 0) + 1)
      })
      const sorted = [...programCounts.entries()].sort((a, b) => b[1] - a[1])
      const top8 = sorted.slice(0, 8)
      const rest = sorted.slice(8).reduce((sum, [, v]) => sum + v, 0)
      const entries = rest > 0 ? [...top8, ['Other', rest] as [string, number]] : top8
      categories = entries.map(([n]) => n)
      colors = categories.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length])
      aggregate = entries.map(([name, value], i) => ({ name, value, color: colors[i] }))
      break
    }
    case 'studyDegree': {
      const degreeCounts = new Map<string, number>()
      allocated.forEach(s => {
        if (s.studyDegree) degreeCounts.set(s.studyDegree, (degreeCounts.get(s.studyDegree) ?? 0) + 1)
      })
      const entries = [...degreeCounts.entries()].sort((a, b) => b[1] - a[1])
      categories = entries.map(([n]) => n)
      colors = categories.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length])
      aggregate = entries.map(([name, value], i) => ({ name, value, color: colors[i] }))
      break
    }
    case 'projectPriority': {
      const labels = ['1st choice', '2nd choice', '3rd choice', '4th choice', 'Unranked']
      colors = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#94a3b8']
      const counts = [0, 0, 0, 0, 0]
      for (const [projectId, studentIds] of Object.entries(allocations)) {
        for (const sid of studentIds) {
          const student = students.find(s => s.id === sid)
          if (!student) continue
          const pref = student.projectPreferences.find(p => p.projectId === projectId)
          if (!pref) { counts[4]++; continue }
          if (pref.priority < 4) counts[pref.priority]++
          else counts[4]++
        }
      }
      categories = labels
      aggregate = labels.map((name, i) => ({ name, value: counts[i], color: colors[i] })).filter(d => d.value > 0)
      break
    }
  }

  // Per-project people chart
  const projectBreakdown: ProjectBreakdown[] = projects.map(project => {
    const projectStudents = (allocations[project.id] ?? [])
      .map(sid => students.find(s => s.id === sid))
      .filter(Boolean) as typeof students

    const entry: ProjectBreakdown = { projectName: project.name }

    switch (metric) {
      case 'gender':
        categories.forEach(cat => {
          entry[cat] = projectStudents.filter(s => s.gender === cat).length
        })
        break
      case 'introCourseProficiency':
        categories.forEach(cat => {
          entry[cat] = projectStudents.filter(s => s.introCourseProficiency === cat).length
        })
        break
      case 'skillsProficiency':
        categories.forEach(cat => {
          entry[cat] = projectStudents.flatMap(s => s.skills).filter(sk => sk.proficiency === cat).length
        })
        break
      case 'devices': {
        const deviceList = [Device.Mac, Device.IPhone, Device.IPad, Device.Watch]
        deviceList.forEach(d => {
          entry[d] = projectStudents.filter(s => s.devices.includes(d)).length
        })
        break
      }
      case 'studyProgram':
        categories.forEach(cat => {
          entry[cat] = cat === 'Other'
            ? projectStudents.filter(s => !categories.slice(0, -1).includes(s.studyProgram)).length
            : projectStudents.filter(s => s.studyProgram === cat).length
        })
        break
      case 'studyDegree':
        categories.forEach(cat => {
          entry[cat] = projectStudents.filter(s => s.studyDegree === cat).length
        })
        break
      case 'projectPriority': {
        const prioLabels = ['1st choice', '2nd choice', '3rd choice', '4th choice', 'Unranked']
        const counts = [0, 0, 0, 0, 0]
        projectStudents.forEach(s => {
          const pref = s.projectPreferences.find(p => p.projectId === project.id)
          if (!pref) { counts[4]++; return }
          if (pref.priority < 4) counts[pref.priority]++
          else counts[4]++
        })
        prioLabels.forEach((label, i) => { entry[label] = counts[i] })
        break
      }
    }
    return entry
  })

  return { aggregate, categories, colors, projectBreakdown, denominatorNote, total: allocated.length }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export interface StatisticsPanelProps {
  /** Controlled open state. Pass from Dashboard header button. */
  open: boolean
  onClose: () => void
}

export function StatisticsPanel({ open, onClose }: StatisticsPanelProps) {
  const [metric, setMetric] = useState<MetricKey>('gender')
  const { aggregate, categories, colors, projectBreakdown, denominatorNote, total } = useStatisticsData(metric)

  const { projects } = useDataStore()
  const useGroupedBars = metric === 'devices' || projects.length <= 1

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-4xl z-[200]">
        <DialogHeader>
          <DialogTitle>Statistics</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 mt-2">
          <label className="text-sm font-medium shrink-0">Metric</label>
          <select
            className="rounded border px-2 py-1.5 text-sm"
            value={metric}
            onChange={e => setMetric(e.target.value as MetricKey)}
          >
            {(Object.keys(METRIC_LABELS) as MetricKey[]).map(k => (
              <option key={k} value={k}>{METRIC_LABELS[k]}</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            {total} allocated students
            {denominatorNote && ` · denominator: ${denominatorNote}`}
          </span>
        </div>

        {aggregate.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No allocated students yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Left: Doughnut */}
            <div>
              <p className="text-xs font-medium mb-2 text-center text-muted-foreground">
                {METRIC_LABELS[metric]} — Overall
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={aggregate}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {aggregate.map((entry, i) => (
                      <Cell key={entry.name} fill={entry.color ?? CHART_PALETTE[i % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Right: Per-project stacked/grouped bars */}
            <div>
              <p className="text-xs font-medium mb-2 text-center text-muted-foreground">
                {METRIC_LABELS[metric]} — Per Project
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={projectBreakdown} margin={{ bottom: 40 }}>
                  <XAxis
                    dataKey="projectName"
                    tick={{ fontSize: 10 }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend iconSize={10} />
                  {categories.map((cat, i) => (
                    <Bar
                      key={cat}
                      dataKey={cat}
                      stackId={useGroupedBars ? undefined : 'stack'}
                      fill={colors[i] ?? CHART_PALETTE[i % CHART_PALETTE.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
