import { addMinutes, subHours, subDays, format } from 'date-fns';

export interface Video {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
  publishedAt: Date;
  fetchedAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'held' | 'published' | 'unpublished';
  source: 'automated' | 'manual';
  qualityScore: number;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    subscribers: number;
    engagementRate: number;
  };
  topics: string[];
}

export interface ActivityLog {
  id: string;
  action: string;
  admin: string;
  target: string;
  timestamp: Date;
  details?: string;
}

const THUMBNAILS = [
  "https://images.unsplash.com/photo-1660165458059-57cfb6cc87e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnRpZmljaWFsJTIwaW50ZWxsaWdlbmNlJTIwZnV0dXJpc3RpYyUyMGRpZ2l0YWwlMjBhYnN0cmFjdHxlbnwxfHx8fDE3NzA5NjM1NTF8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1762968269894-1d7e1ce8894e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNoJTIwY29uZmVyZW5jZSUyMHNwZWFrZXIlMjBzdGFnZXxlbnwxfHx8fDE3NzA5Mzk5NTh8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2RpbmclMjBwcm9ncmFtbWluZyUyMGNvbXB1dGVyJTIwc2NyZWVuJTIwbWF0cml4fGVufDF8fHx8MTc3MDk2MzU1Mnww&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1764755932155-dabbee87df7e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBtaW5pbWFsJTIwaG9tZSUyMG9mZmljZSUyMHdvcmtzcGFjZSUyMHNldHVwfGVufDF8fHx8MTc3MDk2MzU1Mnww&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1770249196567-832c9d08de9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb2JvdGljcyUyMGZ1dHVyaXN0aWMlMjBjeWJvcmclMjB0ZWNobm9sb2d5fGVufDF8fHx8MTc3MDk2MzU1Mnww&ixlib=rb-4.1.0&q=80&w=1080"
];

const TITLES = [
  "The Future of Generative AI: Beyond LLMs",
  "Clean Architecture in React: A Deep Dive",
  "Robotics & Automation 2026 Summit Keynote",
  "Minimalist Desk Setup Tour 2026",
  "Neural Networks Explained in 10 Minutes",
  "Why Rust is Taking Over Web Development",
  "System Design Interview: Scaling to 100M Users",
  "The End of Silicon? Quantum Computing Updates",
  "Mastering Tailwind CSS v4 in Production",
  "Ethical AI: The Governance Framework"
];

const CHANNELS = [
  "TechVisionary", "CodeAlchemy", "FutureScale", "MinimalTech", "DeepMindset", "SystemCrafters"
];

export const generateMockVideos = (count: number): Video[] => {
  return Array.from({ length: count }).map((_, i) => {
    const statusRand = Math.random();
    let status: Video['status'] = 'pending';
    if (statusRand > 0.8) status = 'published';
    else if (statusRand > 0.6) status = 'approved';
    else if (statusRand > 0.5) status = 'rejected';

    const score = Math.floor(Math.random() * 40) + 60; // 60-100

    return {
      id: `v-${Math.random().toString(36).substr(2, 9)}`,
      title: TITLES[i % TITLES.length],
      channel: CHANNELS[i % CHANNELS.length],
      thumbnail: THUMBNAILS[i % THUMBNAILS.length],
      duration: `${Math.floor(Math.random() * 20) + 5}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      publishedAt: subDays(new Date(), Math.floor(Math.random() * 10)),
      fetchedAt: subHours(new Date(), Math.floor(Math.random() * 24)),
      status,
      source: Math.random() > 0.3 ? 'automated' : 'manual',
      qualityScore: score,
      metrics: {
        views: Math.floor(Math.random() * 500000) + 10000,
        likes: Math.floor(Math.random() * 20000) + 500,
        comments: Math.floor(Math.random() * 5000) + 100,
        subscribers: Math.floor(Math.random() * 1000000) + 50000,
        engagementRate: Number((Math.random() * 0.1).toFixed(3)),
      },
      topics: ['AI', 'Tech', 'Programming'].sort(() => 0.5 - Math.random()).slice(0, 2),
    };
  });
};

export const MOCK_VIDEOS = generateMockVideos(25);

export const MOCK_LOGS: ActivityLog[] = [
  { id: 'l1', action: 'Published', admin: 'Sarah Connor', target: 'The Future of Generative AI', timestamp: subHours(new Date(), 1) },
  { id: 'l2', action: 'Rejected', admin: 'Sarah Connor', target: 'Crypto Scams 101', timestamp: subHours(new Date(), 2), details: 'Low quality score (45)' },
  { id: 'l3', action: 'Fetched', admin: 'System', target: 'Batch #4029', timestamp: subHours(new Date(), 2.5) },
  { id: 'l4', action: 'Approved', admin: 'John Wick', target: 'Clean Architecture', timestamp: subHours(new Date(), 5) },
  { id: 'l5', action: 'Config Change', admin: 'Neo', target: 'Scoring Thresholds', timestamp: subDays(new Date(), 1), details: 'Increased min score to 75' },
];
