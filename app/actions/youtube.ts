'use server'

import { fetchChannel, fetchLatestVideos, parseYouTubeUrl, ChannelInfo, VideoInfo } from '@/lib/youtube';
import { ratelimit, globalRatelimit } from '@/lib/ratelimit';
import { headers } from 'next/headers';

export async function analyzeCompetitor(url: string, honeypotValue?: string): Promise<{ channel: ChannelInfo, videos: VideoInfo[] } | { error: string }> {
  try {
    // 1. Honeypot Trap (Bot-spoofing detection)
    if (honeypotValue && honeypotValue.length > 0) {
      console.warn('Honeypot triggered! Bot detected.');
      return { error: 'Security Exception: Automated behavior detected. Please refresh and try again.' };
    }

    // 2. Global Killswitch (App-wide Quota Protection)
    const { success: globalSuccess } = await globalRatelimit.limit('global');
    if (!globalSuccess) {
      return { error: 'System Capacity Reached: The tool is currently under heavy load. Our daily YouTube API quota has been reached for the entire community. Please check back tomorrow.' };
    }

    // 3. User Rate Limiting (IP-based)
    const headerList = await headers();
    const ip = headerList.get('x-forwarded-for') || '127.0.0.1';
    const { success } = await ratelimit.limit(ip);
    
    if (!success) {
      return { error: 'Daily Limit Reached: Due to YouTube API quota constraints, we provide 15 free analysis credits per 24 hours. We are currently developing premium tiers for higher volume research.' };
    }

    const identifier = parseYouTubeUrl(url);
    if (!identifier) return { error: 'Invalid YouTube URL or Handle (Try: @mkbhd or https://youtube.com/@mkbhd)' };

    const channel = await fetchChannel(identifier);
    if (!channel) return { error: 'Channel not found. Please ensure the handle/ID is correct.' };

    const videos = await fetchLatestVideos(channel.uploadsPlaylistId);

    return { channel, videos };
  } catch (err: any) {
    console.error(err);
    return { error: err.message || 'An error occurred while fetching YouTube data' };
  }
}
