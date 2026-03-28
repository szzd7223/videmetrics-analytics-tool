'use client'

import { useState } from 'react'

export default function SearchForm({ onSearch }: { onSearch: (url: string) => void }) {
  const [url, setUrl] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      onSearch(url.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto flex items-center bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 shadow-xl transition-all">
      <div className="pl-6 text-zinc-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      </div>
      <input 
        type="text" 
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste Channel URL (e.g. youtube.com/@mkbhd)" 
        className="w-full bg-transparent text-white px-4 py-4 outline-none placeholder:text-zinc-600 font-medium text-lg"
      />
      <button 
        type="submit" 
        className="bg-zinc-100 hover:bg-white text-zinc-900 font-bold px-8 py-4 transition-colors tracking-tight text-lg"
      >
        Analyze
      </button>
    </form>
  )
}
