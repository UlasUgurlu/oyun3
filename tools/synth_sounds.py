"""Nabız ses efektlerini ve müziğini sıfırdan sentezler (dosya indirmeden).

Çalıştırma: python3 tools/synth_sounds.py  (numpy, scipy ve ffmpeg gerekir)
"""
import os, subprocess
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')
rng = np.random.default_rng(7)

def t_(dur): return np.arange(int(SR * dur)) / SR
def env(n, attack=0.003, decay=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)
def lp(x, f, order=2): return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def sweep(f0, f1, dur, curve=2.0):
    t = t_(dur); k = (t / dur) ** (1 / curve)
    f = f0 + (f1 - f0) * k
    return np.sin(2 * np.pi * np.cumsum(f) / SR)

def add(*xs):
    out = np.zeros(max(len(x) for x in xs))
    for x in xs: out[:len(x)] += x
    return out

def stereo(x, pan=0.0):
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l * 1.41, x * r * 1.41], axis=1)

def mix(*parts):
    n = max(len(p) for p in parts)
    out = np.zeros((n, 2))
    for p in parts:
        p = stereo(p) if p.ndim == 1 else p
        out[:len(p)] += p
    return out

def impulse(dur, decay, bright=6000):
    n = int(SR * dur); t = np.arange(n) / SR
    ir = np.stack([lp(rng.standard_normal(n), bright), lp(rng.standard_normal(n), bright)], 1)
    ir *= np.exp(-t / decay)[:, None]
    ir[: int(SR * 0.012)] = 0  # ön gecikme
    return ir / np.abs(ir).sum(0).max() * 6

def reverb(x, dur=1.6, decay=0.45, wet=0.3, bright=6000):
    x = stereo(x) if x.ndim == 1 else x
    ir = impulse(dur, decay, bright)
    n = len(x) + len(ir)
    out = np.zeros((n, 2)); out[:len(x)] = x * (1 - wet)
    for c in range(2):
        out[:, c] += wet * np.fft.irfft(np.fft.rfft(x[:, c], n) * np.fft.rfft(ir[:, c], n), n)
    return out

def pingpong(x, delay=0.12, fb=0.4, taps=4):
    x = stereo(x) if x.ndim == 1 else x
    d = int(SR * delay); out = np.zeros((len(x) + d * taps, 2)); out[:len(x)] += x
    for i in range(1, taps + 1):
        side = i % 2; seg = x.mean(1) * fb ** i
        out[d * i: d * i + len(x), side] += lp(seg, 5000)
    return out

def save(name, x, peak=0.89):
    x = stereo(x) if x.ndim == 1 else x
    fade = int(SR * 0.01); x[-fade:] *= np.linspace(1, 0, fade)[:, None]
    x = x / (np.abs(x).max() + 1e-9) * peak
    # sondaki sessizliği kırp
    idx = np.where(np.abs(x).max(1) > 0.0015)[0]; x = x[: idx[-1] + 1 if len(idx) else len(x)]
    wavfile.write(os.path.join(OUT, name), SR, (x * 32767).astype(np.int16))

# ---------- yapı taşları ----------
def thump(depth=1.0, f0=120, f1=45, dur=0.22):
    body = sweep(f0, f1, dur, 3) * env(int(SR * dur), 0.002, 0.07)
    knock = np.sin(2 * np.pi * 190 * t_(0.06)) * env(int(SR * 0.06), 0.001, 0.02) * 0.5
    click = hp(rng.standard_normal(int(SR * 0.006)), 2500) * 0.25
    return add(body * depth, knock, click)

def bell(f, dur=1.4, index=3.0, ratio=2.0):
    t = t_(dur); e = env(len(t), 0.002, dur / 4)
    mod = np.sin(2 * np.pi * f * ratio * t) * index * np.exp(-t / 0.25)
    car = np.sin(2 * np.pi * f * t + mod)
    part = 0.25 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.15)
    spark = 0.18 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.08)
    return (car + part + spark) * e

def lub_dub(gap=0.2, depth=1.0):
    a = thump(depth); b = thump(depth * 0.7, 140, 55, 0.18)
    out = np.zeros(int(SR * gap) + len(b)); out[:len(a)] += a; out[int(SR * gap):] += b
    return out

# ---------- efektler ----------
def build_sfx():
    save('hit.wav', reverb(thump(1.0), 0.8, 0.18, 0.18))

    notes = [523.25, 587.33, 659.25, 783.99, 880.0]  # pentatonik: kombo yükseldikçe tırmanır
    for i, f in enumerate(notes, 1):
        b = add(bell(f, 1.6, 2.6 + i * 0.3) * 0.8, bell(f * 2, 1.0, 1.2, 3.5) * 0.25)
        x = mix(pingpong(b, 0.11, 0.35, 3), stereo(thump(0.8) * 0.9))
        save(f'perfect_{i}.wav', reverb(x, 2.2, 0.55, 0.32, 7000))

    t = t_(0.5)
    clang = sum(a * np.sin(2 * np.pi * 430 * r * t) * np.exp(-t / d)
                for r, a, d in [(1, 1, .18), (2.41, .6, .12), (3.93, .45, .08), (5.4, .3, .05)])
    whoosh = bp(rng.standard_normal(len(t)), 900, 5000) * np.sin(np.pi * np.minimum(1, t / 0.35)) ** 2 * 0.35
    pan = np.linspace(-0.8, 0.8, len(t))
    w = np.stack([whoosh * np.cos((pan + 1) * np.pi / 4), whoosh * np.sin((pan + 1) * np.pi / 4)], 1) * 1.41
    save('graze.wav', reverb(mix(stereo(clang * env(len(t), 0.001, 0.3)), w), 1.4, 0.4, 0.3))

    boom = sweep(70, 28, 0.9, 3) * env(int(SR * 0.9), 0.002, 0.3)
    crash = lp(rng.standard_normal(int(SR * 0.5)), 900) * env(int(SR * 0.5), 0.001, 0.12) * 0.6
    td = t_(0.9); fall = np.zeros(len(td))
    for det in (-0.012, 0, 0.012):
        f = 440 * (1 + det) * (0.25 ** (td / 0.9))
        ph = 2 * np.pi * np.cumsum(f) / SR
        fall += sum(np.sin(k * ph) / k for k in range(1, 9))
    fall = lp(fall, 1800) * env(len(td), 0.01, 0.4) * 0.35
    flat = np.sin(2 * np.pi * 880 * t_(0.8)) * np.minimum(1, t_(0.8) / 0.02) * np.linspace(1, 0, int(SR * 0.8)) ** 1.5 * 0.12
    x = np.zeros(int(SR * 1.8)); x[:len(boom)] += boom; x[:len(crash)] += crash
    x[int(SR * .05):int(SR * .05) + len(fall)] += fall; x[int(SR * .85):int(SR * .85) + len(flat)] += flat
    save('fail.wav', reverb(x, 2.6, 0.7, 0.35, 4500))

    tick = (np.sin(2 * np.pi * 2300 * t_(0.04)) + 0.5 * np.sin(2 * np.pi * 3450 * t_(0.04))) * env(int(SR * 0.04), 0.0005, 0.012)
    save('ui.wav', reverb(tick, 0.5, 0.12, 0.2), peak=0.5)

    rise_t = t_(0.55)
    riser = bp(rng.standard_normal(len(rise_t)), 300, 6000) * (rise_t / 0.55) ** 2 * 0.4
    riser = add(riser, sweep(200, 900, 0.55, 0.6) * (rise_t / 0.55) ** 3 * 0.15)
    x = np.zeros(int(SR * 1.2)); x[:len(riser)] += riser
    hb = lub_dub(0.18); x[int(SR * .55):int(SR * .55) + len(hb)] += hb
    save('start.wav', reverb(x, 1.2, 0.3, 0.22))

    arp = [523.25, 659.25, 783.99, 1046.5, 1318.5]
    x = np.zeros((int(SR * 2.4), 2))
    for i, f in enumerate(arp):
        b = stereo(bell(f, 1.6, 2.2) * 0.6, pan=-0.6 + i * 0.3); s = int(SR * i * 0.075)
        x[s:s + len(b)] += b
    shimmer = hp(rng.standard_normal(int(SR * 1.2)), 6000) * env(int(SR * 1.2), 0.2, 0.4) * 0.08
    x[int(SR * .3):int(SR * .3) + len(shimmer)] += stereo(shimmer)
    save('record.wav', reverb(x, 2.4, 0.7, 0.35, 8000))

# ---------- arka plan müziği (kusursuz döngü) ----------
def build_music():
    bpm = 72; beat = 60 / bpm; bars = 8; L = int(SR * beat * 4 * bars)
    dry = np.zeros(L)
    def place(sig, start):
        idx = (np.arange(len(sig)) + int(start)) % L
        np.add.at(dry, idx, sig)
    chords = [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [261.63, 329.63, 392.0], [196.0, 246.94, 293.66]]
    roots = [55.0, 43.65, 65.41, 49.0]
    seg = beat * 8
    for ci, chord in enumerate(chords):
        n = int(SR * (seg + 2.5)); t = np.arange(n) / SR
        e = np.minimum(1, t / 1.6) * np.where(t < seg, 1, np.exp(-(t - seg) / 0.8))
        pad = np.zeros(n)
        for f in chord:
            for det in (-0.006, 0, 0.006):
                ph = 2 * np.pi * f * (1 + det) * t + rng.uniform(0, 6.28)
                pad += sum(np.sin(k * ph) / k for k in range(1, 10))
        pad = lp(pad, 1100) * e * 0.05
        sub = np.sin(2 * np.pi * roots[ci] * t) * e * 0.35
        place(add(pad, sub), ci * seg * SR)
        # yumuşak arpej (sekizlik notalar)
        for k in range(16):
            f = chord[k % 3] * (2 if (k // 3) % 2 else 4) / 2 * 2
            pl = bell(f, 0.9, 1.4, 2.0) * 0.06 * (0.6 + 0.4 * ((k % 4) == 0))
            place(pl, (ci * seg + k * beat / 2) * SR)
    for b in range(bars * 4):
        if b % 2 == 0: place(lub_dub(0.21, 0.9) * 0.55, b * beat * SR)
    # dairesel konvolüsyonla yankı: kuyruk döngünün başına sarılır, dikiş duyulmaz
    ir = impulse(4.0, 1.4, 5000); out = np.zeros((L, 2))
    for c in range(2):
        irc = np.zeros(L); irc[:len(ir)] = ir[:, c]
        out[:, c] = 0.6 * dry + 0.55 * np.fft.irfft(np.fft.rfft(dry) * np.fft.rfft(irc), L)
    out = out / np.abs(out).max() * 0.8
    # AAC kodlayıcısı uçlara birkaç ms dolgu ekler; döngü noktası kalp atışına denk
    # geldiği için kısa bir yumuşatma tıklamayı tamamen maskeler.
    fi, fo = int(SR * 0.004), int(SR * 0.04)
    out[:fi] *= np.linspace(0, 1, fi)[:, None]; out[-fo:] *= np.linspace(1, 0, fo)[:, None]
    tmp = os.path.join(OUT, '_music.wav')
    wavfile.write(tmp, SR, (out * 32767).astype(np.int16))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'aac', '-b:a', '128k',
                    os.path.join(OUT, 'music.m4a')], check=True)
    os.remove(tmp)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.wav'): os.remove(os.path.join(OUT, f))
    build_sfx(); build_music()
    print(sorted(os.listdir(OUT)))
