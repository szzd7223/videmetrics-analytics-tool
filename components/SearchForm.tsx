'use client'

import { useState, useRef } from 'react'

export default function SearchForm({ onSearch, isLoading }: { onSearch: (url: string) => void, isLoading?: boolean }) {
  const [url, setUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submittedUrl = inputRef.current?.value || url
    if (submittedUrl.trim() && !isLoading) {
      onSearch(submittedUrl.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto flex items-center bg-zinc-900/80 border border-zinc-800 rounded-full overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 shadow-2xl transition-all backdrop-blur-md">
      <div className="pl-6 text-zinc-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      </div>
      <input 
        ref={inputRef}
        type="text" 
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste Channel URL (e.g. youtube.com/@mkbhd)" 
        className="w-full bg-transparent text-white px-4 py-4 outline-none placeholder:text-zinc-600 font-medium text-lg disabled:opacity-50"
        disabled={isLoading}
      />
      <button 
        type="submit" 
        disabled={isLoading || false}
        className="bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold px-8 py-4 transition-all tracking-tight text-lg cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-zinc-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Analyzing...
          </>
        ) : (
          'Analyze'
        )}
      </button>
    </form>
  )
}
