import { MemoryConsole } from './MemoryConsole';
import type { Trip } from '../types';

interface TripMemoryModalProps {
  trip: Trip;
  onClose: () => void;
}

/**
 * Thin wrapper that opens MemoryConsole in trip mode.
 * Renders the full MemoryConsole with trip context instead of a place.
 */
export const TripMemoryModal: React.FC<TripMemoryModalProps> = ({ trip, onClose }) => {
  return <MemoryConsole trip={trip} onClose={onClose} />;
};
