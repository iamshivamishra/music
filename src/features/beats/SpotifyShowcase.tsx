import { ExternalLink } from "lucide-react";

const SPOTIFY_TRACKS = [
  {
    title: "Midnight Vibes Playlist",
    spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
  },
  {
    title: "Trap Nation Mix",
    spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd",
  },
  {
    title: "Lo-Fi Chill Beats",
    spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn",
  },
  {
    title: "Hip Hop Instrumentals",
    spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS",
  },
];

export default function SpotifyShowcase() {
  if (SPOTIFY_TRACKS.length === 0) return null;

  return (
    <section className="app-container pb-16">
      <h2 className="mb-6 text-2xl font-semibold">On Spotify</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {SPOTIFY_TRACKS.map((track) => (
          <a
            key={track.spotifyUrl}
            href={track.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl border border-border/50 bg-card/60 p-4 transition-colors hover:bg-card/90"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">{track.title}</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              Listen on Spotify
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
