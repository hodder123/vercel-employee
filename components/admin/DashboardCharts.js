'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, ChevronRight } from 'lucide-react'

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
            <div className="space-y-1">
              {visibleEmployees.map((employee) => (
                <Link
                  key={employee.id}
                  href={`/admin/employee/${employee.id}`}
                  className="group flex items-center justify-between gap-3 -mx-2 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate group-hover:text-blue-700">{employee.fullName || employee.name}</p>
                    <p className="text-xs text-muted-foreground">{employee.entries} entries</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge variant="info">{employee.hours.toFixed(1)}h</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              ))}
              {remaining > 0 && (
                <p className="text-xs text-muted-foreground pt-2">+ {remaining} more employees</p>
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
