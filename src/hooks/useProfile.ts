import { useCallback, useEffect, useState } from 'react';
import {
  createEmptyProfileData,
  fetchProfile,
  type ProfileData,
} from '@/services/profileService';

export function useProfile() {
  const [data, setData] = useState<ProfileData>(createEmptyProfileData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setData(await fetchProfile());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, retry: load };
}