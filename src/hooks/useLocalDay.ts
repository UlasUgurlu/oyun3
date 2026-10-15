import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { dayKey } from '../game/rng';

/** Refresh daily rights at local midnight and on foreground, without an idle loop. */
export function useLocalDay() {
  const [day, setDay] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      const now = new Date();
      setDay((previous) => dayKey(previous) === dayKey(now) ? previous : now);
    };
    const schedule = () => {
      clearTimeout(timer);
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(() => { refresh(); schedule(); }, midnight.getTime() - now.getTime() + 500);
    };
    schedule();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') { refresh(); schedule(); }
    });
    return () => { clearTimeout(timer); listener.remove(); };
  }, []);
  return day;
}
