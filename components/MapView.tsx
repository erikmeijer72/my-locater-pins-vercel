
import React, { useEffect, useRef, useState } from 'react';
import { PinData } from '../types';

interface MapViewProps {
  pins: PinData[];
  onPinClick?: (id: string) => void;
  onMapClick?: () => void;
}

const MapView: React.FC<MapViewProps> = ({ pins, onPinClick, onMapClick }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  // Zorg dat de kaart altijd de juiste afmetingen pakt bij window resize
  useEffect(() => {
    const refresh = () => {
      if (leafletMap.current) {
        leafletMap.current.invalidateSize();
      }
    };
    window.addEventListener('resize', refresh);
    return () => window.removeEventListener('resize', refresh);
  }, []);

  useEffect(() => {
    const L = (window as any).L;
    if (!mapRef.current || !L) return;

    // 1. Initialiseer de kaart als deze nog niet bestaat
    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,
        dragging: true
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        subdomains: 'abcd'
      }).addTo(leafletMap.current);

      leafletMap.current.on('click', () => {
        if (onMapClick) onMapClick();
      });
    }

    // 2. Verwijder oude markers
    leafletMap.current.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) {
        leafletMap.current.removeLayer(layer);
      }
    });

    // 3. Bereken markers en bounds synchroon
    let targetBounds: any = null;

    if (pins.length > 0) {
      const markers: any[] = [];
      
      pins.forEach((pin, index) => {
        const pinNumber = pins.length - index;
        const customIcon = L.divIcon({
          className: 'bg-transparent border-none',
          html: `
            <div class="relative flex items-center justify-center w-6 h-6 bg-red-600 rounded-full border-[2.5px] border-white shadow-lg">
              <span class="text-[10px] font-bold text-white leading-none">${pinNumber}</span>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([pin.latitude, pin.longitude], { icon: customIcon }).addTo(leafletMap.current);
        marker.on('click', (e: any) => {
          L.DomEvent.stopPropagation(e);
          if (onPinClick) onPinClick(pin.id);
        });
        markers.push(marker);
      });

      const group = new L.featureGroup(markers);
      targetBounds = group.getBounds().pad(0.2);
    }

    // 4. Stel een vertraging in voordat we de view updaten.
    setIsReady(false);
    
    const timer = setTimeout(() => {
      if (!leafletMap.current) return;

      // Forceer Leaflet om de container grootte opnieuw te lezen
      leafletMap.current.invalidateSize();

      if (targetBounds) {
        leafletMap.current.fitBounds(targetBounds, { animate: false });
      } else {
        leafletMap.current.setView([52.1326, 5.2913], 7, { animate: false });
      }
      
      setIsReady(true);
    }, 150); // Aangepast naar 150ms

    return () => clearTimeout(timer);

  }, [pins, onPinClick, onMapClick]);

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-[#f1f5f9] flex flex-col">
      {/* Loader overlay */}
      <div 
        className={`absolute inset-0 z-50 bg-slate-100 flex flex-col items-center justify-center transition-opacity duration-500 ${isReady ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
         <div className="w-10 h-10 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin mb-3"></div>
         <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Kaart laden...</span>
      </div>
      
      <div 
        ref={mapRef} 
        className="flex-1 w-full h-full z-0" 
      />

      {/* Handmatige zoom knoppen */}
      <div className={`absolute top-4 right-4 z-10 flex flex-col gap-2 transition-all duration-500 ${isReady ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`}>
        <div className="bg-white/90 backdrop-blur-md rounded-xl border border-slate-200 flex flex-col shadow-lg overflow-hidden">
          <button 
            onClick={() => leafletMap.current?.zoomIn()}
            className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 border-b border-slate-100"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button 
            onClick={() => leafletMap.current?.zoomOut()}
            className="w-10 h-10 flex items-center justify-center hover:bg-slate-100"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapView;
