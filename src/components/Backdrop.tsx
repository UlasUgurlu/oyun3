import { BlurMask, Canvas, Circle, Group, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { memo, useEffect } from 'react';
import {
  SensorType,
  useAnimatedSensor,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import type { Theme } from '../game/themes';
import type { GameVisuals } from '../hooks/useNabizGame';
import { alpha } from '../ui/color';

interface Props {
  width: number;
  height: number;
  theme: Theme;
  visuals: GameVisuals;
  motion: boolean;
}

/** Arka plandaki ışık küreleri: farklı derinliklerde, farklı hızlarda süzülür. */
const ORBS = [
  { x: 0.12, y: 0.18, r: 0.22, depth: 0.3, speed: 0.11, phase: 0.0, warm: true },
  { x: 0.88, y: 0.12, r: 0.16, depth: 0.6, speed: 0.17, phase: 1.3, warm: false },
  { x: 0.78, y: 0.62, r: 0.26, depth: 0.25, speed: 0.08, phase: 2.1, warm: true },
  { x: 0.15, y: 0.78, r: 0.18, depth: 0.5, speed: 0.13, phase: 3.7, warm: false },
  { x: 0.5, y: 0.95, r: 0.3, depth: 0.15, speed: 0.06, phase: 5.0, warm: true },
  { x: 0.4, y: 0.05, r: 0.1, depth: 0.9, speed: 0.21, phase: 4.2, warm: false },
  { x: 0.95, y: 0.88, r: 0.09, depth: 1.0, speed: 0.25, phase: 0.7, warm: true },
];

type OrbSpec = (typeof ORBS)[number];

function Orb({ spec, width, height, time, roll, color }: {
  spec: OrbSpec;
  width: number;
  height: number;
  time: SharedValue<number>;
  roll: SharedValue<number>;
  color: string;
}) {
  const unit = Math.max(width, height);
  const cx = useDerivedValue(
    () => spec.x * width + Math.sin(time.value * spec.speed + spec.phase) * unit * 0.05 + roll.value * spec.depth * 6,
  );
  const cy = useDerivedValue(() => spec.y * height + Math.cos(time.value * spec.speed * 0.8 + spec.phase) * unit * 0.04);
  return (
    <Circle cx={cx} cy={cy} r={spec.r * unit * 0.5} color={color}>
      <BlurMask blur={spec.r * unit * 0.22} style="normal" />
    </Circle>
  );
}

export const Backdrop = memo(function Backdrop({ width, height, theme, visuals, motion }: Props) {
  const reduceMotion = useReducedMotion();
  const time = useSharedValue(0);
  const roll = useSharedValue(0);
  const enabled = useSharedValue(motion && !reduceMotion);
  const gravity = useAnimatedSensor(SensorType.GRAVITY, { interval: 'auto' });

  useEffect(() => {
    enabled.value = motion && !reduceMotion;
  }, [motion, reduceMotion, enabled]);

  useFrameCallback((frame) => {
    if (!enabled.value) return;
    time.value += (frame.timeSincePreviousFrame ?? 16) / 1000;
    const { x, y, z } = gravity.sensor.value;
    const m = Math.hypot(x, y, z) || 1;
    roll.value += ((-x / m) * 10 - roll.value) * 0.08;
  });

  const { fever, shock, beat } = visuals;
  const feverOpacity = useDerivedValue(() => fever.value * 0.55);
  const shockOpacity = useDerivedValue(() => shock.value * 0.7);
  const glowOpacity = useDerivedValue(() => 0.85 + (1 - beat.value) * 0.15);

  const center = vec(width / 2, height * 0.45);
  const reach = Math.max(width, height) * 0.8;

  return (
    <Canvas style={{ position: 'absolute', left: 0, top: 0, width, height }} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height} color={theme.background} />
      <Rect x={0} y={0} width={width} height={height} opacity={glowOpacity}>
        <RadialGradient c={center} r={reach} colors={[theme.backgroundGlow, theme.background]} />
      </Rect>

      <Group blendMode="screen" opacity={theme.statusBar === 'light' ? 0.5 : 0.35}>
        {ORBS.map((spec, i) => (
          <Orb
            key={i}
            spec={spec}
            width={width}
            height={height}
            time={time}
            roll={roll}
            color={alpha(spec.warm ? theme.target : theme.ringLight, 0.35)}
          />
        ))}
      </Group>

      <Rect x={0} y={0} width={width} height={height} opacity={feverOpacity}>
        <RadialGradient c={center} r={reach * 0.7} colors={[alpha(theme.perfect, 0.45), alpha(theme.perfect, 0)]} />
      </Rect>

      {/* Kenarları karartan vinyet sahneye derinlik verir */}
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient c={center} r={reach} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']} positions={[0, 0.55, 1]} />
      </Rect>

      <Rect x={0} y={0} width={width} height={height} opacity={shockOpacity}>
        <RadialGradient c={center} r={reach} colors={[alpha('#FF2A3D', 0.15), alpha('#FF2A3D', 0.65)]} />
      </Rect>
    </Canvas>
  );
});
