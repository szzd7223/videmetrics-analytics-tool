'use client'

import { useState } from 'react'
import { ChannelInfo, VideoInfo } from '@/lib/youtube'
import { formatNumber, formatDate, cn } from '@/lib/utils'

export default function Dashboard({ channel, initialVideos }: { channel: ChannelInfo, initialVideos: VideoInfo[] }) {
  const [videos, setVideos] = useState(initialVideos)
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'engagement'>('date')

  const handleSort = (type: 'date' | 'views' | 'engagement') => {
    setSortBy(type)
    const sorted = [...videos].sort((a, b) => {
      if (type === 'date') return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      if (type === 'views') return b.viewCount - a.viewCount
      if (type === 'engagement') return (b.engagementRate || 0) - (a.engagementRate || 0)
      return 0
    })
    setVideos(sorted)
  }

  return (
    <div className="w-full max-w-6xl mx-auto mt-12 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 fade-in">
      <div className="flex flex-col md:flex-row items-center gap-6 bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
        <img src={channel.thumbnailUrl} alt={channel.title} className="w-24 h-24 rounded-full border border-zinc-700 shadow-xl" />
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">{channel.title}</h1>
          <p className="text-zinc-400 mb-5">{channel.customUrl}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-4">
            <div className="bg-zinc-800/80 px-4 py-2 rounded-xl border border-zinc-700/50">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">Subscribers</p>
              <p className="text-xl font-bold text-white tracking-tight">{formatNumber(channel.subscriberCount)}</p>
            </div>
            <div className="bg-zinc-800/80 px-4 py-2 rounded-xl border border-zinc-700/50">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">Total Views</p>
              <p className="text-xl font-bold text-white tracking-tight">{formatNumber(channel.viewCount)}</p>
            </div>
            <div className="bg-zinc-800/80 px-4 py-2 rounded-xl border border-zinc-700/50 hidden md:block">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">Videos</p>
              <p className="text-xl font-bold text-white tracking-tight">{formatNumber(channel.videoCount)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Recent Performance</h2>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-full gap-1">
            {['date', 'views', 'engagement'].map((type) => (
              <button
                key={type}
                onClick={() => handleSort(type as any)}
                className={cn("px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors", sortBy === type ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-zinc-200")}
              >
                {type === 'date' ? 'NEWEST' : type === 'views' ? 'MOST VIEWED' : 'INTERACTION %'}
              </button>
            ))}
          </div>
          <button 
            onClick={() => {
              const csvContent = "data:text/csv;charset=utf-8," 
                + "Title,Published Date,Views,Interaction %,URL\n"
                + videos.map(v => `"${v.title.replace(/"/g, '""')}","${formatDate(v.publishedAt)}",${v.viewCount},${v.engagementRate?.toFixed(2) || 0},"https://youtube.com/watch?v=${v.id}"`).join("\n");
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `${channel.title.replace(/\s+/g, '_')}_competitor_analysis.csv`);
              document.body.appendChild(link);
              link.click();
              link.remove();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-full transition-colors shadow-lg"
          >
            EXPORT CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map(video => (
          <a href={`https://youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" key={video.id} className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden hover:border-blue-500/50 hover:bg-zinc-800/40 transition-all duration-300 group shadow-lg drop-shadow-sm flex flex-col">
            <div className="relative aspect-video overflow-hidden">
              <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="text-[15px] font-semibold text-zinc-100 line-clamp-2 mb-2 leading-snug group-hover:text-blue-400 transition-colors" title={video.title}>{video.title}</h3>
              <p className="text-zinc-500 text-xs mb-5 font-medium">{formatDate(video.publishedAt)}</p>
              
              <div className="mt-auto flex justify-between items-center pt-4 border-t border-zinc-800">
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-500 font-bold tracking-widest">VIEWS</span>
                  <span className="text-zinc-200 font-bold text-sm tracking-tight">{formatNumber(video.viewCount)}</span>
                </div>
                <div className="flex flex-col items-end" title="(Likes + Comments) / Total Views">
                  <span className="text-[10px] text-zinc-500 font-bold tracking-widest cursor-help">INTERACTION</span>
                  <span className="font-bold text-lg tracking-tight text-white">
                    {video.engagementRate?.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
