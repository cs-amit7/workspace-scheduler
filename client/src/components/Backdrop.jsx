import {
  Wifi,
  Monitor,
  Projector,
  Whiteboard,
  Clock,
  CalendarCheck,
  Plug,
  Desk,
  TimeChip,
} from './backdropIcons.jsx';

const HERO_STREAKS = [
  { id: 'hs-1', left: '10%', isExtra: false },
  { id: 'hs-2', left: '22%', isExtra: true },
  { id: 'hs-3', left: '36%', isExtra: true },
  { id: 'hs-4', left: '50%', isExtra: false },
  { id: 'hs-5', left: '64%', isExtra: true },
  { id: 'hs-6', left: '78%', isExtra: true },
  { id: 'hs-7', left: '90%', isExtra: false },
];

const APP_STREAKS = [
  { id: 'as-1', left: '12%', isExtra: false },
  { id: 'as-2', left: '32%', isExtra: false },
  { id: 'as-3', left: '68%', isExtra: true },
  { id: 'as-4', left: '88%', isExtra: false },
];

const HERO_TILES = [
  { id: 'hero-wifi', icon: Wifi, top: '14%', left: '12%', size: 'w-11 h-11', delay: '0s', dur: '11s' },
  { id: 'hero-monitor', icon: Monitor, top: '22%', right: '14%', size: 'w-12 h-12', delay: '1.2s', dur: '13s' },
  { id: 'hero-projector', icon: Projector, top: '46%', left: '8%', size: 'w-11 h-11', delay: '2.5s', dur: '12s' },
  { id: 'hero-whiteboard', icon: Whiteboard, top: '64%', right: '10%', size: 'w-12 h-12', delay: '0.8s', dur: '14s' },
  { id: 'hero-clock', icon: Clock, top: '78%', left: '16%', size: 'w-10 h-10', delay: '3.1s', dur: '10.5s' },
  { id: 'hero-cal', icon: CalendarCheck, top: '16%', right: '28%', size: 'w-11 h-11', delay: '1.8s', dur: '12.5s' },
  { id: 'hero-plug', icon: Plug, top: '82%', right: '22%', size: 'w-10 h-10', delay: '2.2s', dur: '11.5s' },
  { id: 'hero-desk', icon: Desk, top: '34%', left: '22%', size: 'w-12 h-12', delay: '3.6s', dur: '13.5s' },
  { id: 'hero-time-1', isChip: true, time: '10:30', top: '40%', right: '22%', size: 'px-3 py-1.5', delay: '1.5s', dur: '12s' },
  { id: 'hero-time-2', isChip: true, time: '14:00', top: '68%', left: '26%', size: 'px-3 py-1.5', delay: '2.9s', dur: '10.8s' },
];

const APP_TILES = [
  // Left outer gutter (< 15%)
  { id: 'app-wifi', icon: Wifi, top: '18%', left: '3%', size: 'w-11 h-11', delay: '0s', dur: '12s' },
  { id: 'app-monitor', icon: Monitor, top: '48%', left: '4%', size: 'w-12 h-12', delay: '1.6s', dur: '13.5s' },
  { id: 'app-time', isChip: true, time: '10:30', top: '76%', left: '3%', size: 'px-3 py-1.5', delay: '3.2s', dur: '11s' },
  // Right outer gutter (> 85%)
  { id: 'app-cal', icon: CalendarCheck, top: '22%', right: '3%', size: 'w-11 h-11', delay: '0.9s', dur: '10.5s' },
  { id: 'app-desk', icon: Desk, top: '52%', right: '4%', size: 'w-12 h-12', delay: '2.4s', dur: '12.5s' },
  { id: 'app-clock', icon: Clock, top: '78%', right: '3%', size: 'w-10 h-10', delay: '1.8s', dur: '14s' },
];

export function Backdrop({ variant = 'app' }) {
  const isHero = variant === 'hero';
  const streaks = isHero ? HERO_STREAKS : APP_STREAKS;
  const tiles = isHero ? HERO_TILES : APP_TILES;

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden="true"
      data-testid="backdrop-container"
    >
      {/* Layer 2: Noise texture */}
      <div className="absolute inset-0 backdrop-noise" data-testid="backdrop-noise" />

      {/* Layer 3: Static vertical streaks */}
      <div
        className={`absolute inset-0 ${isHero ? 'backdrop-streaks-hero' : 'backdrop-streaks-app'}`}
        data-testid="backdrop-streaks"
      >
        {streaks.map((streak) => (
          <div
            key={streak.id}
            className={`backdrop-streak ${streak.isExtra ? 'hidden md:block' : ''}`}
            style={{ left: streak.left }}
            data-testid="backdrop-streak"
          />
        ))}
      </div>

      {/* Layer 4: Brand ambient glow */}
      <div
        className={`backdrop-glow ${isHero ? 'backdrop-glow-hero' : 'backdrop-glow-app'}`}
        data-testid="backdrop-glow"
      />

      {/* Layer 5: Workspace floating tiles */}
      <div
        className={`absolute inset-0 ${isHero ? 'hidden md:block' : 'backdrop-tiles-app hidden xl:block'}`}
        data-testid="backdrop-tiles"
      >
        {tiles.map((tile) => {
          const IconComponent = tile.icon;
          const style = {
            top: tile.top,
            bottom: tile.bottom,
            left: tile.left,
            right: tile.right,
            '--delay': tile.delay,
            '--dur': tile.dur,
          };

          return (
            <div
              key={tile.id}
              className={`absolute flex items-center justify-center rounded-xl backdrop-tile ${tile.size} ${
                isHero ? 'hidden md:flex' : 'hidden xl:flex'
              }`}
              style={style}
              data-testid="backdrop-tile"
            >
              {tile.isChip ? (
                <TimeChip time={tile.time} />
              ) : (
                <IconComponent className="w-5 h-5" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Backdrop;

