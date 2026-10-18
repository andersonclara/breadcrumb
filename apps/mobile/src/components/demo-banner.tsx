import { useExplore } from '@/providers/explore-provider';
import { GameButton } from './game-ui';

export function DemoBanner() {
  const e = useExplore();
  if (!e.demo) return null;
  return <GameButton variant="secondary" onPress={e.endDemo}>End demo</GameButton>;
}
