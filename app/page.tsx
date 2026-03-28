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

  const handleSearch = async (url: string) => {
    setLoading(true)
    setError(null)
    setData(null)

    try {
      const result = await analyzeCompetitor(url)
      
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
    <main className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 overflow-hidden relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[400px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-6 py-24 relative z-10 w-full max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-400 font-bold text-xs tracking-widest uppercase mb-8 border border-blue-500/20 shadow-lg shadow-blue-500/5">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            VidMetrics OS
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-linear-to-br from-white via-zinc-200 to-zinc-600 bg-clip-text text-transparent pb-2">
            Uncover the competitor's <br className="hidden md:block"/> winning formula.
          </h1>
          <p className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
            Paste any YouTube channel URL or handle and instantly see which videos are crushing it. Stop guessing, start analyzing.
          </p>
          
          <SearchForm onSearch={handleSearch} />
          
          {error && (
            <div className="mt-8 p-4 bg-red-900/30 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-4">
              {error}
            </div>
          )}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center mt-24 space-y-6">
            <div className="w-10 h-10 border-2 border-zinc-800 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-zinc-400 tracking-widest uppercase text-xs font-bold animate-pulse">Analyzing Vibe Metrics...</p>
          </div>
        )}

        {data && !loading && (
          <Dashboard channel={data.channel} initialVideos={data.videos} />
        )}
      </div>
    </main>
  )
}
