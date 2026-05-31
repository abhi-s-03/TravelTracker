import React, { useEffect, useRef, useState } from 'react';
import Globe from 'globe.gl';
import * as THREE from 'three';
import { useTravelStore } from '../store/useTravelStore';
import type { PlaceLog, Trip } from '../types';
import {
  Compass,
  RotateCw,
  Users,
  Layers,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Award,
  TrendingUp,
  X,
  Star,
  Map
} from 'lucide-react';
import { LocalStreetMap } from './LocalStreetMap';
import confetti from 'canvas-confetti';

interface Globe3DProps {
  onSelectPlace?: (place: PlaceLog) => void;
}

const SUB_NATIONAL_MAPS: Record<string, string> = {
  US: 'us-states',
  IN: 'india',
  CA: 'canada',
  JP: 'japan',
  DE: 'germany',
  BR: 'brazil',
  CN: 'china',
  FR: 'france',
  IT: 'italy',
  ES: 'spain',
  AU: 'australia',
  MX: 'mexico',
  RU: 'russia',
};

// Ray-casting point in polygon algorithm to color states dynamically
const isPointInPolygon = (lat: number, lng: number, geometry: any): boolean => {
  if (!geometry) return false;
  const { type, coordinates } = geometry;
  const testPoint = [lng, lat]; // GeoJSON uses [longitude, latitude]

  const inPoly = (pt: number[], poly: number[][]): boolean => {
    let inside = false;
    const x = pt[0], y = pt[1];
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      const intersect = ((yi > y) !== (yj > y)) &&
                        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  if (type === 'Polygon') {
    return inPoly(testPoint, coordinates[0]);
  } else if (type === 'MultiPolygon') {
    return coordinates.some((poly: any) => inPoly(testPoint, poly[0]));
  }
  return false;
};



// HTML rendering helper to draw custom half-stars in tooltip cards
const renderStarsHtml = (rating: number): string => {
  let html = '<div class="flex items-center gap-0.5 mt-0.5 text-amber-400 font-mono select-none">';
  const full = Math.floor(rating);
  const half = rating % 1 !== 0;

  for (let i = 1; i <= 5; i++) {
    if (i <= full) {
      html += '<span class="text-amber-400 font-bold text-xs select-none">★</span>';
    } else if (i === full + 1 && half) {
      html += `
        <span class="relative inline-block w-3 h-3.5 select-none shrink-0" style="vertical-align: middle;">
          <span class="text-slate-650 absolute top-0 left-0">★</span>
          <span class="absolute top-0 left-0 w-[50%] h-full overflow-hidden block text-amber-400 font-bold">★</span>
        </span>
      `;
    } else {
      html += '<span class="text-slate-650 opacity-40 text-xs select-none">★</span>';
    }
  }
  html += '</div>';
  return html;
};

// Dynamically calculate bounding box for any GeoJSON feature coordinate set
const getFeatureBounds = (feat: any): [number, number, number, number] | null => {
  if (feat.bbox) return feat.bbox;
  if (!feat.geometry || !feat.geometry.coordinates) return null;

  let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;

  const processCoords = (coords: any) => {
    if (Array.isArray(coords) && typeof coords[0] === 'number') {
      const [lng, lat] = coords;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    } else if (Array.isArray(coords)) {
      coords.forEach((c: any) => processCoords(c));
    }
  };

  processCoords(feat.geometry.coordinates);

  if (minLng > maxLng || minLat > maxLat) return null;
  return [minLng, minLat, maxLng, maxLat];
};

export const Globe3D: React.FC<Globe3DProps> = ({ onSelectPlace }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeInstance = useRef<any>(null);
  const cloudMeshRef = useRef<THREE.Mesh | null>(null);

  const {
    placeLogs,
    wishlist,
    setSelectedCountryCode,
    friendsGlobesEnabled,
    friendsPlaceLogs,
    toggleFriendsGlobes,
    trips,
    settings,
  } = useTravelStore();

  const activeLogs = placeLogs.filter(l => !l.deletedAt);
  const wishlistItems = wishlist.filter(w => !w.deletedAt);
  const visitedCountryCodes = Array.from(new Set(activeLogs.map(l => l.countryCode)));
  const wishlistCountryCodes = Array.from(new Set(wishlistItems.map(w => w.countryCode)));
  const friendsCountryCodes = friendsGlobesEnabled
    ? Array.from(new Set(friendsPlaceLogs.map(l => l.countryCode)))
    : [];

  // View States
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [loadingGeoJson, setLoadingGeoJson] = useState(true);
  const [rotationActive, setRotationActive] = useState(true);
  const [hoveredFeature, setHoveredFeature] = useState<any>(null);
  
  // Drill down Sub-national States
  const [activeDrillDownCountry, setActiveDrillDownCountry] = useState<string | null>(null);
  const [drillDownGeoJson, setDrillDownGeoJson] = useState<any>(null);
  
  // High fidelity view swapping
  const [isLocalMapActive, setIsLocalMapActive] = useState(false);
  const [localMapCoords, setLocalMapCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Layer switches: 'satellite' | 'heatmap'
  const [globeLayerMode, setGlobeLayerMode] = useState<'satellite' | 'heatmap'>('satellite');

  // Conquest & Continents HUD
  const [isConquestHUDOpen, setIsConquestHUDOpen] = useState(false);
  const [hoveredContinent, setHoveredContinent] = useState<string | null>(null);

  // Storyteller Autopilot States
  const [activeStoryTrip, setActiveStoryTrip] = useState<Trip | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [isStoryPlaying, setIsStoryPlaying] = useState(false);
  const storyTimerRef = useRef<any | null>(null);

  // Fetch World GeoJSON
  useEffect(() => {
    fetch('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(data => { setGeoJsonData(data); setLoadingGeoJson(false); })
      .catch(() => setLoadingGeoJson(false));
  }, []);

  // Initialize Globe Core & Three JS custom additions
  useEffect(() => {
    if (!containerRef.current) return;

    const g = (Globe as any)()(containerRef.current)
      .globeTileEngineUrl((x: number, y: number, l: number) => {
        // Switch tile provider based on user globe style setting
        if (settings.globeStyle === 'stylized') {
          // CartoDB Dark Matter — premium dark vector tiles
          return `https://a.basemaps.cartocdn.com/dark_all/${l}/${x}/${y}.png`;
        }
        // Default: Google Hybrid (Satellite + Roads)
        return `https://mt1.google.com/vt/lyrs=y&x=${x}&y=${y}&z=${l}`;
      })
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('')
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#4f46e5')
      .atmosphereAltitude(0.18)
      .width(containerRef.current.clientWidth)
      .height(containerRef.current.clientHeight)
      .onPolygonHover((feat: any) => {
        setHoveredFeature(feat);
      });

    globeInstance.current = g;

    const controls = g.controls();
    controls.enableZoom = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controls.maxDistance = 500;
    // Let user zoom right down to the surface (radius is 100) for high-definition 3D street views
    controls.minDistance = 100.15;

    // ── ThreeJS Environment Additions (Clouds + Starfield) ─────────────────
    const scene = g.scene();

    // 1. Moving cloud mesh
    const cloudGeometry = new THREE.SphereGeometry(g.getGlobeRadius() * 1.015, 64, 64);
    const cloudMaterial = new THREE.MeshPhongMaterial({
      map: new THREE.TextureLoader().load('https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_clouds_2048.png'),
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(cloudMesh);
    cloudMeshRef.current = cloudMesh;

    // 2. Galaxy/Starfield Particle System
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 1800;
    const starPositions = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i++) {
      starPositions[i] = (Math.random() - 0.5) * 1200;
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.1,
      transparent: true,
      opacity: 0.75,
      sizeAttenuation: true
    });
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);

    // Frame Tick for Clouds
    let animId: number;
    const animate = () => {
      if (cloudMeshRef.current) {
        cloudMeshRef.current.rotation.y += 0.00015;
        cloudMeshRef.current.rotation.x += 0.00004;
      }
      animId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (containerRef.current && globeInstance.current) {
        globeInstance.current.width(containerRef.current.clientWidth);
        globeInstance.current.height(containerRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    g.pointOfView({ lat: 20, lng: 0, altitude: 2.2 }, 800);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  // Update rotation toggle
  useEffect(() => {
    if (globeInstance.current) {
      globeInstance.current.controls().autoRotate = rotationActive;
    }
  }, [rotationActive]);

  // Load Sub-National State Boundaries on demand
  const loadStateBoundaries = async (countryCode: string) => {
    const slug = SUB_NATIONAL_MAPS[countryCode];
    if (!slug) return;

    try {
      const res = await fetch(`https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/${slug}.geojson`);
      const data = await res.json();
      setDrillDownGeoJson(data);
      setActiveDrillDownCountry(countryCode);
    } catch (e) {
      console.error('Failed to load sub-national boundaries:', e);
    }
  };

  const handleExitDrillDown = () => {
    setActiveDrillDownCountry(null);
    setDrillDownGeoJson(null);
    setSelectedCountryCode(null);
    globeInstance.current?.pointOfView({ altitude: 2.0 }, 1000);
  };

  // Main Globe Rendering Sync Effect (Layers, Polygons, Pillars, Arcs)
  useEffect(() => {
    const g = globeInstance.current;
    if (!g || !geoJsonData) return;

    // Determine polygons data: either global countries, or current drill-down sub-national states
    const isDrillActive = drillDownGeoJson && activeDrillDownCountry;
    const activeFeatures = isDrillActive ? drillDownGeoJson.features : geoJsonData.features;

    // Clear conflicting layers depending on modes
    if (globeLayerMode === 'heatmap') {
      g.polygonsData([]);
      g.pointsData([]);
      g.arcsData([]);
      
      // Calculate coordinates log densities for hexagon binning
      const densityPoints = activeLogs.map(log => ({
        lat: log.latitude,
        lng: log.longitude,
        weight: 1
      }));

      g.hexBinPointsData(densityPoints)
        .hexBinPointWeight('weight')
        .hexBinResolution(4)
        .hexMargin(0.12)
        .hexTopColor(() => '#06b6d4')
        .hexBottomColor(() => 'rgba(6, 182, 212, 0.1)')
        .hexAltitude(({ sumWeight }: any) => Math.min(sumWeight * 0.045, 0.5));
      
      return; // Stop rendering other layers in heatmap mode
    } else {
      // Clear hex bin elements
      g.hexBinPointsData([]);
    }

    // ── 1. Country & District Polygons ─────────────────────────────────────
    g.polygonsData(activeFeatures)
      .polygonCapColor((feat: any) => {
        // High fidelity hover overlay
        if (feat === hoveredFeature) {
          return 'rgba(99, 102, 241, 0.28)'; // glorious pulsing violet overlay when hovered
        }

        // Sub-national drill down rendering logic
        if (isDrillActive) {
          // Highlight state based on whether pins fall in it
          const isVisited = activeLogs.some(log => log.countryCode === activeDrillDownCountry && isPointInPolygon(log.latitude, log.longitude, feat.geometry));
          const isFriendVisited = friendsPlaceLogs.some(log => log.countryCode === activeDrillDownCountry && isPointInPolygon(log.latitude, log.longitude, feat.geometry));
          const isWish = wishlistItems.some(w => w.countryCode === activeDrillDownCountry && isPointInPolygon(w.latitude, w.longitude, feat.geometry));

          if (isVisited && isFriendVisited) return 'rgba(6, 182, 212, 0.55)';
          if (isVisited)       return 'rgba(16, 185, 129, 0.42)';
          if (isFriendVisited) return 'rgba(139, 92, 246, 0.42)';
          if (isWish)          return 'rgba(245, 158, 11, 0.38)';
          return 'rgba(99, 102, 241, 0.04)';
        }

        // Global country rendering logic
        const code = feat.properties.ISO_A2 || feat.properties.iso_a2 || '';
        const continent = feat.properties.CONTINENT || feat.properties.continent;

        // Hover linkages with Continent HUD
        if (hoveredContinent && continent === hoveredContinent) {
          return 'rgba(99, 102, 241, 0.35)'; // glowing indigo pulse
        }

        const isVisited = visitedCountryCodes.includes(code);
        const isFriendVisited = friendsCountryCodes.includes(code);
        const isWish = wishlistCountryCodes.includes(code);

        if (isVisited && isFriendVisited) return 'rgba(6, 182, 212, 0.45)';
        if (isVisited)       return 'rgba(16, 185, 129, 0.35)';
        if (isFriendVisited) return 'rgba(139, 92, 246, 0.35)';
        if (isWish)          return 'rgba(245, 158, 11, 0.32)';
        return 'rgba(255, 255, 255, 0.02)'; // extremely subtle fill for interactive feedback
      })
      .polygonStrokeColor((feat: any) => {
        if (isDrillActive) {
          return 'rgba(99, 102, 241, 0.4)'; // bright borders for state divisions
        }

        const code = feat.properties.ISO_A2 || feat.properties.iso_a2 || '';
        if (visitedCountryCodes.includes(code) && friendsCountryCodes.includes(code)) return '#06b6d4';
        if (visitedCountryCodes.includes(code))  return '#10b981';
        if (friendsCountryCodes.includes(code))  return '#8b5cf6';
        if (wishlistCountryCodes.includes(code)) return '#f59e0b';
        return 'rgba(255, 255, 255, 0.45)'; // 4× brighter white borders on blue marble
      })
      .polygonSideColor(() => 'rgba(99, 102, 241, 0.05)')
      .polygonAltitude((feat: any) => {
        if (isDrillActive) return 0.005;
        const code = feat.properties.ISO_A2 || feat.properties.iso_a2 || '';
        if (visitedCountryCodes.includes(code)) return 0.008;
        if (wishlistCountryCodes.includes(code)) return 0.005;
        if (feat === hoveredFeature) return 0.006;
        return 0.001;
      })
      .polygonLabel(() => '')
      .onPolygonClick((feat: any) => {
        setRotationActive(false);

        // Dynamically compute bounds so it always centers perfectly over the clicked geometry
        const bounds = getFeatureBounds(feat);

        if (isDrillActive) {
          // Drill active: Zoom in closer inside state
          if (bounds) {
            g.pointOfView({ lat: (bounds[1] + bounds[3]) / 2, lng: (bounds[0] + bounds[2]) / 2, altitude: 0.75 }, 1000);
          }
          return;
        }

        const code = feat.properties.ISO_A2 || feat.properties.iso_a2 || '';
        setSelectedCountryCode(code);

        if (bounds) {
          g.pointOfView({ lat: (bounds[1] + bounds[3]) / 2, lng: (bounds[0] + bounds[2]) / 2, altitude: 1.2 }, 1000);
        }

        // Trigger sub-national state drill down if supported
        if (SUB_NATIONAL_MAPS[code]) {
          loadStateBoundaries(code);
        }
      });

    // ── 2. Points / Pins ───────────────────────────────────────────────────
    const pointsData = activeLogs.map(log => ({ ...log, color: '#10b981' }));
    const wishlistPoints = wishlistItems.map(w => ({ ...w, color: '#f59e0b' }));
    const friendPoints = friendsGlobesEnabled
      ? friendsPlaceLogs.map(log => ({ ...log, color: '#8b5cf6' }))
      : [];

    g.pointsData([...pointsData, ...wishlistPoints, ...friendPoints])
      .pointLat((d: any) => d.latitude)
      .pointLng((d: any) => d.longitude)
      .pointColor((d: any) => d.color)
      .pointRadius(0.35)
      .pointAltitude(0.025)
      .pointsMerge(false)
      .pointLabel((d: any) => {
        const starsHtml = d.rating ? renderStarsHtml(d.rating) : '';
        const dateStr = d.visitedAt
          ? new Date(d.visitedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
          : '';
        const isWish = wishlistPoints.some((w: any) => w.id === d.id);
        const isFriend = friendPoints.some((w: any) => w.id === d.id);
        return `
          <div class="glass-panel px-3 py-2.5 rounded-lg border border-white/10 text-xs shadow-xl backdrop-blur-md max-w-xs animate-page-enter">
            <div class="font-bold text-slate-100 flex items-center gap-1.5">
              <span>${isWish ? '★' : isFriend ? '👥' : '📍'}</span> ${d.placeName}
            </div>
            ${starsHtml}
            ${dateStr ? `<div class="text-slate-400 mt-1">${dateStr}</div>` : ''}
            ${d.notes ? `<div class="text-slate-400 italic mt-1.5 border-t border-white/5 pt-1.5 line-clamp-2">"${d.notes}"</div>` : ''}
            <div class="text-[10px] text-indigo-400 mt-2 font-semibold font-mono">
              ${isWish ? 'Wishlist spot' : isFriend ? "Friend's log" : 'Click to edit detail'}
            </div>
          </div>
        `;
      })
      .onPointClick((d: any) => {
        g.pointOfView({ lat: d.latitude, lng: d.longitude, altitude: 0.5 }, 1000);
        setRotationActive(false);
        const match = activeLogs.find(log => log.id === d.id);
        if (match && onSelectPlace) onSelectPlace(match);
        else setSelectedCountryCode(d.countryCode);
      });

    // ── 3. Trip Arcs ───────────────────────────────────────────────────────
    const arcs: any[] = [];
    useTravelStore.getState().trips.forEach(trip => {
      if (trip.deletedAt) return;
      const tripLogs = trip.placeLogIds
        .map(id => activeLogs.find(log => log.id === id))
        .filter((l): l is PlaceLog => !!l);

      for (let i = 0; i < tripLogs.length - 1; i++) {
        arcs.push({
          startLat: tripLogs[i].latitude,
          startLng: tripLogs[i].longitude,
          endLat: tripLogs[i + 1].latitude,
          endLng: tripLogs[i + 1].longitude,
          color: ['#8b5cf6', '#10b981'],
        });
      }
    });

    g.arcsData(arcs)
      .arcStartLat((d: any) => d.startLat)
      .arcStartLng((d: any) => d.startLng)
      .arcEndLat((d: any) => d.endLat)
      .arcEndLng((d: any) => d.endLng)
      .arcColor((d: any) => d.color)
      .arcDashLength(0.4)
      .arcDashGap(0.2)
      .arcDashAnimateTime(2000)
      .arcStroke(0.35);

  }, [geoJsonData, placeLogs, wishlist, friendsGlobesEnabled, friendsPlaceLogs, drillDownGeoJson, activeDrillDownCountry, globeLayerMode, hoveredContinent]);

  const handleRecenter = () => {
    globeInstance.current?.pointOfView({ lat: 20, lng: 0, altitude: 2.2 }, 800);
  };

  // ── 4. Cinematic Autopilot Storytelling Logic ────────────────────────────
  const playStory = (trip: Trip) => {
    const tripLogs = trip.placeLogIds
      .map(id => activeLogs.find(log => log.id === id))
      .filter((l): l is PlaceLog => !!l);

    if (tripLogs.length === 0) return;

    setActiveStoryTrip(trip);
    setStoryIndex(0);
    setIsStoryPlaying(true);
    setRotationActive(false);

    // Fly to first stop
    flyToStoryStop(tripLogs[0]);
  };

  const flyToStoryStop = (stop: PlaceLog) => {
    const g = globeInstance.current;
    if (!g) return;

    // Cinematic curve: fly out first, then swoop in
    g.pointOfView({ lat: stop.latitude, lng: stop.longitude, altitude: 1.1 }, 1000);
    setTimeout(() => {
      g.pointOfView({ lat: stop.latitude, lng: stop.longitude, altitude: 0.58 }, 1200);
    }, 900);
  };

  const stopStory = () => {
    if (storyTimerRef.current) clearInterval(storyTimerRef.current);
    setActiveStoryTrip(null);
    setIsStoryPlaying(false);
  };

  // Autoplay progression tick
  useEffect(() => {
    if (!isStoryPlaying || !activeStoryTrip) return;

    const tripLogs = activeStoryTrip.placeLogIds
      .map(id => activeLogs.find(log => log.id === id))
      .filter((l): l is PlaceLog => !!l);

    if (storyTimerRef.current) clearInterval(storyTimerRef.current);

    storyTimerRef.current = setInterval(() => {
      const nextIndex = storyIndex + 1;
      if (nextIndex < tripLogs.length) {
        setStoryIndex(nextIndex);
        flyToStoryStop(tripLogs[nextIndex]);
      } else {
        // Completed Story journey! Burst confetti!
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        stopStory();
      }
    }, 7000); // 7 seconds per stop

    return () => {
      if (storyTimerRef.current) clearInterval(storyTimerRef.current);
    };
  }, [isStoryPlaying, storyIndex, activeStoryTrip]);

  const handleNextStoryStop = () => {
    if (!activeStoryTrip) return;
    const tripLogs = activeStoryTrip.placeLogIds
      .map(id => activeLogs.find(log => log.id === id))
      .filter((l): l is PlaceLog => !!l);

    const nextIndex = Math.min(storyIndex + 1, tripLogs.length - 1);
    setStoryIndex(nextIndex);
    flyToStoryStop(tripLogs[nextIndex]);
  };

  const handlePrevStoryStop = () => {
    if (!activeStoryTrip) return;
    const tripLogs = activeStoryTrip.placeLogIds
      .map(id => activeLogs.find(log => log.id === id))
      .filter((l): l is PlaceLog => !!l);

    const prevIndex = Math.max(storyIndex - 1, 0);
    setStoryIndex(prevIndex);
    flyToStoryStop(tripLogs[prevIndex]);
  };

  // Continent Conquest HUD Stats
  const calculateContinentStats = () => {
    if (!geoJsonData) return [];
    const continents: Record<string, { total: number; visited: number; codes: string[] }> = {};

    geoJsonData.features.forEach((feat: any) => {
      const cont = feat.properties.CONTINENT || feat.properties.continent;
      const code = feat.properties.ISO_A2 || feat.properties.iso_a2 || '';
      if (!cont) return;

      if (!continents[cont]) {
        continents[cont] = { total: 0, visited: 0, codes: [] };
      }
      continents[cont].total += 1;
      continents[cont].codes.push(code);

      if (visitedCountryCodes.includes(code)) {
        continents[cont].visited += 1;
      }
    });

    return Object.entries(continents).map(([name, stat]) => ({
      name,
      total: stat.total,
      visited: stat.visited,
      percent: Math.round((stat.visited / stat.total) * 100) || 0,
    })).sort((a, b) => b.percent - a.percent);
  };

  const currentStopPlace = activeStoryTrip
    ? activeLogs.find(l => l.id === activeStoryTrip.placeLogIds[storyIndex])
    : null;

  return (
    <div className="relative w-full h-full">
      {/* ── Street-level 2D Map Hyper-Zoom Overlay ────────────────────────── */}
      {isLocalMapActive && localMapCoords && (
        <div className="absolute inset-0 w-full h-full z-40 bg-[#030712]">
          <LocalStreetMap
            latitude={localMapCoords.lat}
            longitude={localMapCoords.lng}
            onExit={() => {
              setIsLocalMapActive(false);
              setLocalMapCoords(null);
              // Pan globe slightly back to zoom level
              globeInstance.current?.pointOfView({ altitude: 1.4 }, 800);
            }}
            onSelectPlace={onSelectPlace}
          />
        </div>
      )}

      {/* Main 3D Globe target element */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing" />

      {/* Loading Overlay */}
      {loadingGeoJson && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-t-indigo-500 border-r-emerald-500 border-slate-700 rounded-full animate-spin" />
          <p className="text-slate-400 text-xs font-semibold tracking-wider">Simulating Stellar Atmosphere…</p>
        </div>
      )}

      {/* ── HUD Center Drill Down Indicator ─────────────────────────────────── */}
      {activeDrillDownCountry && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 glass-panel border border-white/10 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-lg animate-page-enter">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
            <span className="text-xs font-bold text-slate-200">
              State Borders Active: {activeDrillDownCountry}
            </span>
          </div>
          <button
            onClick={handleExitDrillDown}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] text-slate-300 font-bold cursor-pointer transition-all"
          >
            <X className="w-3 h-3" />
            <span>Exit State View</span>
          </button>
        </div>
      )}

      {/* ── HUD Cinematic Storyteller Pill ───────────────────────────────────── */}
      {activeStoryTrip && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 glass-panel border border-white/10 px-4 py-3 rounded-2xl shadow-2xl flex flex-col items-center gap-2 backdrop-blur-xl animate-page-enter w-full max-w-sm sm:max-w-md">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400 animate-bounce" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cinematic Journey</span>
                <span className="text-xs font-black text-slate-100 line-clamp-1">{activeStoryTrip.title}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevStoryStop}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200 cursor-pointer"
                title="Previous Stop"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsStoryPlaying(!isStoryPlaying)}
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-lg transition-all"
                title={isStoryPlaying ? 'Pause Story' : 'Resume Story'}
              >
                {isStoryPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>

              <button
                onClick={handleNextStoryStop}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200 cursor-pointer"
                title="Next Stop"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="w-px h-5 bg-white/10 mx-1.5" />

              <button
                onClick={stopStory}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 cursor-pointer border border-transparent hover:border-red-500/20"
                title="Close Story Mode"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="w-full flex items-center justify-between mt-1 text-[9px] text-slate-400 font-mono">
            <span>Stop {storyIndex + 1} of {activeStoryTrip.placeLogIds.length}</span>
            <span className="text-indigo-400 font-bold">{currentStopPlace?.placeName}</span>
          </div>

          {/* Autoplay progress line */}
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-indigo-500 transition-all duration-7000 ease-linear"
              style={{
                width: isStoryPlaying ? '100%' : '0%',
                animation: isStoryPlaying ? 'loading-bar 7s linear infinite' : 'none'
              }}
            />
          </div>
        </div>
      )}

      {/* ── HUD Left Sidebar: Continent Conquests ────────────────────────────── */}
      {isConquestHUDOpen && (
        <div className="absolute top-20 right-6 z-10 w-80 glass-panel-heavy border border-white/10 p-5 rounded-2xl shadow-2xl backdrop-blur-xl animate-page-enter flex flex-col gap-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-slate-200 font-black text-sm uppercase tracking-wider">Conquest Board</h3>
            </div>
            <button
              onClick={() => setIsConquestHUDOpen(false)}
              className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-3.5">
            {calculateContinentStats().map((item) => (
              <div
                key={item.name}
                onMouseEnter={() => setHoveredContinent(item.name)}
                onMouseLeave={() => setHoveredContinent(null)}
                className="group flex flex-col gap-1 p-2 rounded-xl border border-transparent hover:border-white/5 hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-300 group-hover:text-indigo-400 transition-all">{item.name}</span>
                  <span className="text-slate-400 font-mono text-[10px]">{item.visited} / {item.total} Visited</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black font-mono text-emerald-400 w-8 text-right">
                    {item.percent}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-[9px] text-slate-500 italic mt-2 text-center border-t border-white/5 pt-3">
            *Hovering over a continent highlights its territories in real-time.
          </div>
        </div>
      )}

      {/* ── Bottom HUD Cinematic Story Stop detail Drawer ─────────────────────── */}
      {activeStoryTrip && currentStopPlace && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 w-full max-w-sm sm:max-w-md glass-panel-heavy border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-xl animate-page-enter flex gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-lg text-indigo-400 shrink-0 select-none">
            ✈️
          </div>
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="truncate text-sm font-black">{currentStopPlace.placeName}</span>
              <span className="text-slate-400 shrink-0 font-mono text-[10px]">
                {currentStopPlace.visitedAt ? new Date(currentStopPlace.visitedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : ''}
              </span>
            </div>
            
            {currentStopPlace.rating && (
              <div className="flex items-center gap-0.5 text-amber-400 text-xs select-none mt-0.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFull = star <= Math.floor(currentStopPlace.rating!);
                  const isHalf = star === Math.ceil(currentStopPlace.rating!) && currentStopPlace.rating! % 1 !== 0;
                  return (
                    <span key={star} className="relative w-3.5 h-3.5 flex items-center justify-center shrink-0">
                      {isHalf ? (
                        <span className="relative w-3.5 h-3.5 block">
                          <Star className="w-3.5 h-3.5 text-slate-750 absolute top-0 left-0" />
                          <span className="absolute top-0 left-0 w-[50%] h-full overflow-hidden block">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                          </span>
                        </span>
                      ) : (
                        <Star className={`w-3.5 h-3.5 ${isFull ? 'text-amber-400 fill-current' : 'text-slate-750'}`} />
                      )}
                    </span>
                  );
                })}
              </div>
            )}

            <p className="text-slate-400 text-xs italic line-clamp-3 mt-1 leading-relaxed">
              {currentStopPlace.notes ? `"${currentStopPlace.notes}"` : 'No diary entries logged for this stop.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Floating Controls HUD Panel ───────────────────────────────────────── */}
      <div className="absolute bottom-6 left-6 z-10 flex items-center gap-2 p-2 rounded-2xl glass-panel border border-white/10 shadow-2xl backdrop-blur-lg">
        <button
          onClick={() => setRotationActive(!rotationActive)}
          className={`p-2 rounded-xl transition-all cursor-pointer ${rotationActive ? 'bg-indigo-500/20 text-indigo-400 glow-blue' : 'text-slate-400 hover:bg-white/5'}`}
          title="Toggle Auto Rotation"
        >
          <RotateCw className={`w-4 h-4 ${rotationActive ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
        </button>

        <button
          onClick={handleRecenter}
          className="p-2 rounded-xl text-slate-400 hover:bg-white/5 cursor-pointer transition-all"
          title="Recenter Camera"
        >
          <Compass className="w-4 h-4" />
        </button>

        <button
          onClick={toggleFriendsGlobes}
          className={`p-2 rounded-xl transition-all cursor-pointer ${friendsGlobesEnabled ? 'bg-purple-500/20 text-purple-400 glow-purple border border-purple-500/20' : 'text-slate-400 hover:bg-white/5 border border-transparent'}`}
          title="Toggle Friends' Travel overlay"
        >
          <Users className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsConquestHUDOpen(!isConquestHUDOpen)}
          className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${isConquestHUDOpen ? 'bg-emerald-500/20 text-emerald-400 glow-emerald border border-emerald-500/20' : 'text-slate-400 hover:bg-white/5 border border-transparent'}`}
          title="Explore Conquests"
        >
          <Award className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Conquests</span>
        </button>

        <div className="h-4 w-px bg-white/10 mx-0.5" />

        {/* Dynamic Layer Switcher */}
        <button
          onClick={() => setGlobeLayerMode(globeLayerMode === 'satellite' ? 'heatmap' : 'satellite')}
          className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${globeLayerMode === 'heatmap' ? 'bg-cyan-500/20 text-cyan-400 glow-blue border border-cyan-500/20' : 'text-slate-400 hover:bg-white/5 border border-transparent'}`}
          title="Switch Globe Visual Layers"
        >
          <Layers className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
            {globeLayerMode === 'satellite' ? 'Layers' : '3D Columns'}
          </span>
        </button>

        {/* Manual Local 2D Map Toggle */}
        <button
          onClick={() => {
            const pov = globeInstance.current?.pointOfView();
            if (pov) {
              setLocalMapCoords({ lat: pov.lat, lng: pov.lng });
              setIsLocalMapActive(true);
            }
          }}
          className="p-2 rounded-xl text-slate-400 hover:bg-white/5 border border-transparent hover:text-slate-200 cursor-pointer transition-all flex items-center gap-1.5"
          title="Open Local 2D Map"
        >
          <Map className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
            2D Map
          </span>
        </button>
      </div>

      {/* ── Voyager Sidebar HUD (Spin & Navigation tutorial) ────────────────── */}
      <div className="absolute top-6 left-6 z-10 glass-panel border border-white/5 p-4 rounded-2xl max-w-xs shadow-2xl pointer-events-none hidden md:block select-none">
        <h4 className="text-slate-200 font-bold text-xs tracking-wider uppercase">Voyager Console</h4>
        <p className="text-slate-400 text-[10px] leading-relaxed mt-1">
          Spin globe to navigate. Click countries to drill down. Zoom in close to inspect local street maps.
        </p>

        {trips.filter(t => !t.deletedAt).length > 0 && (
          <div className="mt-3 border-t border-white/5 pt-3 pointer-events-auto">
            <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Cinematic Trips</span>
            <div className="flex flex-col gap-1.5 mt-1.5 max-h-36 overflow-y-auto no-scrollbar">
              {trips.filter(t => !t.deletedAt).slice(0, 3).map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => playStory(trip)}
                  className="flex items-center justify-between text-left p-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-indigo-500/30 text-[10px] font-bold text-slate-300 cursor-pointer hover:bg-white/10 transition-all"
                >
                  <span className="truncate pr-2">{trip.title}</span>
                  <span className="text-[9px] text-indigo-400 shrink-0 font-mono font-black flex items-center gap-0.5">
                    PLAY ▶
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4 mt-3 border-t border-white/5 pt-3 text-[9px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
            <span className="text-slate-300 font-mono font-medium">{visitedCountryCodes.length} Visited</span>
          </div>
          {friendsGlobesEnabled && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.7)]" />
              <span className="text-slate-300 font-mono font-medium">{friendsCountryCodes.length} Friends</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]" />
            <span className="text-slate-300 font-mono font-medium">{wishlistCountryCodes.length} Wishes</span>
          </div>
        </div>
      </div>
    </div>
  );
};
