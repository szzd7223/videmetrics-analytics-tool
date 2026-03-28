'use server'

import { fetchChannel, fetchLatestVideos, parseYouTubeUrl, ChannelInfo, VideoInfo } from '@/lib/youtube';

export async function analyzeCompetitor(url: string): Promise<{ channel: ChannelInfo, videos: VideoInfo[] } | { error: string }> {
  try {
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
