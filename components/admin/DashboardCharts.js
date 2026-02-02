'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users } from 'lucide-react'

export default function DashboardCharts({ dailyTrend, weeklyEmployees }) {
  const visibleEmployees = weeklyEmployees.slice(0, 8)
  const remaining = Math.max(weeklyEmployees.length - visibleEmployees.length, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Daily Hours (Last 14 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  interval={1}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  formatter={(value) => [`${value}h`, 'Hours']}
                />
                <Bar dataKey="hours" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">No data available</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Payroll Snapshot (This Week)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyEmployees.length > 0 ? (
            <div className="space-y-3">
              {visibleEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{employee.fullName || employee.name}</p>
                    <p className="text-xs text-muted-foreground">{employee.entries} entries</p>
                  </div>
                  <Badge variant="info">{employee.hours.toFixed(1)}h</Badge>
                </div>
              ))}
              {remaining > 0 && (
                <p className="text-xs text-muted-foreground">+ {remaining} more employees</p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No hours logged this week</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
