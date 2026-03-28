'use client'

import { useState } from 'react'
import SearchForm from '@/components/SearchForm'
import Dashboard from '@/components/Dashboard'
import { analyzeCompetitor } from './actions/youtube'
import { ChannelInfo, VideoInfo } from '@/lib/youtube'

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{ channel: ChannelInfo, videos: VideoInfo[] } | null>(null)

  const handleSearch = async (url: string, honeypot?: string) => {
    setLoading(true)
    setError(null)
    setData(null)

    try {
      const result = await analyzeCompetitor(url, honeypot)
      
      if ('error' in result) {
        setError(result.error)
      } else {
        setData(result)
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-zinc-100 selection:bg-white/20 overflow-hidden relative">
      {/* Crisp Geometric Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b33_1px,transparent_1px),linear-gradient(to_bottom,#18181b33_1px,transparent_1px)] bg-size-[48px_48px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0"></div>
      
      <div className="container mx-auto px-6 py-12 relative z-10 w-full max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-12 pt-4 md:pt-8 relative">
          <div className="flex justify-center items-center gap-4 mb-10 animate-in fade-in zoom-in-95 duration-1000 ease-out">
            <div className="flex items-end gap-1 px-1.5 py-1 border border-zinc-800 rounded-sm">
              <div className="w-1 h-2 bg-zinc-700" />
              <div className="w-1 h-4 bg-zinc-500" />
              <div className="w-1 h-6 bg-white font-bold" />
              <div className="mb-0.5 ml-0.5 w-0 h-0 border-t-[6px] border-t-transparent border-l-[9px] border-l-white border-b-[6px] border-b-transparent" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-white uppercase italic">VidMetrics</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-white pb-2 leading-tight animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150 fill-mode-both">
            Actionable insights for <br className="hidden md:block"/> YouTube channels.
          </h1>
          
          <p className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
            Instantly surface performance outliers and engagement trends so you can focus on executing strategy instead of crunching data.
          </p>
          
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500 fill-mode-both">
            <SearchForm onSearch={handleSearch} isLoading={loading} />
          </div>
          
          {error && (
            <div className="mt-8 p-4 bg-red-900/30 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-4">
              {error}
            </div>
          )}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center mt-24 space-y-6">
            <div className="w-10 h-10 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
            <p className="text-zinc-500 tracking-widest uppercase text-[10px] font-bold">Fetching channel data...</p>
          </div>
        )}

        {data && !loading && (
          <Dashboard channel={data.channel} initialVideos={data.videos} />
        )}
      </div>
    </main>
  )
}
