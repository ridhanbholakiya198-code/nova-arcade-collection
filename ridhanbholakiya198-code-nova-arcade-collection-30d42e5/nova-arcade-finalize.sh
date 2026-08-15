#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/nova-arcade-collection

ICON="$HOME/storage/downloads/nova-arcade-final-icon-1024.png"
[ -f "$ICON" ] || { echo "❌ Icon nahi mili: $ICON"; echo "Final logo PNG ko Downloads me isi naam se save karo."; exit 1; }

mkdir -p android/app/src/main/res/drawable-nodpi

# Use the approved final logo as the adaptive foreground; black remains the adaptive background.
cp "$ICON" android/app/src/main/res/drawable-nodpi/nova_arcade_logo.png
cat > android/app/src/main/res/values/ic_launcher_background.xml <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#000000</color>
</resources>
EOF

cat > android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/nova_arcade_logo"/>
</adaptive-icon>
EOF

cat > android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/nova_arcade_logo"/>
</adaptive-icon>
EOF

# Remove the old vector foreground so the drawable above is the only foreground source.
rm -f android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_foreground.xml

# Replace the audio system with short, punchy retro arcade SFX.
cat > src/lib/audio.ts <<'EOF'
class AudioSystem {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  enabled = true;
  private lastToneAt = 0;

  init() {
    if (!this.ctx) {
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtor) return;
      this.ctx = new AudioCtor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.16;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(enabled ? 0.16 : 0, this.ctx.currentTime, 0.02);
    }
  }

  private tone(freq: number, type: OscillatorType, duration: number, vol = 0.55, slideToFreq?: number, delay = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(35, freq), now);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(35, slideToFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  // Public game-engine tone, but rate-limited so accidental frame/event spam
  // cannot become an irritating continuous background sound.
  playTone(freq: number, type: OscillatorType, duration: number, vol = 0.55, slideToFreq?: number) {
    const now = performance.now();
    if (now - this.lastToneAt < 55) return;
    this.lastToneAt = now;
    this.tone(freq, type, Math.min(duration, 0.12), Math.min(vol, 0.55), slideToFreq);
  }

  playClick() {
    this.tone(740, 'square', 0.045, 0.38, 980);
  }

  playScore(multiplier = 1) {
    const f = 520 + Math.min(360, multiplier * 18);
    this.tone(f, 'square', 0.055, 0.34);
  }

  playCollect() {
    this.tone(660, 'square', 0.055, 0.38, 990);
  }

  playLevelUp() {
    this.tone(660, 'square', 0.055, 0.34);
    this.tone(990, 'square', 0.07, 0.34, 1320, 0.065);
    this.tone(1560, 'triangle', 0.08, 0.28, undefined, 0.14);
  }

  playGameOver() {
    this.tone(330, 'square', 0.08, 0.36, 220);
    this.tone(220, 'triangle', 0.11, 0.30, 110, 0.09);
  }

  playStart() {
    this.tone(392, 'square', 0.055, 0.32);
    this.tone(523, 'square', 0.055, 0.32, undefined, 0.065);
    this.tone(784, 'square', 0.08, 0.34, undefined, 0.13);
  }

  playTether() { this.tone(560, 'square', 0.065, 0.28, 820); }
  playLaunch() { this.tone(620, 'triangle', 0.09, 0.32, 260); }
  playCrash() {
    this.tone(180, 'square', 0.08, 0.36, 75);
    this.tone(120, 'triangle', 0.12, 0.28, 55, 0.08);
  }
}

export const audio = new AudioSystem();
EOF

# UI: only Light and Dark AMOLED; About submenu stays inside the viewport.
python - <<'PY'
from pathlib import Path
p=Path("src/components/ArcadeHub.tsx")
s=p.read_text()

s=s.replace(
"""  ChevronRight, Shield, FileText, X, MoreVertical, Zap,
   Wind, Layers, Car, Brain, Orbit, Sparkles, Timer, CircleDot,
   Crosshair, Boxes, Waypoints, Gauge, Moon, Shuffle, Target, Hexagon,
   type LucideIcon
""",
"""  ChevronRight, Shield, FileText, X, MoreVertical, Zap,
   Wind, Layers, Car, Brain, Orbit, Sparkles, Timer, CircleDot,
   Crosshair, Boxes, Waypoints, Gauge, Moon, Shuffle, Target, Hexagon,
   Sun, type LucideIcon
"""
)

s=s.replace(
"""  const [appearance, setAppearance] = useState<'amoled' | 'dim'>(() =>
    (localStorage.getItem('nova_arcade_appearance') as 'amoled' | 'dim') || 'amoled'
  );""",
"""  const [appearance, setAppearance] = useState<'amoled' | 'light'>(() =>
    localStorage.getItem('nova_arcade_appearance') === 'light' ? 'light' : 'amoled'
  );"""
)

s=s.replace(
"""  const toggleAppearance = () => {
    audio.init();
    audio.playClick();
    setAppearance(v => v === 'amoled' ? 'dim' : 'amoled');
  };""",
"""  const toggleAppearance = () => {
    audio.init();
    audio.playClick();
    setAppearance(v => v === 'amoled' ? 'light' : 'amoled');
  };"""
)

old="""                <MenuRow
                  icon={<Palette size={17} />}
                  label="Appearance"
                  onClick={toggleAppearance}
                  right={<span className="text-[10px] uppercase tracking-wider text-zinc-600">{appearance === 'amoled' ? 'AMOLED' : 'DIM'}</span>}
                />"""
new="""                <MenuRow
                  icon={appearance === 'amoled' ? <Moon size={17} /> : <Sun size={17} />}
                  label="Appearance"
                  onClick={toggleAppearance}
                  right={
                    <span
                      role="switch"
                      aria-checked={appearance === 'amoled'}
                      aria-label={appearance === 'amoled' ? 'Dark AMOLED theme' : 'Light theme'}
                      className={`relative w-12 h-7 rounded-full border transition-colors ${appearance === 'amoled' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-200 border-zinc-300'}`}
                    >
                      <span className={`absolute top-0.5 w-6 h-6 rounded-full flex items-center justify-center shadow-sm transition-all ${appearance === 'amoled' ? 'left-[22px] bg-black text-white' : 'left-0.5 bg-white text-zinc-700'}`}>
                        {appearance === 'amoled' ? <Moon size={13} /> : <Sun size={13} />}
                      </span>
                    </span>
                  }
                />"""
if old not in s:
    raise SystemExit("appearance block not found")
s=s.replace(old,new)

old2="""                      className="absolute right-[calc(100%+8px)] top-[82px] w-56 p-1.5 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-2xl\""""
new2="""                      className="fixed right-4 top-20 z-[60] w-[calc(100vw-2rem)] max-w-xs p-1.5 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-2xl md:absolute md:right-[calc(100%+8px)] md:top-[82px] md:w-56\""""
if old2 not in s:
    raise SystemExit("about position block not found")
s=s.replace(old2,new2)

# Make the hub background react to light mode without touching game canvases.
s=s.replace(
"""    <div className="min-h-screen bg-black text-white flex flex-col font-sans">""",
"""    <div className={`min-h-screen flex flex-col font-sans transition-colors ${appearance === 'light' ? 'bg-zinc-50 text-zinc-950' : 'bg-black text-white'}`}>"""
)

# Header text in light mode.
s=s.replace(
"""<span className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 font-bold">NOVA ARCADE</span>""",
"""<span className={`text-[10px] uppercase tracking-[0.28em] font-bold ${appearance === 'light' ? 'text-zinc-500' : 'text-zinc-500'}`}>NOVA ARCADE</span>"""
)

# Keep menu readable in light mode by adding a light-mode class hook.
s=s.replace(
"""className="absolute right-0 top-14 z-50 w-60 p-1.5 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-2xl\"""",
"""className={`absolute right-0 top-14 z-50 w-60 p-1.5 rounded-2xl border backdrop-blur-xl shadow-2xl ${appearance === 'light' ? 'border-zinc-200 bg-white/95' : 'border-zinc-800 bg-zinc-950/95'}`}"""
)

p.write_text(s)
PY

# Light theme polish for the menu/submenu and keep AMOLED pure black.
cat >> src/index.css <<'EOF'

html[data-appearance='light'] {
  background: #fafafa;
}
html[data-appearance='light'] body {
  background: #fafafa;
  color: #09090b;
}
html[data-appearance='light'] .bg-black {
  background-color: #fafafa !important;
}
html[data-appearance='light'] .bg-zinc-950 {
  background-color: #ffffff !important;
}
html[data-appearance='light'] .bg-zinc-950\/95 {
  background-color: rgba(255,255,255,.95) !important;
}
html[data-appearance='light'] [data-menu-row] {
  color: #27272a !important;
}
html[data-appearance='light'] [data-menu-row] > span:first-child {
  color: #71717a !important;
}
html[data-appearance='light'] [data-menu-row]:hover {
  background: rgba(0,0,0,.05) !important;
}
html[data-appearance='light'] [data-arcade-menu] .border-zinc-800 {
  border-color: #e4e4e7 !important;
}
html[data-appearance='light'] .text-white {
  color: #18181b !important;
}
html[data-appearance='light'] .text-zinc-400 {
  color: #71717a !important;
}
html[data-appearance='light'] .text-zinc-500 {
  color: #71717a !important;
}
html[data-appearance='light'] .text-zinc-600 {
  color: #a1a1aa !important;
}
EOF

git add -A
git commit -m "Polish audio, final icon, themes and mobile menu"
git push origin main

echo
echo "✅ Nova Arcade final fixes pushed to GitHub."
