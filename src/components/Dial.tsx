import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Oval,
  Path,
  RadialGradient,
  RoundedRect,
  Skia,
  rect,
  vec,
  type SkPath,
} from '@shopify/react-native-skia';
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  SensorType,
  interpolateColor,
  useAnimatedSensor,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';

import type { Theme } from '../game/themes';
import type { GameVisuals } from '../hooks/useNabizGame';
import { alpha, darken, lighten } from '../ui/color';
import { fonts } from '../ui/typography';
import { ExtrudedText } from './ExtrudedText';

interface Props {
  size: number;
  theme: Theme;
  target: number;
  width: number;
  showTarget: boolean;
  score: number;
  visuals: GameVisuals;
  /** Telefon eğimine göre 3B hareket. */
  motion: boolean;
}

/** Sahnenin geriye yatık durduğu açı; halkaya derinlik veren asıl şey bu. */
const BASE_TILT = 24;

function arc(cx: number, cy: number, r: number, from: number, to: number): SkPath {
  const p = Skia.Path.Make();
  p.addArc(rect(cx - r, cy - r, r * 2, r * 2), (from * 180) / Math.PI, ((to - from) * 180) / Math.PI);
  return p;
}

/** Parçacıkların sabit, rastgele görünen ama her açılışta aynı özellikleri. */
const PARTICLES = Array.from({ length: 18 }, (_, i) => {
  const h = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return { spread: (h(1) - 0.5) * 2.2, dist: 2.2 + h(2) * 3.6, size: 0.5 + h(3) * 0.8, inward: i % 4 === 0, fall: h(4) };
});

type ParticleSpec = (typeof PARTICLES)[number];

interface ParticleProps {
  spec: ParticleSpec;
  c: number;
  radius: number;
  unit: number;
  visuals: GameVisuals;
  colors: [string, string];
}

function Particle({ spec, c, radius, unit, visuals, colors }: ParticleProps) {
  const { burst, burstAngle, burstPerfect } = visuals;
  const direction = spec.inward ? -0.6 : 1;
  const cx = useDerivedValue(() => {
    const a = burstAngle.value;
    const reach = spec.dist * unit * (0.7 + burstPerfect.value * 0.6) * burst.value;
    return c + radius * Math.cos(a) + Math.cos(a + spec.spread) * reach * direction;
  });
  const cy = useDerivedValue(() => {
    const a = burstAngle.value;
    const reach = spec.dist * unit * (0.7 + burstPerfect.value * 0.6) * burst.value;
    const gravity = burst.value * burst.value * unit * (1 + spec.fall * 2);
    return c + radius * Math.sin(a) + Math.sin(a + spec.spread) * reach * direction + gravity;
  });
  const r = useDerivedValue(() =>
    burst.value >= 1 ? 0 : spec.size * unit * 0.42 * Math.pow(1 - burst.value, 0.7) * (0.8 + burstPerfect.value * 0.5),
  );
  const color = useDerivedValue(() => interpolateColor(burstPerfect.value, [0, 1], colors));
  return (
    <Circle cx={cx} cy={cy} r={r} color={color}>
      <BlurMask blur={unit * 0.18} style="solid" />
    </Circle>
  );
}

export const Dial = memo(function Dial({ size, theme, target, width, showTarget, score, visuals, motion }: Props) {
  const pad = size * 0.16;
  const canvas = size + pad * 2;
  const c = canvas / 2;
  const radius = size * 0.37;
  const w = Math.max(16, size * 0.075);
  const orb = radius - w * 1.15;
  const needleLen = w * 2.2;
  const needleTh = Math.max(6, size * 0.022);

  const paths = useMemo(() => {
    const from = target - width / 2;
    const to = target + width / 2;
    return {
      arc: arc(c, c, radius, from, to),
      arcShine: arc(c, c, radius - w * 0.2, from + 0.02, to - 0.02),
    };
  }, [target, width, c, radius, w]);

  // İz: iğnenin arkasında sönen ışık şeritleri (iki yön için önceden çizilir).
  const trails = useMemo(() => {
    const seg = 0.085;
    const make = (sign: number) =>
      Array.from({ length: 6 }, (_, k) => ({
        path: arc(c, c, radius, sign > 0 ? -(k + 1) * seg : k * seg, sign > 0 ? -k * seg : (k + 1) * seg),
        opacity: (1 - k / 6) ** 1.5 * 0.85,
      }));
    return { cw: make(1), ccw: make(-1) };
  }, [c, radius]);

  const { needle, dir, flash, beat, fever, scorePulse } = visuals;

  const needleTransform = useDerivedValue(() => [{ rotate: needle.value }]);
  const cwOpacity = useDerivedValue(() => (dir.value > 0 ? 1 : 0));
  const ccwOpacity = useDerivedValue(() => (dir.value > 0 ? 0 : 1));
  const waveR = useDerivedValue(() => radius + beat.value * w * 2.6);
  const waveOpacity = useDerivedValue(() => (1 - beat.value) * 0.75);
  const waveStroke = useDerivedValue(() => w * (0.15 + (1 - beat.value) * 0.5));
  const orbTransform = useDerivedValue(() => [{ scale: 1 + (1 - beat.value) * 0.05 }]);
  const arcGlow = useDerivedValue(() => 0.55 + flash.value * 0.45);
  const feverOpacity = useDerivedValue(() => fever.value * 0.6);

  // Telefonun sağa-sola eğimine göre sahne hafifçe döner (paralaks).
  const reduceMotion = useReducedMotion();
  const gravity = useAnimatedSensor(SensorType.GRAVITY, { interval: 'auto' });
  const roll = useSharedValue(0);
  const tiltEnabled = useSharedValue(motion && !reduceMotion);
  useEffect(() => {
    tiltEnabled.value = motion && !reduceMotion;
  }, [motion, reduceMotion, tiltEnabled]);
  useFrameCallback(() => {
    const { x, y, z } = gravity.sensor.value;
    const m = Math.hypot(x, y, z) || 1;
    const goal = tiltEnabled.value ? Math.max(-9, Math.min(9, (-x / m) * 22)) : 0;
    roll.value += (goal - roll.value) * 0.12;
  });
  const tiltStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateX: `${BASE_TILT}deg` }, { rotateY: `${roll.value}deg` }],
  }));
  const scoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scorePulse.value }, { translateX: roll.value * 0.6 }],
  }));

  const particleColors: [string, string] = [lighten(theme.target, 0.2), lighten(theme.perfect, 0.15)];

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Animated.View style={[styles.tilt, { left: -pad, top: -pad, width: canvas, height: canvas }, tiltStyle]}>
        <Canvas style={{ width: canvas, height: canvas }}>
          {/* Yere düşen gölge: halka havada süzülüyormuş gibi */}
          <Circle cx={c} cy={c + w * 1.1} r={radius} style="stroke" strokeWidth={w * 1.3} color="rgba(0,0,0,0.5)">
            <BlurMask blur={w * 0.8} style="normal" />
          </Circle>

          {/* Kalp atışı dalgası */}
          <Circle cx={c} cy={c} r={waveR} style="stroke" strokeWidth={waveStroke} color={theme.target} opacity={waveOpacity}>
            <BlurMask blur={w * 0.25} style="solid" />
          </Circle>

          {/* Ateş modu: halkanın etrafında altın hale */}
          <Circle cx={c} cy={c} r={radius} style="stroke" strokeWidth={w * 1.8} color={theme.perfect} opacity={feverOpacity}>
            <BlurMask blur={w * 1.1} style="normal" />
          </Circle>

          {/* Halka gövdesi: üstten ışık alan metal boru */}
          <Circle cx={c} cy={c} r={radius} style="stroke" strokeWidth={w}>
            <LinearGradient
              start={vec(c, c - radius - w)}
              end={vec(c, c + radius + w)}
              colors={[theme.ringLight, theme.track, theme.ringDark]}
            />
          </Circle>
          <Circle cx={c} cy={c} r={radius - w * 0.3} style="stroke" strokeWidth={w * 0.14}>
            <LinearGradient
              start={vec(c, c - radius)}
              end={vec(c, c + radius)}
              colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.0)']}
            />
          </Circle>
          <Circle cx={c} cy={c} r={radius + w * 0.44} style="stroke" strokeWidth={w * 0.1} color="rgba(0,0,0,0.35)" />

          {/* Hedef yay: parıltı + gövde + yansıma + isabet parlaması */}
          {showTarget && (
            <Group>
              <Path path={paths.arc} style="stroke" strokeWidth={w * 1.7} strokeCap="round" color={theme.target} opacity={arcGlow}>
                <BlurMask blur={w * 0.8} style="normal" />
              </Path>
              <Path path={paths.arc} style="stroke" strokeWidth={w * 0.92} strokeCap="round">
                <LinearGradient
                  start={vec(c, c - radius - w)}
                  end={vec(c, c + radius + w)}
                  colors={[lighten(theme.target, 0.3), theme.target, darken(theme.target, 0.25)]}
                />
              </Path>
              <Path path={paths.arcShine} style="stroke" strokeWidth={w * 0.16} strokeCap="round" color="rgba(255,255,255,0.6)" />
              <Path path={paths.arc} style="stroke" strokeWidth={w * 1.05} strokeCap="round" color={theme.perfect} opacity={flash}>
                <BlurMask blur={w * 0.3} style="solid" />
              </Path>
            </Group>
          )}

          {/* İğne: ışık izi, parıltı, silindirik gövde ve uçtaki mücevher */}
          <Group transform={needleTransform} origin={vec(c, c)}>
            {showTarget && (
              <>
                {(['cw', 'ccw'] as const).map((key) => (
                  <Group key={key} opacity={key === 'cw' ? cwOpacity : ccwOpacity} blendMode="plus">
                    {trails[key].map((t, i) => (
                      <Path key={i} path={t.path} style="stroke" strokeWidth={w * 0.8} strokeCap="round" color={theme.perfect} opacity={t.opacity}>
                        <BlurMask blur={w * 0.35} style="normal" />
                      </Path>
                    ))}
                  </Group>
                ))}
              </>
            )}
            <RoundedRect
              x={c + orb}
              y={c - 1}
              width={radius - orb - needleLen / 2}
              height={2}
              r={1}
              color={alpha(theme.needle, 0.22)}
            />
            <RoundedRect
              x={c + radius - needleLen / 2}
              y={c - needleTh}
              width={needleLen}
              height={needleTh * 2}
              r={needleTh}
              color={theme.needle}
              opacity={0.7}
            >
              <BlurMask blur={needleTh * 1.6} style="normal" />
            </RoundedRect>
            <RoundedRect x={c + radius - needleLen / 2} y={c - needleTh / 2} width={needleLen} height={needleTh} r={needleTh / 2}>
              <LinearGradient
                start={vec(0, c - needleTh / 2)}
                end={vec(0, c + needleTh / 2)}
                colors={['#FFFFFF', theme.needle, darken(theme.needle, 0.35)]}
              />
            </RoundedRect>
            <Circle cx={c + radius + needleLen / 2} cy={c} r={needleTh * 0.95}>
              <RadialGradient
                c={vec(c + radius + needleLen / 2 - needleTh * 0.3, c - needleTh * 0.3)}
                r={needleTh * 1.2}
                colors={['#FFFFFF', theme.target, darken(theme.target, 0.4)]}
              />
            </Circle>
          </Group>

          {/* Merkezdeki cam küre */}
          <Group transform={orbTransform} origin={vec(c, c)}>
            <Circle cx={c} cy={c + orb * 0.12} r={orb} color="rgba(0,0,0,0.35)">
              <BlurMask blur={orb * 0.12} style="normal" />
            </Circle>
            <Circle cx={c} cy={c} r={orb}>
              <RadialGradient
                c={vec(c - orb * 0.32, c - orb * 0.4)}
                r={orb * 1.45}
                colors={[lighten(theme.surface, 0.28), theme.backgroundGlow, theme.background]}
              />
            </Circle>
            <Circle cx={c} cy={c} r={orb} style="stroke" strokeWidth={1.5} color={alpha(theme.ringLight, 0.7)} />
            <Oval x={c - orb * 0.62} y={c - orb * 0.82} width={orb * 0.8} height={orb * 0.38} color="rgba(255,255,255,0.16)">
              <BlurMask blur={orb * 0.06} style="normal" />
            </Oval>
          </Group>

          {/* Parçacık patlaması: ışıklar toplanarak parlar */}
          <Group blendMode="plus">
            {PARTICLES.map((spec, i) => (
              <Particle key={i} spec={spec} c={c} radius={radius} unit={w} visuals={visuals} colors={particleColors} />
            ))}
          </Group>
        </Canvas>
      </Animated.View>

      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Animated.View style={scoreStyle}>
          <ExtrudedText
            color={theme.text}
            sideColor={theme.ringDark}
            glowColor={theme.target}
            depth={Math.max(4, Math.round(size * 0.018))}
            style={[styles.score, { fontSize: size * 0.22 }]}
          >
            {score}
          </ExtrudedText>
        </Animated.View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  tilt: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
  score: { fontFamily: fonts.heavy, fontVariant: ['tabular-nums'], letterSpacing: -2, textAlign: 'center' },
});
