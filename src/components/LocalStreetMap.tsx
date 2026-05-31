import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useTravelStore } from '../store/useTravelStore';
import { ZoomOut, Navigation } from 'lucide-react';
import type { PlaceLog } from '../types';

interface LocalStreetMapProps {
  latitude: number;
  longitude: number;
  onExit: () => void;
  onSelectPlace?: (place: PlaceLog) => void;
}

export const LocalStreetMap: React.FC<LocalStreetMapProps> = ({
  latitude,
  longitude,
  onExit,
  onSelectPlace,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  const {
    placeLogs,
    wishlist,
    friendsGlobesEnabled,
    friendsPlaceLogs,
  } = useTravelStore();

  const activeLogs = placeLogs.filter(l => !l.deletedAt);
  const activeWishlist = wishlist.filter(w => !w.deletedAt);
  const activeFriends = friendsGlobesEnabled ? friendsPlaceLogs : [];

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    mapInstance.current = map;

    // Add ultra-premium dark vector tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      minZoom: 3,
    }).addTo(map);

    // Add custom zoom controls in a nice spot
    L.control.zoom({
      position: 'bottomright',
    }).addTo(map);

    // Watch zoom changes to trigger auto-exit back to 3D Globe when zooming out too far
    map.on('zoomend', () => {
      const currentZoom = map.getZoom();
      if (currentZoom < 4) {
        onExit();
      }
    });

    // Clean up
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [latitude, longitude, onExit]);

  // Update Markers when logs or map instance changes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Helper to create custom glowing div icons
    const createHtmlIcon = (color: string, shadowColor: string, type: 'visited' | 'wishlist' | 'friend') => {
      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <span class="absolute w-6 h-6 rounded-full opacity-60 animate-ping" style="background-color: ${color}; animation-duration: 2s;"></span>
            <span class="absolute w-4 h-4 rounded-full border border-white/40 shadow-lg flex items-center justify-center" style="background-color: ${color}; box-shadow: 0 0 12px ${shadowColor};">
              ${type === 'wishlist' ? '<span class="text-[9px] text-slate-950 font-bold leading-none">★</span>' : ''}
              ${type === 'friend' ? '<span class="text-[8px] text-white font-bold leading-none">👥</span>' : ''}
            </span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -10],
      });
    };

    // 1. Visited spots
    activeLogs.forEach((log) => {
      const marker = L.marker([log.latitude, log.longitude], {
        icon: createHtmlIcon('#10b981', 'rgba(16,185,129,0.8)', 'visited'),
      }).addTo(map);

      const dateStr = log.visitedAt
        ? new Date(log.visitedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
        : '';
      const stars = log.rating ? '★'.repeat(log.rating) + '☆'.repeat(5 - log.rating) : '';

      marker.bindPopup(`
        <div class="text-xs">
          <div class="font-bold text-slate-100 flex items-center gap-1.5 text-sm">
            <span>📍</span> ${log.placeName}
          </div>
          ${stars ? `<div class="text-amber-400 font-bold tracking-wider mt-0.5">${stars}</div>` : ''}
          ${dateStr ? `<div class="text-slate-400 mt-1">${dateStr}</div>` : ''}
          ${log.notes ? `<div class="text-slate-400 italic mt-1.5 border-t border-white/5 pt-1.5 max-w-[200px]">"${log.notes}"</div>` : ''}
          <div class="mt-2 flex gap-1">
            <button id="btn-edit-${log.id}" class="px-2.5 py-1 rounded bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-bold text-[9px] cursor-pointer hover:bg-indigo-600/50 transition-all">
              Edit Details
            </button>
          </div>
        </div>
      `);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-edit-${log.id}`);
        if (btn && onSelectPlace) {
          btn.onclick = () => {
            onSelectPlace(log);
          };
        }
      });
    });

    // 2. Wishlist spots
    activeWishlist.forEach((item) => {
      const marker = L.marker([item.latitude, item.longitude], {
        icon: createHtmlIcon('#f59e0b', 'rgba(245,158,11,0.8)', 'wishlist'),
      }).addTo(map);

      marker.bindPopup(`
        <div class="text-xs">
          <div class="font-bold text-slate-100 flex items-center gap-1.5 text-sm">
            <span>★</span> ${item.placeName}
          </div>
          <div class="text-amber-400 font-semibold mt-1">Wishlisted spot</div>
        </div>
      `);
    });

    // 3. Friends spots
    activeFriends.forEach((log) => {
      const marker = L.marker([log.latitude, log.longitude], {
        icon: createHtmlIcon('#8b5cf6', 'rgba(139,92,246,0.8)', 'friend'),
      }).addTo(map);

      marker.bindPopup(`
        <div class="text-xs">
          <div class="font-bold text-slate-100 flex items-center gap-1.5 text-sm">
            <span>👥</span> ${log.placeName}
          </div>
          <div class="text-purple-400 font-semibold mt-1">Friend's Log</div>
          ${log.notes ? `<div class="text-slate-400 italic mt-1.5 border-t border-white/5 pt-1.5 max-w-[200px]">"${log.notes}"</div>` : ''}
        </div>
      `);
    });

  }, [activeLogs, activeWishlist, activeFriends, onSelectPlace]);

  return (
    <div className="relative w-full h-full animate-page-enter">
      {/* Leaflet Map Target */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Glass Controls */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
        <div className="glass-panel border border-white/10 p-4 rounded-2xl max-w-xs shadow-2xl backdrop-blur-lg flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h4 className="text-slate-200 font-bold text-xs tracking-wider uppercase">Local Street View</h4>
          </div>
          <p className="text-slate-400 text-[10px] leading-relaxed">
            You have zoomed in extremely close. Pinpointed cities, roads, and coordinates are now fully visible.
          </p>
          <div className="flex items-center gap-4 mt-1 border-t border-white/5 pt-2 text-[9px] text-slate-400 font-mono">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Visited</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Wishlist</span>
            </div>
            {friendsGlobesEnabled && (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Friends</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Back to Globe Button */}
      <div className="absolute bottom-6 left-6 z-10 flex gap-2">
        <button
          onClick={onExit}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl glass-panel border border-white/10 hover:border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-400 font-bold text-xs shadow-2xl backdrop-blur-lg transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
        >
          <ZoomOut className="w-4 h-4" />
          <span>Exit Local Map</span>
        </button>
      </div>
    </div>
  );
};
