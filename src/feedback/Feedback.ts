import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

import type { Settings } from '../game/progression';

/** Sesler tools/synth_sounds.py ile sentezlendi; yeniden üretmek için onu çalıştır. */
const SOURCES = {
  hit: require('../../assets/sounds/hit.wav'),
  perfect1: require('../../assets/sounds/perfect_1.wav'),
  perfect2: require('../../assets/sounds/perfect_2.wav'),
  perfect3: require('../../assets/sounds/perfect_3.wav'),
  perfect4: require('../../assets/sounds/perfect_4.wav'),
  perfect5: require('../../assets/sounds/perfect_5.wav'),
  graze: require('../../assets/sounds/graze.wav'),
  fail: require('../../assets/sounds/fail.wav'),
  start: require('../../assets/sounds/start.wav'),
  record: require('../../assets/sounds/record.wav'),
  ui: require('../../assets/sounds/ui.wav'),
} as const;

const MUSIC = require('../../assets/sounds/music.m4a');

type SoundName = keyof typeof SOURCES;
const PERFECT_STEPS: SoundName[] = ['perfect1', 'perfect2', 'perfect3', 'perfect4', 'perfect5'];

/**
 * Sık çalan sesler için birden fazla oynatıcı tutulur; böylece hızlı art arda
 * isabetlerde bir önceki sesin kuyruğu kesilmez, üst üste biner.
 */
const POOL: Partial<Record<SoundName, number>> = { hit: 3, perfect1: 2, perfect2: 2, perfect3: 2, perfect4: 2, perfect5: 2 };
const VOLUME: Partial<Record<SoundName, number>> = { ui: 0.5, hit: 0.9, fail: 0.85, start: 0.7 };
const MUSIC_VOLUME = { menu: 0.45, play: 0.28 };

const quiet = (p: Promise<unknown>) => p.catch(() => {});

/**
 * Ses, müzik ve titreşimi tek yerden yönetir. Oyun kodu yalnızca olayları
 * bildirir; ayarlara uymak bu sınıfın işidir.
 */
export class Feedback {
  private players = new Map<SoundName, AudioPlayer[]>();
  private cursor = new Map<SoundName, number>();
  private music: AudioPlayer | null = null;
  private musicLevel: number = MUSIC_VOLUME.menu;
  private settings: Settings = { sound: true, music: true, haptics: true, screenShake: true, motion: true };

  async init() {
    // Telefon sessizdeyken çalmaz, kullanıcının kendi müziğini de durdurmaz.
    await quiet(setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }));
    (Object.keys(SOURCES) as SoundName[]).forEach((name) => {
      const list: AudioPlayer[] = [];
      for (let i = 0; i < (POOL[name] ?? 1); i++) {
        try {
          const p = createAudioPlayer(SOURCES[name]);
          p.volume = VOLUME[name] ?? 1;
          list.push(p);
        } catch {
          // Ses yüklenemezse oyun sessiz devam eder.
        }
      }
      this.players.set(name, list);
    });
    try {
      this.music = createAudioPlayer(MUSIC);
      this.music.loop = true;
      this.music.volume = this.musicLevel;
    } catch {
      this.music = null;
    }
    this.applyMusic();
  }

  setSettings(settings: Settings) {
    this.settings = settings;
    this.applyMusic();
  }

  /** Oyun sırasında müzik geri çekilir, efektler öne çıkar. */
  setMusicMode(mode: keyof typeof MUSIC_VOLUME) {
    this.musicLevel = MUSIC_VOLUME[mode];
    if (this.music) this.music.volume = this.musicLevel;
  }

  /** Uygulama arka plana geçince müzik durur. */
  setActive(active: boolean) {
    if (!this.music) return;
    if (active) this.applyMusic();
    else this.music.pause();
  }

  dispose() {
    this.players.forEach((list) => list.forEach((p) => p.remove()));
    this.players.clear();
    this.music?.remove();
    this.music = null;
  }

  private applyMusic() {
    if (!this.music) return;
    if (this.settings.music) {
      this.music.volume = this.musicLevel;
      if (!this.music.playing) this.music.play();
    } else {
      this.music.pause();
    }
  }

  private play(name: SoundName) {
    if (!this.settings.sound) return;
    const list = this.players.get(name);
    if (!list || list.length === 0) return;
    const i = ((this.cursor.get(name) ?? -1) + 1) % list.length;
    this.cursor.set(name, i);
    const player = list[i];
    quiet(player.seekTo(0));
    player.play();
  }

  private haptic(run: () => Promise<void>) {
    if (this.settings.haptics) quiet(run());
  }

  start() {
    this.play('start');
    this.haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
  }

  hit(perfect: boolean, combo: number) {
    if (perfect) {
      this.play(PERFECT_STEPS[Math.min(combo, PERFECT_STEPS.length) - 1]);
      this.haptic(() =>
        Haptics.impactAsync(combo >= 4 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium),
      );
    } else {
      this.play('hit');
      this.haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    }
  }

  graze() {
    this.play('graze');
    this.haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  }

  fail() {
    this.play('fail');
    this.haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  }

  record() {
    this.play('record');
    this.haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  }

  tap() {
    this.play('ui');
    this.haptic(() => Haptics.selectionAsync());
  }
}
