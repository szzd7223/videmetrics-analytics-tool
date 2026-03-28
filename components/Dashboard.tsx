'use client'

import { useState, useMemo } from 'react'
import { ChannelInfo, VideoInfo } from '@/lib/youtube'
import { formatNumber, formatDate, cn } from '@/lib/utils'
import Charts from '@/components/Charts'

const TooltipHelp = ({ text }: { text: string }) => (
  <div className="group/tooltip relative inline-flex ml-1.5 cursor-help align-middle">
    <div className="w-4 h-4 rounded-full border border-zinc-500/50 text-zinc-400 flex items-center justify-center text-[10px] font-bold hover:bg-white hover:text-zinc-900 transition-colors bg-zinc-800/80 shadow-md">?</div>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3.5 bg-zinc-800 border border-zinc-600 rounded-xl text-zinc-100 text-xs shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-50 normal-case tracking-normal font-medium pointer-events-none drop-shadow-2xl text-center leading-relaxed">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-zinc-600"></div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-zinc-800 translate-y-[-2px]"></div>
    </div>
  </div>
)

export default function Dashboard({ channel, initialVideos }: { channel: ChannelInfo, initialVideos: VideoInfo[] }) {
  const [timeFilter, setTimeFilter] = useState<'15' | '50' | '100' | 'all'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'engagement' | 'outlier'>('date')
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 9

  // 1. Data Cohort Filtering (Global Engine)
  const filteredVideos = useMemo(() => {
    // initialVideos is inherently sorted recursively descending by fetchLatestVideos API
    if (timeFilter === '15') return initialVideos.slice(0, 15)
    if (timeFilter === '50') return initialVideos.slice(0, 50)
    if (timeFilter === '100') return initialVideos.slice(0, 100)
    return initialVideos // 'all' equates to MAX History (Up to 150 videos)
  }, [initialVideos, timeFilter])

  // Re-calculate Median Views strictly based on the current time window
  const medianViews = useMemo(() => {
    const viewsArray = [...filteredVideos].map(v => v.viewCount).sort((a, b) => a - b)
    if (viewsArray.length === 0) return 1
    return viewsArray.length % 2 === 0
      ? (viewsArray[viewsArray.length / 2 - 1] + viewsArray[viewsArray.length / 2]) / 2
      : viewsArray[Math.floor(viewsArray.length / 2)]
  }, [filteredVideos])

  // 2. Sorting Logic
  const sortedVideos = useMemo(() => {
    return [...filteredVideos].sort((a, b) => {
      if (sortBy === 'date') return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      if (sortBy === 'views') return b.viewCount - a.viewCount
      if (sortBy === 'engagement') return (b.engagementRate || 0) - (a.engagementRate || 0)
      if (sortBy === 'outlier') {
        const outA = a.viewCount / medianViews
        const outB = b.viewCount / medianViews
        return outB - outA
      }
      return 0
    })
  }, [filteredVideos, sortBy, medianViews])

  const handleTimeFilter = (tf: '15' | '50' | '100' | 'all') => {
    setTimeFilter(tf)
    setCurrentPage(1)
  }

  const handleSort = (type: 'date' | 'views' | 'engagement' | 'outlier') => {
    setSortBy(type)
    setCurrentPage(1)
  }

  // 3. Dynamic Calculated Insights based strictly on filtered time window
  const avgEngRate = filteredVideos.length > 0 ? (filteredVideos.reduce((sum, v) => sum + (v.engagementRate || 0), 0) / filteredVideos.length) : 0
  const avgLikes = filteredVideos.length > 0 ? Math.floor(filteredVideos.reduce((sum, v) => sum + v.likeCount, 0) / filteredVideos.length) : 0
  const avgComments = filteredVideos.length > 0 ? Math.floor(filteredVideos.reduce((sum, v) => sum + v.commentCount, 0) / filteredVideos.length) : 0

  return (
    <div className="w-full max-w-6xl mx-auto mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 fade-in pb-20">

      {/* 1. Global Time Filter Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-zinc-900 border border-zinc-800 p-3 pl-6 rounded-3xl shadow-lg">
        <h2 className="text-zinc-500 font-bold text-xs uppercase tracking-widest flex items-center">
          Global Analysis Horizon
          <TooltipHelp text="Select a data cohort to instantly recalculate all median baselines, outlier scores, and historical trajectories strictly based on those recency blocks." />
        </h2>
        <div className="flex bg-black/50 border border-zinc-800 p-1.5 rounded-full gap-1 shadow-inner overflow-x-auto w-full xl:w-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {[
            { id: '15', label: 'LAST 15 VIDEOS', sub: 'Short-term trend' },
            { id: '50', label: 'LAST 50 VIDEOS', sub: 'Mid-term trend' },
            { id: '100', label: 'LAST 100 VIDEOS', sub: 'Long-term trend' },
            { id: 'all', label: 'ALL 150 VIDEOS', sub: 'Overall trend' }
          ].map((tf) => (
            <button
              key={tf.id}
              onClick={() => handleTimeFilter(tf.id as any)}
              className={cn(
                "px-4 sm:px-6 py-1.5 sm:py-2 rounded-full flex flex-col items-center justify-center transition-all duration-300 shrink-0",
                timeFilter === tf.id
                  ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"
              )}
            >
              <span className="text-[11px] sm:text-xs font-bold tracking-widest uppercase">{tf.label}</span>
              <span className="text-[10px] sm:text-[11px] opacity-70 tracking-wide font-medium mt-0.5">{tf.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Channel Overview Card */}
      <div className="flex flex-col md:flex-row items-center gap-6 bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
        <img src={channel.thumbnailUrl} alt={channel.title} className="w-24 h-24 md:w-32 md:h-32 rounded-full border border-zinc-700 shadow-xl" />
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">{channel.title}</h1>
          <p className="text-zinc-400 font-medium text-lg mb-4">{channel.customUrl}</p>
          <p className="text-zinc-500 text-sm line-clamp-2 leading-relaxed max-w-3xl">{channel.description}</p>
        </div>
      </div>

      {/* 3. Insight Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl shadow-lg flex flex-col items-center md:items-start group hover:border-zinc-700 transition-colors">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Subscribers</span>
          <span className="text-2xl font-bold text-white tracking-tight">{formatNumber(channel.subscriberCount)}</span>
        </div>

        <div className="bg-zinc-900/50 border border-red-900/30 p-5 rounded-3xl shadow-lg flex flex-col items-center md:items-start relative overflow-visible group">
          <div className="absolute inset-0 bg-red-500/5 rounded-3xl opacity-50 group-hover:opacity-100 transition-opacity z-0"></div>
          <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-2 flex items-center relative z-10 w-full justify-center md:justify-start">
            Median Views
            <TooltipHelp text="The typical views for a video. We use Median instead of Average so rare viral hits don't skew the baseline." />
          </span>
          <span className="text-2xl font-bold text-white tracking-tight relative z-10">
            {filteredVideos.length === 0 ? '0' : formatNumber(medianViews)}
          </span>
        </div>

        <div className="bg-zinc-900/50 border border-blue-900/30 p-5 rounded-3xl shadow-lg flex flex-col items-center md:items-start relative overflow-visible group">
          <div className="absolute inset-0 bg-blue-500/5 rounded-3xl opacity-50 group-hover:opacity-100 transition-opacity z-0"></div>
          <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-2 flex items-center relative z-10 w-full justify-center md:justify-start">
            Engagement
            <TooltipHelp text="How active the viewers are. A 5% rate means 5 out of 100 viewers liked or commented." />
          </span>
          <span className="text-2xl font-bold text-white tracking-tight relative z-10">{avgEngRate.toFixed(2)}%</span>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl shadow-lg flex flex-col items-center md:items-start group hover:border-zinc-700 transition-colors">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Channel Views</span>
          <span className="text-2xl font-bold text-white tracking-tight">{formatNumber(channel.viewCount)}</span>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl shadow-lg flex flex-col items-center md:items-start group hover:border-zinc-700 transition-colors">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Avg. Likes / Video</span>
          <span className="text-2xl font-bold text-white tracking-tight">{formatNumber(avgLikes)}</span>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl shadow-lg flex flex-col items-center md:items-start group hover:border-zinc-700 transition-colors">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Avg. Comments / Video</span>
          <span className="text-2xl font-bold text-white tracking-tight">{formatNumber(avgComments)}</span>
        </div>
      </div>

      {/* 4. Charts Row */}
      {filteredVideos.length > 2 ? (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150 fill-mode-both">
          <Charts videos={filteredVideos} />
        </div>
      ) : (
        <div className="w-full h-32 bg-zinc-900/30 border border-zinc-800/80 rounded-3xl flex items-center justify-center text-zinc-500 font-bold uppercase tracking-widest text-xs">
          Not enough videos in this timeframe to generate charts.
        </div>
      )}

      {/* 5. Video Table/Grid with Filters */}
      <div className="space-y-6 pt-4">
        {filteredVideos.length > 0 && (
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-900/30 p-4 border border-zinc-800/80 rounded-2xl">
            <div className="flex items-center gap-3 ml-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Video Library</h2>
              <TooltipHelp text="The Outlier Score shows exactly how many times better a video performed compared to the channel's usual median views." />
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-full gap-1 shadow-inner">
                {['date', 'outlier', 'engagement'].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleSort(type as any)}
                    className={cn("px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors", sortBy === type ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-zinc-200")}
                  >
                    {type === 'date' ? 'NEWEST' : type === 'outlier' ? '🔥 TOP OUTLIERS' : 'MOST ENGAGING'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  const csvContent = "data:text/csv;charset=utf-8,"
                    + "Title,Published Date,Views,Outlier Score,Engagement %,URL\n"
                    + sortedVideos.map(v => `"${v.title.replace(/"/g, '""')}","${formatDate(v.publishedAt)}",${v.viewCount},${(v.viewCount / medianViews).toFixed(2)}x,${v.engagementRate?.toFixed(2) || 0},"https://youtube.com/watch?v=${v.id}"`).join("\n");
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", `${channel.title.replace(/\s+/g, '_')}_competitor_analysis.csv`);
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold tracking-widest rounded-full transition-colors shadow-lg"
              >
                EXPORT CSV
              </button>
            </div>
          </div>
        )}

        {/* Video Components */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedVideos.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(video => {
            const daysSincePublished = Math.max(1, Math.floor((new Date().getTime() - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60 * 24)))
            const viewsPerDay = Math.floor(video.viewCount / daysSincePublished)
            const totalEngagements = video.likeCount + video.commentCount
            const viewersPerEngagement = totalEngagements > 0 ? Math.round(video.viewCount / totalEngagements) : 0
            const engagementBadge = viewersPerEngagement > 0 ? `1 IN ${viewersPerEngagement}` : 'NO'

            // Outlier Engine Calculation
            const outlierMultiplier = parseFloat((video.viewCount / Math.max(medianViews, 1)).toFixed(1))
            const isOutlier = outlierMultiplier >= 1.5 // Anything performing 1.5x better than median is flagged

            return (
              <a href={`https://youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" key={video.id} className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden hover:border-blue-500/50 hover:bg-zinc-800/40 transition-all duration-300 group shadow-lg drop-shadow-sm flex flex-col relative">

                <div className="relative aspect-video overflow-hidden">
                  <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />

                  {/* Outlier Engine Badge */}
                  {isOutlier && (
                    <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1.5 text-[10px] font-bold rounded-full shadow-xl border border-red-400/50 z-20 flex items-center gap-1 uppercase tracking-widest pointer-events-none">
                      🔥 {outlierMultiplier}x OUTLIER
                    </div>
                  )}

                  {/* Engagement Badge */}
                  <div className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1.5 text-[10px] font-bold rounded-full shadow-xl border border-blue-400/50 z-20 flex items-center gap-1.5 uppercase tracking-widest pointer-events-none">
                    {engagementBadge} <span className="text-[8px] font-bold opacity-80 mt-px">ENGAGED</span>
                  </div>

                  <div className="absolute bottom-3 right-3 bg-black/90 text-white px-2 py-1 text-[10px] font-bold tracking-widest rounded uppercase z-20 pointer-events-none">
                    {formatDate(video.publishedAt)}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-zinc-100 font-bold text-[15px] mb-4 line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">{video.title}</h3>
                  <div className="grid grid-cols-3 gap-2 mt-auto pt-4 border-t border-zinc-800/80">
                    <div className="flex flex-col" title="Normalizes total view count by the number of days since it was published">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Views/Day</span>
                      <span className="text-zinc-100 font-bold text-sm tracking-tight">{formatNumber(viewsPerDay)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Total Likes</span>
                      <span className="text-orange-400 font-bold text-sm tracking-tight">{formatNumber(video.likeCount)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Total Views</span>
                      <span className="text-blue-400 font-bold text-sm tracking-tight">{formatNumber(video.viewCount)}</span>
                    </div>
                  </div>
                </div>
              </a>
            )
          })}
        </div>

        {/* Pagination Console */}
        {sortedVideos.length > PAGE_SIZE && (
          <div className="flex justify-between items-center mt-6 px-6 py-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl backdrop-blur-xl mb-12">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-colors"
            >
              Previous
            </button>
            <span className="text-zinc-400 text-[10px] font-bold tracking-widest uppercase">Page {currentPage} of {Math.ceil(sortedVideos.length / PAGE_SIZE)}</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(sortedVideos.length / PAGE_SIZE)))}
              disabled={currentPage === Math.ceil(sortedVideos.length / PAGE_SIZE)}
              className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
