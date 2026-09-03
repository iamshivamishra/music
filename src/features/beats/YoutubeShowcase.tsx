import Image from "next/image";
import { Play } from "lucide-react";

const YOUTUBE_VIDEOS = [
  { videoId: "dQw4w9WgXcQ", title: "Making a Trap Beat from Scratch" },
  { videoId: "jNQXAC9IVRw", title: "Lo-Fi Hip Hop Production Tutorial" },
  { videoId: "9bZkp7q19f0", title: "Behind the Beat: Studio Session" },
  { videoId: "kJQP7kiw5Fk", title: "How We Mixed This Hit Track" },
];

export default function YoutubeShowcase() {
  if (YOUTUBE_VIDEOS.length === 0) return null;

  return (
    <section className="app-container pb-16">
      <h2 className="mb-6 text-2xl font-semibold">From Our YouTube</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {YOUTUBE_VIDEOS.map((video) => (
          <a
            key={video.videoId}
            href={`https://www.youtube.com/watch?v=${video.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block overflow-hidden rounded-xl"
          >
            <Image
              src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
              alt={video.title}
              width={320}
              height={180}
              className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow">
                <Play className="h-5 w-5 fill-current text-foreground" />
              </div>
            </div>
            <p className="mt-2 truncate text-sm font-medium">{video.title}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
