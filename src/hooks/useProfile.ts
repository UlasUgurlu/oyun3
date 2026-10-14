import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_PROFILE, sanitizeProfile, type Profile } from '../game/progression';

const STORAGE_KEY = 'nabiz/profile/v1';

/**
 * Oyuncu profilini yükler ve her değişiklikte kaydeder.
 * `profileRef` oyun döngüsü gibi kapanış (closure) içinden güncel değeri okumak içindir.
 */
export function useProfile() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [ready, setReady] = useState(false);
  const profileRef = useRef(profile);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const loaded = sanitizeProfile(JSON.parse(raw));
        profileRef.current = loaded;
        setProfile(loaded);
      })
      .catch(() => {
        // Bozuk kayıt oyunu durdurmamalı; varsayılan profille devam edilir.
      })
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback((next: Profile) => {
    profileRef.current = next;
    setProfile(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const update = useCallback(
    (fn: (prev: Profile) => Profile) => save(fn(profileRef.current)),
    [save],
  );

  const reset = useCallback(() => save({ ...DEFAULT_PROFILE, settings: profileRef.current.settings }), [save]);

  return { profile, profileRef, ready, save, update, reset };
}
