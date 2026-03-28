import { unstable_cache } from 'next/cache';

const API_KEY = process.env.YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export interface ChannelInfo {
  id: string;
  title: string;
  description: string;
  customUrl: string;
  thumbnailUrl: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  uploadsPlaylistId: string;
}

export interface VideoInfo {
  id: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  engagementRate?: number; // Custom metric
}

/**
 * Extracts a handle or channel ID from a YouTube URL.
 */
export function parseYouTubeUrl(url: string): { type: 'handle' | 'id', value: string } | null {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    
    // e.g. /@mkbhd
    if (pathname.startsWith('/@')) {
      return { type: 'handle', value: pathname.substring(1) }; // handle starts with '@', API actually takes just handle, or does it take handle without @? Wait, the API for forHandle takes the handle WITH the @ or without? The API actually expects 'forHandle' without the @ usually, wait, no, the API was updated to support handles. Actually, `forUsername` is old, `forHandle` is new. Let's send it exactly as it is, but usually handle starts with @. Let's keep the @.
    }
    
    // e.g. /channel/UCX6OQ3DkcsbYNE6H8uQQuVA
    if (pathname.startsWith('/channel/')) {
      return { type: 'id', value: pathname.replace('/channel/', '').split('/')[0] };
    }

    // e.g. /c/CreatorName (old style)
    if (pathname.startsWith('/c/')) {
      // API v3 doesn't have a direct /c/ lookup without search, but let's try forUsername
      return { type: 'handle', value: pathname.replace('/c/', '').split('/')[0] }; 
    }
    
    return null;
  } catch (error) {
    // If it's just a string like @mkbhd
    if (url.startsWith('@')) {
      return { type: 'handle', value: url };
    }
    return null;
  }
}

/**
 * Fetch Channel Information
 */
export const fetchChannel = async (identifier: { type: 'handle' | 'id'; value: string }): Promise<ChannelInfo | null> => {
  if (!API_KEY) throw new Error('YOUTUBE_API_KEY is missing');

  const paramName = identifier.type === 'handle' ? 'forHandle' : 'id';
  // Note: if forHandle is used, we typically include the @
  const value = identifier.type === 'handle' && !identifier.value.startsWith('@') ? `@${identifier.value}` : identifier.value;

  const url = `${BASE_URL}/channels?part=snippet,contentDetails,statistics&${paramName}=${value}&key=${API_KEY}`;
  
  const res = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour
  if (!res.ok) throw new Error('Failed to fetch channel');
  
  const data = await res.json();
  
  if (!data.items || data.items.length === 0) {
    return null;
  }

  const item = data.items[0];
  
  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    customUrl: item.snippet.customUrl,
    thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
    subscriberCount: parseInt(item.statistics.subscriberCount) || 0,
    viewCount: parseInt(item.statistics.viewCount) || 0,
    videoCount: parseInt(item.statistics.videoCount) || 0,
    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
  };
};

/**
 * Fetch latest videos from the uploads playlist
 */
export const fetchLatestVideos = async (uploadsPlaylistId: string, maxResults = 30): Promise<VideoInfo[]> => {
  if (!API_KEY) throw new Error('YOUTUBE_API_KEY is missing');

  // Step 1: Get Playlist Items (Video IDs)
  const playlistUrl = `${BASE_URL}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${API_KEY}`;
  const playlistRes = await fetch(playlistUrl, { next: { revalidate: 3600 } });
  
  if (!playlistRes.ok) throw new Error('Failed to fetch playlist items');
  const playlistData = await playlistRes.json();
  
  if (!playlistData.items || playlistData.items.length === 0) return [];

  const videoIds = playlistData.items.map((item: any) => item.snippet.resourceId.videoId).join(',');
  
  // Step 2: Get Video Statistics
  const videosUrl = `${BASE_URL}/videos?part=snippet,statistics&id=${videoIds}&key=${API_KEY}`;
  const videosRes = await fetch(videosUrl, { next: { revalidate: 3600 } });
  
  if (!videosRes.ok) throw new Error('Failed to fetch video statistics');
  const videosData = await videosRes.json();

  const videos: VideoInfo[] = videosData.items.map((item: any) => {
    const viewCount = parseInt(item.statistics.viewCount) || 0;
    const likeCount = parseInt(item.statistics.likeCount) || 0;
    const commentCount = parseInt(item.statistics.commentCount) || 0;
    
    // Basic engagement rate: (Likes + Comments) / Views
    const engagementRate = viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;

    return {
      id: item.id,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
      thumbnailUrl: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      viewCount,
      likeCount,
      commentCount,
      engagementRate,
    };
  });

  return videos;
};


