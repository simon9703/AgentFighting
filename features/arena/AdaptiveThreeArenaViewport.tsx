'use client';

import { useEffect, useState } from 'react';
import type { ArenaViewModel } from '@/features/renderers/types';
import ThreeArenaViewport from './ThreeArenaViewport';

type Props = {
  view: ArenaViewModel;
  selectedFighterId?: string;
};

function chooseQuality(): 'low' | 'high' {
  if (typeof window === 'undefined') return 'high';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = window.innerWidth < 760;
  const lowConcurrency = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
  const lowMemory = 'deviceMemory' in navigator && typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === 'number'
    && ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
  return reducedMotion || narrow || lowConcurrency || lowMemory ? 'low' : 'high';
}

/** Automatically chooses a conservative WebGL profile on constrained/reduced-motion clients. */
export default function AdaptiveThreeArenaViewport({ view, selectedFighterId }: Props) {
  const [quality, setQuality] = useState<'low' | 'high'>('high');

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setQuality(chooseQuality());
    update();
    window.addEventListener('resize', update);
    media.addEventListener?.('change', update);
    return () => {
      window.removeEventListener('resize', update);
      media.removeEventListener?.('change', update);
    };
  }, []);

  return <ThreeArenaViewport view={view} selectedFighterId={selectedFighterId} quality={quality} />;
}
