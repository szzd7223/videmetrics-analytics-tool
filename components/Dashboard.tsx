'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChannelInfo, VideoInfo } from '@/lib/youtube'
import { formatNumber, formatDate, cn } from '@/lib/utils'
import Charts from '@/components/Charts'

const TooltipHelp = ({ text, down = false }: { text: string, down?: boolean }) => {
  const tooltipClasses = cn(
    "absolute left-1/2 -translate-x-1/2 w-64 p-3 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 text-xs shadow-md opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-50 normal-case tracking-normal font-medium pointer-events-none text-center leading-relaxed",
    down ? "top-full mt-2" : "bottom-full mb-2"
  )
  
  return (
    <div className="group/tooltip relative inline-flex cursor-help align-middle ml-1">
      <div className="w-3.5 h-3.5 rounded-sm border border-zinc-700 text-zinc-500 flex items-center justify-center text-[10px] font-bold hover:bg-white hover:text-black transition-colors">?</div>
      <div className={tooltipClasses}>
        {text}
        <div className={cn("absolute left-1/2 -translate-x-1/2 border-[5px] border-transparent", down ? "bottom-full border-b-zinc-800 translate-y-[2px]" : "top-full border-t-zinc-800 translate-y-[-2px]")}></div>
      </div>
    </div>
  )
}

export default function Dashboard({ channel, initialVideos }: { channel: ChannelInfo, initialVideos: VideoInfo[] }) {
  const [timeFilter, setTimeFilter] = useState<'15' | '50' | '100' | 'all'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'engagement' | 'outlier'>('date')
  const [currentPage, setCurrentPage] = useState(1)
  const [isAiCopied, setIsAiCopied] = useState(false)
  const PAGE_SIZE = 9

  // 1. Data Cohort Filtering (Global Engine)
  const filteredVideos = useMemo(() => {
    if (timeFilter === '15') return initialVideos.slice(0, 15)
    if (timeFilter === '50') return initialVideos.slice(0, 50)
    if (timeFilter === '100') return initialVideos.slice(0, 100)
    return initialVideos
  }, [initialVideos, timeFilter])

  const medianViews = useMemo(() => {
    const viewsArray = [...filteredVideos].map(v => v.viewCount).sort((a, b) => a - b)
    if (viewsArray.length === 0) return 1
    return viewsArray.length % 2 === 0
      ? (viewsArray[viewsArray.length / 2 - 1] + viewsArray[viewsArray.length / 2]) / 2
      : viewsArray[Math.floor(viewsArray.length / 2)]
  }, [filteredVideos])

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

  const avgEngRate = filteredVideos.length > 0 ? (filteredVideos.reduce((sum, v) => sum + (v.engagementRate || 0), 0) / filteredVideos.length) : 0
  const totalLikes = useMemo(() => filteredVideos.reduce((acc, v) => acc + (v.likeCount || 0), 0), [filteredVideos])
  const totalComments = useMemo(() => filteredVideos.reduce((acc, v) => acc + (v.commentCount || 0), 0), [filteredVideos])
  const totalEngagement = totalLikes + totalComments
  
  const avgLikes = filteredVideos.length > 0 ? totalLikes / filteredVideos.length : 0
  const avgComments = filteredVideos.length > 0 ? totalComments / filteredVideos.length : 0

  // 4. Command Console Intelligence (Activity & Viral Engine)
  const postingActivity = useMemo(() => {
    if (initialVideos.length < 2) return { status: 'UNKNOWN', label: 'NEW CHANNEL', tooltip: 'Not enough data to determine tempo.' }
    
    const now = new Date().getTime()
    const lastPostDate = new Date(initialVideos[0].publishedAt).getTime()
    const daysSinceLast = (now - lastPostDate) / (1000 * 60 * 60 * 24)
    
    // Last 10 videos cadence
    const recentBatch = initialVideos.slice(0, Math.min(10, initialVideos.length))
    const totalDaysSpan = (new Date(recentBatch[0].publishedAt).getTime() - new Date(recentBatch[recentBatch.length - 1].publishedAt).getTime()) / (1000 * 60 * 60 * 24)
    const avgCadence = totalDaysSpan / (recentBatch.length - 1)

    if (daysSinceLast > 21) return { status: 'CRITICAL', label: 'DRY', tooltip: 'No uploads in over 3 weeks. Algorithmic decay is likely. Distribution reach will be restricted until consistency returns.' }
    if (daysSinceLast > 10) return { status: 'WARNING', label: 'INACTIVE', tooltip: 'Upload gap detected. The audience pool is cooling down. A new upload is required to re-establish momentum.' }
    if (avgCadence <= 2) return { status: 'SUCCESS', label: 'HYPERACTIVE', tooltip: 'Aggressive posting schedule. High visibility, but monitor for viewer fatigue and quality dips.' }
    return { status: 'NORMAL', label: 'ACTIVE', tooltip: 'Consistent posting rhythm. Signals healthy growth and reliable channel management to the algorithm.' }
  }, [initialVideos])

  const lastPostText = useMemo(() => {
    if (initialVideos.length === 0) return 'Never'
    const days = Math.floor((new Date().getTime() - new Date(initialVideos[0].publishedAt).getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days}d ago`
  }, [initialVideos])

  const viralHitRate = useMemo(() => {
    if (filteredVideos.length === 0) return 0
    const hits = filteredVideos.filter(v => (v.viewCount / medianViews) >= 1.5).length
    return (hits / filteredVideos.length) * 100
  }, [filteredVideos, medianViews])

  const engagementVelocity = useMemo(() => {
    if (filteredVideos.length === 0) return 0
    const totalViews = filteredVideos.reduce((sum, v) => sum + v.viewCount, 0)
    const totalLikes = filteredVideos.reduce((sum, v) => sum + v.likeCount, 0)
    return (totalLikes / totalViews) * 100
  }, [filteredVideos])

  return (
    <div className="w-full max-w-6xl mx-auto mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 fade-in pb-20">

      {/* 1. Global Time Filter Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#0A0A0A] border border-zinc-800 p-3 pl-6 rounded-xl">
        <h2 className="text-zinc-500 font-bold text-xs uppercase tracking-widest flex items-center">
          Global Analysis Horizon
          <TooltipHelp text="Select a data cohort to instantly recalculate all median baselines, outlier scores, and historical trajectories strictly based on those recency blocks." />
        </h2>
        <div className="flex bg-black/50 border border-zinc-800 p-1.5 rounded-lg gap-1 shadow-inner overflow-x-auto w-full xl:w-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                "px-4 sm:px-6 py-1.5 sm:py-2 rounded-md flex flex-col items-center justify-center transition-all duration-300 shrink-0 cursor-pointer",
                timeFilter === tf.id
                  ? "bg-white text-black font-bold"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"
              )}
            >
              <span className="text-[11px] sm:text-xs font-bold tracking-widest uppercase">{tf.label}</span>
              <span className="text-[10px] sm:text-[11px] opacity-70 tracking-wide font-medium mt-0.5">{tf.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Channel Overview Card (Command Console Layout) */}
      <a 
        href={`https://youtube.com/channel/${channel.id}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className="grid grid-cols-1 lg:grid-cols-5 gap-8 bg-[#0A0A0A] border border-zinc-800 p-8 rounded-xl hover:border-zinc-700 transition-all duration-300 group cursor-pointer"
      >
        {/* Left: Bio Info */}
        <div className="lg:col-span-3 flex flex-col md:flex-row items-center lg:items-start gap-6">
          <img src={channel.thumbnailUrl} alt={channel.title} className="w-24 h-24 md:w-32 md:h-32 rounded-lg border border-zinc-800 group-hover:border-zinc-600 transition-colors shrink-0" />
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase mb-2 group-hover:text-blue-400 transition-colors leading-none">{channel.title}</h1>
            <p className="text-zinc-400 mb-0 max-w-2xl font-medium leading-relaxed line-clamp-2 text-sm">{channel.description || 'No channel description available.'}</p>
          </div>
        </div>

        {/* Right: Health Metrics Grid (2x2) */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3 h-full">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 flex flex-col justify-center">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Subscribers</span>
            <span className="text-lg font-bold text-white tracking-tight">{formatNumber(channel.subscriberCount)}</span>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 flex flex-col justify-center">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Total Videos</span>
            <span className="text-lg font-bold text-white tracking-tight">{formatNumber(channel.videoCount)}</span>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 flex flex-col justify-center">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Last Posted</span>
            <span className="text-lg font-bold text-white tracking-tight">{lastPostText}</span>
          </div>
          <div className={cn(
            "bg-zinc-900/50 border rounded-lg p-3 flex flex-col justify-center relative overflow-visible",
            postingActivity.status === 'SUCCESS' ? "border-emerald-900/50" : 
            postingActivity.status === 'WARNING' ? "border-amber-900/50" : 
            postingActivity.status === 'CRITICAL' ? "border-red-900/50" : "border-zinc-800"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Activity</span>
              <TooltipHelp text={postingActivity.tooltip} down />
            </div>
            <span className={cn(
              "text-lg font-black tracking-tighter",
              postingActivity.status === 'SUCCESS' ? "text-emerald-400" : 
              postingActivity.status === 'WARNING' ? "text-amber-400" : 
              postingActivity.status === 'CRITICAL' ? "text-red-400" : "text-white"
            )}>
              {postingActivity.label}
            </span>
          </div>
        </div>
      </a>

      {/* 3. Insight Cards Row (Expanded Strategic Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Metric 1: Viral Hit Rate */}
        <div className="bg-[#0A0A0A] border border-zinc-800 p-5 rounded-xl flex flex-col justify-between items-center md:items-start group hover:border-zinc-600 transition-colors h-full">
          <span className="text-[10px] text-white font-bold uppercase tracking-widest mb-2 flex flex-col sm:flex-row items-center w-full justify-center md:justify-start gap-1 text-center md:text-left">
            <span>Viral Hit Rate</span>
            <TooltipHelp text="The % of your videos that reached at least 1.5x of your usual baseline. This measures creative reliability." />
          </span>
          <span className="text-2xl font-bold text-white tracking-tight leading-none mt-auto">
            {viralHitRate.toFixed(1)}%
          </span>
        </div>

        {/* Metric 2: Median Views */}
        <div className="bg-[#0A0A0A] border border-white/10 p-5 rounded-xl flex flex-col justify-between items-center md:items-start group hover:border-white/30 transition-colors overflow-visible h-full">
          <span className="text-[10px] text-white font-bold uppercase tracking-widest mb-2 flex flex-col sm:flex-row items-center w-full justify-center md:justify-start gap-1 text-center md:text-left">
            <span>Median Views</span>
            <TooltipHelp text="The typical views for a video. We use Median instead of Average so rare viral hits don't skew the baseline." />
          </span>
          <span className="text-2xl font-bold text-white tracking-tight leading-none mt-auto">
            {filteredVideos.length === 0 ? '0' : formatNumber(medianViews)}
          </span>
        </div>

        {/* Metric 3: Likes per 100 */}
        <div className="bg-[#0A0A0A] border border-white/10 p-5 rounded-xl flex flex-col justify-between items-center md:items-start group hover:border-white/30 transition-colors overflow-visible h-full">
          <span className="text-[10px] text-zinc-200 font-bold uppercase tracking-widest mb-2 flex flex-col sm:flex-row items-center w-full justify-center md:justify-start gap-1 text-center md:text-left">
            <span>Velocity</span>
            <TooltipHelp text="Likes per 100 views. This measures the 'Efficiency of Impression.' High velocity means you are hitting the right audience." />
          </span>
          <span className="text-2xl font-bold text-white tracking-tight leading-none mt-auto">
            {engagementVelocity.toFixed(1)} <span className="text-[10px] opacity-40">/100</span>
          </span>
        </div>

        {/* Metric 4: Avg. Engagement */}
        <div className="bg-[#0A0A0A] border border-zinc-800 p-5 rounded-xl flex flex-col justify-between items-center md:items-start group hover:border-zinc-600 transition-colors h-full">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2 text-center md:text-left">Engagement</span>
          <span className="text-2xl font-bold text-white tracking-tight leading-none mt-auto">{avgEngRate.toFixed(2)}%</span>
        </div>

        {/* Metric 5: Avg. Likes */}
        <div className="bg-[#0A0A0A] border border-zinc-800 p-5 rounded-xl flex flex-col justify-between items-center md:items-start group hover:border-zinc-600 transition-colors h-full">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2 text-center md:text-left">Avg. Likes</span>
          <span className="text-2xl font-bold text-white tracking-tight leading-none mt-auto">{formatNumber(avgLikes)}</span>
        </div>

        {/* Metric 6: Avg. Comments */}
        <div className="bg-[#0A0A0A] border border-zinc-800 p-5 rounded-xl flex flex-col justify-between items-center md:items-start group hover:border-zinc-600 transition-colors h-full">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2 text-center md:text-left">Avg. Comments</span>
          <span className="text-2xl font-bold text-white tracking-tight leading-none mt-auto">{formatNumber(avgComments)}</span>
        </div>
      </div>

      {/* 4. Charts Row */}
      {filteredVideos.length > 2 ? (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150 fill-mode-both">
          <Charts videos={filteredVideos} />
        </div>
      ) : (
        <div className="w-full h-32 bg-[#0C0C0C] border border-stone-800 rounded-xl flex items-center justify-center text-stone-500 font-bold uppercase tracking-widest text-xs">
          Not enough videos in this timeframe to generate charts.
        </div>
      )}

      {/* 5. Video Table/Grid with Filters */}
      <div className="space-y-6 pt-4">
        {filteredVideos.length > 0 && (
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#0A0A0A] p-4 border border-zinc-800 rounded-xl">
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Video Library</span>
              <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-lg gap-1">
                {['date', 'engagement', 'outlier'].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleSort(type as any)}
                    className={cn("px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-colors cursor-pointer", sortBy === type ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-200")}
                  >
                    {type === 'date' ? 'NEWEST' : 
                     type === 'views' ? 'MOST VIEWED' : 
                     type === 'engagement' ? 'MOST ENGAGING' : 
                     'TOP OUTLIERS'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => {
                  const csvRows = sortedVideos.map(v => `"${v.title.replace(/"/g, '""')}","${formatDate(v.publishedAt)}",${v.viewCount},${(v.viewCount / medianViews).toFixed(2)}x,${v.engagementRate?.toFixed(2) || 0},"https://youtube.com/watch?v=${v.id}"`).join("\n");
                  const prompt = `Act as an expert YouTube strategist. Give me detailed insights on this channel based on my analytics data. Look for trends, specify what causes their viral outliers, identify brilliant formats and highlight any content gaps.\n\nHere is the raw data:\nTitle,Published Date,Views,Outlier Score,Engagement %,URL\n${csvRows}`;
                  
                  navigator.clipboard.writeText(prompt).then(() => {
                    setIsAiCopied(true);
                    setTimeout(() => setIsAiCopied(false), 5000);
                    window.open('https://chatgpt.com', '_blank');
                  });
                }}
                disabled={isAiCopied}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2 text-[10px] sm:text-xs font-bold tracking-widest rounded-md transition-all border w-full sm:w-auto cursor-pointer",
                  isAiCopied 
                    ? "bg-white text-black border-transparent" 
                    : "bg-white hover:bg-zinc-200 text-black border-transparent"
                )}
              >
                <span>{isAiCopied ? '✅ NOW PASTE (CTRL+V) IN CHATGPT' : 'ASK AI (CHATGPT)'}</span>
                {!isAiCopied && <TooltipHelp text="We generate an optimized analysis prompt loaded with your CSV data and save it to your clipboard. Due to strict browser security sandboxing, you must manually paste it (Ctrl+V) when ChatGPT opens." />}
              </button>
              <button
                onClick={() => {
                  const csvContent = "data:text/csv;charset=utf-8,"
                    + "Title,Published Date,Views,Outlier Score,Engagement %,URL\n"
                    + sortedVideos.map(v => `"${v.title.replace(/"/g, '""')}","${formatDate(v.publishedAt)}",${v.viewCount},${(v.viewCount / medianViews).toFixed(2)}x,${v.engagementRate?.toFixed(2) || 0},"https://youtube.com/watch?v=${v.id}"`).join("\n");
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", `${channel.title.replace(/\s+/g, '_')}_channel_analysis.csv`);
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                }}
                className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-white text-[10px] font-bold tracking-widest rounded-md transition-colors border border-stone-700 cursor-pointer"
              >
                EXPORT CSV
              </button>
            </div>
          </div>
        )}

        {/* Video Components with Smooth Transitions */}
        <div className="relative min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {sortedVideos.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(video => {
                const daysSincePublished = Math.max(1, Math.floor((new Date().getTime() - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60 * 24)))
                const viewsPerDay = Math.floor(video.viewCount / daysSincePublished)
                const totalEngagements = video.likeCount + video.commentCount
                const viewersPerEngagement = totalEngagements > 0 ? Math.round(video.viewCount / totalEngagements) : 0
                const engagementBadge = viewersPerEngagement > 0 ? `1 IN ${viewersPerEngagement}` : 'NO'

                const outlierMultiplier = parseFloat((video.viewCount / Math.max(medianViews, 1)).toFixed(1))
                const isOutlier = outlierMultiplier >= 1.5

                return (
                  <a href={`https://youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" key={video.id} className="bg-[#0A0A0A] border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition-all duration-300 group flex flex-col relative">
                    <div className="relative aspect-video overflow-hidden">
                      <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out grayscale-[0.2] group-hover:grayscale-0" />

                      {isOutlier && (
                        <div className="absolute top-3 left-3 bg-red-900/80 text-white pl-3 pr-2 py-1 text-[10px] font-bold rounded shadow-sm border border-red-900/50 z-20 flex items-center justify-center gap-1 uppercase tracking-widest cursor-default backdrop-blur-md">
                          <span>OUTLIER {outlierMultiplier}x</span>
                          <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                            <TooltipHelp text={`This video massively overperformed the channel's mathematical baseline (${outlierMultiplier}x). Try analyzing its thumbnail layout and core topic selection.`} down />
                          </div>
                        </div>
                      )}

                      {/* Engagement Badge */}
                      <div className="absolute top-3 right-3 bg-blue-900/80 text-white px-3 py-1 text-[10px] font-bold rounded shadow-sm border border-blue-900/50 z-20 flex items-center justify-center gap-1.5 uppercase tracking-widest pointer-events-none backdrop-blur-md">
                        {engagementBadge} <span className="text-[8px] font-bold opacity-80 mt-px">ENGAGED</span>
                      </div>

                      <div className="absolute bottom-3 right-3 bg-zinc-900/90 text-white px-2 py-1 text-[10px] font-bold tracking-widest rounded uppercase z-20 pointer-events-none border border-zinc-700/50">
                        {formatDate(video.publishedAt)}
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="text-zinc-100 font-bold text-[15px] mb-4 line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">{video.title}</h3>
                      <div className="grid grid-cols-3 gap-2 mt-auto pt-4 border-t border-stone-800/80">
                        <div className="flex flex-col" title="Normalizes total view count by the number of days since it was published">
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Views/Day</span>
                          <span className="text-zinc-100 font-bold text-sm tracking-tight">{formatNumber(viewsPerDay)}</span>
                        </div>
                        <div className="flex flex-col" title={`Likes: ${formatNumber(video.likeCount)} | Comments: ${formatNumber(video.commentCount)}`}>
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1 cursor-help">Engagement</span>
                          <span className="text-orange-400 font-bold text-sm tracking-tight cursor-help tabular-nums">
                            {formatNumber(totalEngagements)}
                          </span>
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
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Pagination Console with Tactile Feedback */}
        {sortedVideos.length > PAGE_SIZE && (
          <div className="flex justify-between items-center mt-6 px-6 py-4 bg-[#0A0A0A] border border-zinc-800 rounded-xl mb-12">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-bold uppercase tracking-widest rounded-md transition-colors border border-zinc-800 cursor-pointer"
            >
              Previous
            </motion.button>
            <span className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase">Page {currentPage} of {Math.ceil(sortedVideos.length / PAGE_SIZE)}</span>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(sortedVideos.length / PAGE_SIZE)))}
              disabled={currentPage === Math.ceil(sortedVideos.length / PAGE_SIZE)}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-bold uppercase tracking-widest rounded-md transition-colors border border-zinc-800 cursor-pointer"
            >
              Next
            </motion.button>
          </div>
        )}
      </div>
    </div>
  )
}
