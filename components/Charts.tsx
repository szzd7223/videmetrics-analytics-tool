'use client'

import { useState } from 'react'
import { VideoInfo } from '@/lib/youtube'
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis } from 'recharts'
import { formatNumber, formatDate, cn } from '@/lib/utils'

type MetricType = 'views' | 'likes' | 'comments' | 'engagementRate'

export default function Charts({ videos }: { videos: VideoInfo[] }) {
  const [activeMetric, setActiveMetric] = useState<MetricType>('views')

  // Shared generic accessor
  const getRawVal = (vid: VideoInfo, metric: MetricType) => {
    if (metric === 'engagementRate') return vid.engagementRate || 0
    if (metric === 'views') return vid.viewCount
    if (metric === 'likes') return vid.likeCount
    if (metric === 'comments') return vid.commentCount
    return 0
  }

  // 1. Sort videos chronologically and build Trend data (with Moving Average calculated natively)
  const sorted = [...videos].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
  const MOVING_AVG_PERIOD = Math.max(3, Math.min(5, Math.ceil(sorted.length / 4)))

  const trendData = sorted.map((v, index) => {
    const compactDate = new Date(v.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }).replace(',', '')
    
    let sum = 0
    let count = 0
    for (let i = Math.max(0, index - MOVING_AVG_PERIOD + 1); i <= index; i++) {
        sum += getRawVal(sorted[i], activeMetric)
        count++
    }
    
    return {
      id: v.id,
      name: v.title.slice(0, 20) + '...',
      fullTitle: v.title,
      date: formatDate(v.publishedAt),
      shortDate: compactDate,
      value: getRawVal(v, activeMetric),
      movingAvg: sum / count,
    }
  })

  const formatYAxis = (val: number) => {
    if (activeMetric === 'engagementRate') return val.toFixed(1) + '%'
    return formatNumber(val)
  }

  const getMetricLabel = () => {
    if (activeMetric === 'views') return 'Total Views'
    if (activeMetric === 'likes') return 'Total Likes'
    if (activeMetric === 'comments') return 'Total Comments'
    if (activeMetric === 'engagementRate') return 'Engagement Rate'
    return ''
  }

  // 2. Views vs Likes Ratio Matrix (Remains static & incredibly stable)
  const matrixData = videos.map(v => ({
    name: v.title,
    views: v.viewCount,
    likeRatio: v.viewCount > 0 ? (v.likeCount / v.viewCount) * 100 : 0,
    likes: v.likeCount,
    date: formatDate(v.publishedAt),
  }))

  const avgViews = matrixData.length > 0 ? matrixData.reduce((sum, v) => sum + v.views, 0) / matrixData.length : 0
  const avgLikes = matrixData.length > 0 ? matrixData.reduce((sum, v) => sum + v.likes, 0) / matrixData.length : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* 1. Channel Health Trend (Multi-Metric Composed Chart) */}
      <div className="w-full h-[450px] bg-[#0A0A0A] border border-zinc-800 p-6 rounded-xl flex flex-col pt-6 group transition-all duration-500 relative">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4 shrink-0 px-2">
          <div>
            <h3 className="text-zinc-500 font-bold tracking-widest text-xs uppercase mb-1 flex items-center gap-2">
               Channel Health Trend
               <div className="group/cht relative inline-flex cursor-help align-middle">
                 <div className="w-3.5 h-3.5 rounded-sm border border-zinc-700 text-zinc-400 flex items-center justify-center text-[9px] font-bold hover:bg-white hover:text-black transition-colors bg-zinc-900">?</div>
                 <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-3 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-200 text-[10px] leading-relaxed shadow-md opacity-0 invisible group-hover/cht:opacity-100 group-hover/cht:visible transition-all duration-200 z-50 normal-case tracking-normal font-medium pointer-events-none text-center">
                   Shows if the channel is actually growing or dying. The orange line smooths out random viral spikes so you can see the true long-term trend.
                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-b-zinc-600"></div>
                 </div>
               </div>
            </h3>
            <p className="text-zinc-600 text-[10px] font-medium tracking-wide">Historical algorithmic trajectories</p>
          </div>
          <div className="flex items-center bg-transparent border border-zinc-800 p-1 rounded-md shadow-inner max-w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {(['views', 'likes', 'comments', 'engagementRate'] as MetricType[]).map((metric, i, arr) => (
              <button
                key={metric}
                onClick={() => setActiveMetric(metric)}
                className={cn(
                  "px-4 py-1.5 rounded-sm text-[9px] font-bold tracking-widest uppercase transition-colors shrink-0 cursor-pointer",
                  activeMetric === metric ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30",
                  i === arr.length - 1 && "mr-1" // prevents right-edge clip
                )}
              >
                {metric === 'engagementRate' ? 'ENGAGEMENT' : metric}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 w-full min-h-0 pl-2 pb-2 select-none relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={trendData} 
              margin={{ top: 20, right: 10, left: 15, bottom: 20 }}
            >
              <XAxis 
                dataKey="id" 
                stroke="#52525b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickMargin={12}
                height={45}
                interval="preserveStartEnd"
                minTickGap={40}
                padding={{ left: 15, right: 15 }}
                label={{ value: 'Published Date', position: 'insideBottom', offset: -5, fill: '#71717a', fontSize: 10, fontWeight: 'bold' }}
                tickFormatter={(val) => trendData.find(d => d.id === val)?.shortDate || ''}
              />
              <YAxis 
                stroke="#52525b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={formatYAxis}
                width={38}
                label={{ value: getMetricLabel(), angle: -90, position: 'insideLeft', offset: -5, fill: '#71717a', fontSize: 10, fontWeight: 'bold' }}
              />
              <Tooltip 
                cursor={{ fill: '#27272a' }} 
                offset={40}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-[#0A0A0A] border border-zinc-800 p-3.5 rounded-md shadow-lg pointer-events-none min-w-[220px] max-w-[280px]">
                        <p className="text-white font-bold text-xs mb-1 truncate">{data.fullTitle}</p>
                        <p className="text-zinc-400 text-[9px] mb-3 font-bold tracking-widest uppercase">{data.date}</p>
                        
                        <div className="space-y-1.5 border-t border-zinc-700/80 pt-2.5">
                           <div className="flex justify-between items-center gap-4">
                             <div className="flex items-center gap-1.5 opacity-80">
                               <div className="w-2 h-2 rounded-sm bg-zinc-500"></div>
                               <span className="text-zinc-400 text-[9px] uppercase tracking-widest font-bold">Actual {activeMetric === 'engagementRate' ? 'Rate' : 'Count'}</span>
                             </div>
                             <span className="text-zinc-100 font-bold tracking-tight text-[11px]">{activeMetric === 'engagementRate' ? data.value.toFixed(2) + '%' : formatNumber(data.value)}</span>
                           </div>
                           <div className="flex justify-between items-center gap-4">
                             <div className="flex items-center gap-1.5 animate-pulse">
                               <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></div>
                               <span className="text-orange-400 text-[9px] uppercase tracking-widest font-bold drop-shadow-[0_0_2px_rgba(249,115,22,0.8)]">Trend Curve</span>
                             </div>
                             <span className="text-orange-400 font-bold tracking-tight text-[11px]">{activeMetric === 'engagementRate' ? data.movingAvg.toFixed(2) + '%' : formatNumber(data.movingAvg)}</span>
                           </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={45}>
                {trendData.map((entry, index) => (
                  <Cell 
                    key={`cell-${entry.id}`} 
                    fill={index === trendData.length - 1 ? '#3b82f6' : '#3f3f46'} 
                    className="transition-all duration-300 hover:fill-blue-500 hover:opacity-100 opacity-60 cursor-pointer"
                  />
                ))}
              </Bar>
              <Line 
                type="monotone" 
                dataKey="movingAvg" 
                stroke="#f97316" 
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, fill: '#f97316', stroke: '#000', strokeWidth: 2 }} 
                isAnimationActive={true}
                animationDuration={800}
                style={{ filter: 'drop-shadow(0px 0px 4px rgba(249, 115, 22, 0.5))' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Views vs Likes Ratio (Scatter Plot) */}
      <div className="w-full h-[450px] bg-[#0A0A0A] border border-zinc-800 p-6 rounded-xl flex flex-col relative group pt-6 transition-all duration-500">
        
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 shrink-0 px-2 relative z-10">
          <div>
            <h3 className="text-zinc-500 font-bold tracking-widest text-xs uppercase mb-1 flex items-center gap-2">
              Views vs Likes Matrix
              <div className="group/mx relative inline-flex cursor-help align-middle">
                 <div className="w-3.5 h-3.5 rounded-sm border border-zinc-700 text-zinc-400 flex items-center justify-center text-[9px] font-bold hover:bg-white hover:text-black transition-colors bg-zinc-900">?</div>
                 <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-3 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-200 text-[10px] leading-relaxed shadow-md opacity-0 invisible group-hover/mx:opacity-100 group-hover/mx:visible transition-all duration-200 z-50 normal-case tracking-normal font-medium pointer-events-none text-center">
                   Groups videos by their traits. Top-right (Blue) are massive viral hits. Bottom-right (Red) are videos that got lots of views but nobody interacted with them (Clickbait).
                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-b-zinc-600"></div>
                 </div>
               </div>
            </h3>
            <p className="text-zinc-600 text-[10px] font-medium tracking-wide">Categorizing video performance traits</p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-end">
             <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div><span className="text-[9px] font-bold tracking-widest uppercase text-zinc-500">Hits</span></div>
             <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div><span className="text-[9px] font-bold tracking-widest uppercase text-zinc-500">Bait</span></div>
             <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div><span className="text-[9px] font-bold tracking-widest uppercase text-zinc-500">Underrated</span></div>
             <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-zinc-500"></div><span className="text-[9px] font-bold tracking-widest uppercase text-zinc-500">Average</span></div>
          </div>
        </div>

        <div className="flex-1 w-full min-h-0 relative z-10 pl-4 pb-2 select-none">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart 
              margin={{ top: 20, right: 30, bottom: 20, left: 10 }}
            >
              <XAxis 
                type="number" 
                dataKey="views" 
                name="Views" 
                stroke="#52525b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => formatNumber(value)} 
                padding={{ left: 20, right: 20 }}
                label={{ value: 'Video View Count', position: 'insideBottom', offset: -5, fill: '#71717a', fontSize: 10, fontWeight: 'bold' }}
              />
              <YAxis 
                type="number" 
                dataKey="likes" 
                name="Total Likes" 
                stroke="#52525b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => formatNumber(value)} 
                width={40}
                padding={{ top: 20, bottom: 20 }}
                label={{ value: 'Total Likes', angle: -90, position: 'insideLeft', offset: -5, fill: '#71717a', fontSize: 10, fontWeight: 'bold' }}
              />
              <ZAxis type="number" dataKey="views" range={[60, 300]} name="Size" />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3', stroke: '#3f3f46' }} 
                offset={40}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    
                    let category = 'Average'
                    let labelColor = 'text-zinc-400'
                    if (data.views >= avgViews && data.likes >= avgLikes) { category = 'Viral Hit'; labelColor = 'text-blue-400' }
                    else if (data.views >= avgViews && data.likes < avgLikes) { category = 'Clickbait'; labelColor = 'text-red-400' }
                    else if (data.views < avgViews && data.likes >= avgLikes) { category = 'Underrated'; labelColor = 'text-orange-400' }

                    return (
                      <div className="bg-[#0A0A0A] border border-zinc-800 p-3.5 rounded-md shadow-lg pointer-events-none min-w-[200px] max-w-[260px]">
                        <p className="text-white font-bold text-xs mb-1 truncate">{data.name}</p>
                        <p className="text-zinc-400 text-[9px] mb-3 font-bold uppercase tracking-widest">{data.date}</p>
                        <div className="flex flex-col gap-1.5 border-t border-zinc-700/80 pt-2.5">
                          <p className="text-zinc-100 font-bold text-[11px] tracking-widest flex justify-between"><span className="text-zinc-500 font-medium">VIEWS:</span> {formatNumber(data.views)}</p>
                          <p className="text-zinc-100 font-bold text-[11px] tracking-widest flex justify-between"><span className="text-zinc-500 font-medium">LIKES:</span> {formatNumber(data.likes)}</p>
                          <div className={`mt-1 font-bold text-xs uppercase tracking-widest text-center py-1 rounded bg-zinc-900/50 border border-zinc-800 ${labelColor}`}>
                            {category}
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Scatter name="Videos" data={matrixData} className="opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
                {matrixData.map((entry, index) => {
                  let fill = '#52525b' // default gray
                  if (entry.views >= avgViews && entry.likes >= avgLikes) fill = '#3b82f6' // Viral Hit (Blue)
                  else if (entry.views >= avgViews && entry.likes < avgLikes) fill = '#ef4444' // Clickbait (Red)
                  else if (entry.views < avgViews && entry.likes >= avgLikes) fill = '#f97316' // Underrated (Orange)
                  
                  return <Cell key={`cell-${index}`} fill={fill} />
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
