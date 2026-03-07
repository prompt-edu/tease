import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useDataStore } from '../../store/useDataStore'
import { useAllocationStore } from '../../store/useAllocationStore'
import { Gender, Device } from '../../types'

const GENDER_COLORS: Record<string, string> = {
  Female: '#ec4899',
  Male: '#3b82f6',
  Other: '#a855f7',
  'Prefer not to say': '#94a3b8',
}

export function StatisticsPanel() {
  const [open, setOpen] = useState(false)
  const { students } = useDataStore()
  const { allocations } = useAllocationStore()

  const allocatedIds = new Set(Object.values(allocations).flat())
  const allocated = students.filter(s => allocatedIds.has(s.id))

  const genderData = Object.values(Gender).map(g => ({
    name: g,
    value: allocated.filter(s => s.gender === g).length,
  })).filter(d => d.value > 0)

  const deviceData = Object.values(Device).map(d => ({
    device: d,
    count: allocated.filter(s => s.devices.includes(d)).length,
  }))

  return (
    <div className="border-t bg-background">
      <button
        className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium hover:bg-muted"
        onClick={() => setOpen(o => !o)}
      >
        <span>Statistics ({allocated.length} allocated)</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-4 p-4">
          {/* Gender doughnut */}
          <div>
            <p className="text-xs font-medium mb-2 text-center text-muted-foreground">Gender</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60}>
                  {genderData.map(entry => (
                    <Cell key={entry.name} fill={GENDER_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Device bar */}
          <div>
            <p className="text-xs font-medium mb-2 text-center text-muted-foreground">Devices</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={deviceData} margin={{ bottom: 30 }}>
                <XAxis dataKey="device" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
