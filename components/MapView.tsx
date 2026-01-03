
import React, { useEffect, useRef } from 'react';
import { PinData } from '../types';

interface MapViewProps {
  pins: PinData[];
  onPinClick?: (id: string) => void;
  onMapClick?: () => void;
}

const MapView: React.FC<MapViewProps> = ({ pins, onPinClick, onMapClick }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);

  useEffect(() => {
    const L = (window as any).L;
    if (!mapRef.current || !L) return;

    // Initialiseer kaart als dat nog niet is gebeurd
    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current, {
        zoomControl: false, 
        attributionControl: false, 
        scrollWheelZoom: true,
        dragging: true
      }).setView([52.1326, 5.2913], 7);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
      }).addTo(leafletMap.current);

      // Add map background click handler to deselect
      leafletMap.current.on('click', () => {
        if (onMapClick) onMapClick();
      });
    }

    // Zorg dat de kaart de container vult
    leafletMap.current.invalidateSize();

    // Verwijder bestaande markers
    leafletMap.current.eachLayer((layer: any) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
        leafletMap.current.removeLayer(layer);
      }
    });

    // Voeg nieuwe markers toe met nummers en centreer
    if (pins.length > 0) {
      const markers: any[] = [];
      
      // Pins array is gesorteerd van nieuw naar oud (index 0 is nieuwst)
      // We willen dat de nieuwste pin het hoogste nummer heeft.
      pins.forEach((pin, index) => {
        const pinNumber = pins.length - index;

        const customIcon = L.divIcon({
          className: 'bg-transparent border-none',
          html: `
            <div class="relative flex items-center justify-center w-6 h-6 bg-red-600 rounded-full border-[2.5px] border-white shadow-md transform hover:scale-110 transition-transform duration-200">
              <span class="text-[10px] font-black text-white leading-none font-sans">${pinNumber}</span>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12], // Centreer het icoon op de coördinaat
          popupAnchor: [0, -14] // Popup iets boven de marker
        });

        const marker = L.marker([pin.latitude, pin.longitude], {
          icon: customIcon
        })
          .addTo(leafletMap.current);
          
        // Bind popup but also add click handler for the card
        marker.bindPopup(`
            <div class="text-xs p-1 text-slate-900 font-bold min-w-[160px]">
              <div class="flex items-center gap-2 mb-1.5 border-b border-slate-100 pb-1.5">
                <span class="flex items-center justify-center w-4 h-4 bg-red-600 rounded-full text-[8px] text-white font-black">${pinNumber}</span>
                <p class="font-black text-slate-800 uppercase tracking-tighter text-[10px]">${pin.city}</p>
              </div>
              <p class="font-bold text-slate-500 line-clamp-2 mb-2 leading-tight text-[10px]">${pin.address}</p>
              <div class="flex items-center justify-between opacity-60 font-black text-[9px] uppercase tracking-widest text-slate-400">
                <span>${pin.date}</span>
                <span>${pin.time}</span>
              </div>
            </div>
          `, { closeButton: false, offset: [0, 5], className: 'custom-popup' });

        // Add click event to marker
        marker.on('click', (e: any) => {
          // Stop propagation so the map click doesn't immediately deselect it
          L.DomEvent.stopPropagation(e);
          if (onPinClick) {
            onPinClick(pin.id);
          }
        });

        markers.push(marker);
      });

      // Fit bounds logic - Only run if we are not interacting with a specific pin selection
      // We check if markers exist to avoid error
      if (markers.length > 0) {
          // If the map was just initialized or pins changed significantly, we fit bounds.
          // Note: In a real complex app we might want to be smarter about when to re-zoom.
          // For now, keeping existing logic but ensuring we don't break user zoom too often.
          if (!leafletMap.current._hasFitBounds) {
             const group = new L.featureGroup(markers);
             leafletMap.current.fitBounds(group.getBounds().pad(0.5), {
               animate: true,
               duration: 1.0
             });
             leafletMap.current._hasFitBounds = true;
          }
      }

    } else {
      leafletMap.current.setView([52.1326, 5.2913], 7, { animate: false });
    }

  }, [pins, onPinClick, onMapClick]);

  // Reset fit bounds flag when pins change length significantly (import/delete)
  useEffect(() => {
     if (leafletMap.current) {
        leafletMap.current._hasFitBounds = false;
     }
  }, [pins.length]);

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-slate-200 flex flex-col">
      <div ref={mapRef} className="flex-1 w-full h-full z-0" />
    </div>
  );
};

export default MapView;
