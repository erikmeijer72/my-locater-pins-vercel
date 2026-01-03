
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { PinData, GeocodingResult } from './types';
import Header from './components/Header';
import RecordButton from './components/RecordButton';
import PinCard from './components/PinCard';
import MapView from './components/MapView';

const App: React.FC = () => {
  const [pins, setPins] = useState<PinData[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Start with true to ensure all cards are collapsed on open
  const [globalCollapseSignal, setGlobalCollapseSignal] = useState<boolean>(true);
  
  // Initialize viewMode from localStorage, default to 'list'
  const [viewMode, setViewMode] = useState<'list' | 'map'>(() => {
    const savedMode = localStorage.getItem('locator_view_mode');
    return (savedMode === 'list' || savedMode === 'map') ? savedMode : 'list';
  });
  const [lastCreatedPinId, setLastCreatedPinId] = useState<string | null>(null);
  
  // Track selected pin in Map View
  const [selectedMapPinId, setSelectedMapPinId] = useState<string | null>(null);

  // Auto-fullscreen logic: Attempt on load and on first interaction
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) {
        // Browser prevented auto-fullscreen (likely needs user gesture)
        // We will wait for the interaction listener
      }
    };

    // Attempt immediately on mount
    enterFullscreen();

    // Also try on first user interaction as fallback
    const handleInteraction = () => {
      enterFullscreen();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // Laad opgeslagen pins van lokale opslag bij het laden
  useEffect(() => {
    const saved = localStorage.getItem('my_locater_pins');
    if (saved) {
      try {
        setPins(JSON.parse(saved));
      } catch (e) {
        console.error("Laden van pins mislukt", e);
      }
    }
  }, []);

  // Sla pins op in lokale opslag wanneer ze veranderen
  useEffect(() => {
    localStorage.setItem('my_locater_pins', JSON.stringify(pins));
  }, [pins]);

  // Sla viewMode op in lokale opslag wanneer deze verandert
  useEffect(() => {
    localStorage.setItem('locator_view_mode', viewMode);
    // Clear selection when switching modes
    setSelectedMapPinId(null);
  }, [viewMode]);

  // Forceer lijstweergave als er geen pins zijn (voorkomt lege kaartweergave)
  useEffect(() => {
    if (pins.length === 0 && viewMode === 'map') {
      setViewMode('list');
    }
  }, [pins, viewMode]);

  // Helper functie om de meest nauwkeurige locatie te verkrijgen
  const getPreciseLocation = () => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocatie wordt niet ondersteund."));
        return;
      }

      // ROBUSTNESS UPDATE:
      // 1. Allow cached positions (up to 30s old) for faster lock
      // 2. Increase timeout to 15s to allow GPS warmup
      const options = {
        enableHighAccuracy: true,
        maximumAge: 30000, 
        timeout: 15000,
      };

      let bestPosition: GeolocationPosition | null = null;
      let watchId: number;
      let hasResolved = false;

      const finish = (pos: GeolocationPosition) => {
        if (hasResolved) return;
        hasResolved = true;
        if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
        resolve(pos);
      };

      const fail = (err: any) => {
        if (hasResolved) return;
        hasResolved = true;
        if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
        reject(err);
      };

      // Hard limit timeout: stop waiting after 10 seconds
      const timeoutTimer = setTimeout(() => {
        if (bestPosition) {
          // If we have any position found during watch, use it
          finish(bestPosition);
        } else {
          // FALLBACK: If no high accuracy position found, try low accuracy (Cell/WiFi)
          // This prevents the "Could not get GPS lock" error indoors
          navigator.geolocation.getCurrentPosition(
            (pos) => finish(pos),
            (err) => fail(new Error("Kon geen locatie bepalen. Controleer of locatievoorzieningen aan staan.")),
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
          );
        }
      }, 10000);

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const accuracy = position.coords.accuracy;
          
          // Keep the best accuracy found so far
          if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
            bestPosition = position;
          }

          // If we have good accuracy (< 40m), stop immediately
          if (accuracy <= 40) {
            clearTimeout(timeoutTimer);
            finish(position);
          }
        },
        (error) => {
          // Only fail immediately on permission denied
          if (error.code === error.PERMISSION_DENIED) {
            clearTimeout(timeoutTimer);
            fail(error);
          }
          // For other errors (timeout/unavailable), we wait for the hard timeout fallback
        },
        options
      );
    });
  };

  const recordLocation = useCallback(async () => {
    setIsRecording(true);
    setError(null);

    try {
      // Gebruik de nieuwe 'smart' location functie
      const position = await getPreciseLocation();
      const { latitude, longitude } = position.coords;
      const now = new Date();
      
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      );
      
      if (!geoRes.ok) throw new Error("Kon adres niet ophalen");
      
      const geoData: GeocodingResult = await geoRes.json();
      
      const city = geoData.address.city || geoData.address.town || geoData.address.village || "Onbekende Stad";
      const countryCode = geoData.address.country_code?.toUpperCase() || "UN";

      // Verkort adres: Straat Huisnummer, Plaats
      let address = geoData.display_name;
      if (geoData.address.road) {
        address = `${geoData.address.road} ${geoData.address.house_number || ''}`.trim();
        if (city && city !== "Onbekende Stad") {
           address += `, ${city}`;
        }
      }

      const mapImageUrl = `https://static-maps.yandex.ru/1.x/?ll=${longitude},${latitude}&z=16&l=map&pt=${longitude},${latitude},pm2rdl&size=450,300`;

      const newPinId = crypto.randomUUID();
      const newPin: PinData = {
        id: newPinId,
        latitude,
        longitude,
        address, // Nu verkort
        city,
        countryCode,
        date: now.toLocaleDateString('nl-NL'),
        time: now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
        mapImageUrl,
        note: ''
      };

      setLastCreatedPinId(newPinId);
      setPins(prev => [newPin, ...prev]);
      setViewMode('list');
    } catch (err: any) {
      console.error("Vastleggen mislukt:", err);
      let errorMsg = "Locatiebepaling mislukt. Controleer je GPS en verbinding.";
      if (err.code === 1) errorMsg = "Toegang tot locatie geweigerd.";
      else if (err.message) errorMsg = err.message;
      setError(errorMsg);
    } finally {
      setIsRecording(false);
    }
  }, []);

  const deletePin = (id: string) => {
    setPins(prev => prev.filter(p => p.id !== id));
    if (selectedMapPinId === id) {
      setSelectedMapPinId(null);
    }
  };

  const updatePinNote = (id: string, note: string) => {
    setPins(prev => prev.map(p => (p.id === id ? { ...p, note } : p)));
  };

  const handleDeleteAll = useCallback(() => {
    setPins([]);
    localStorage.removeItem('my_locater_pins'); // Direct remove to be safe
    setViewMode('list'); // Reset view to list
    setSelectedMapPinId(null);
  }, []);

  const handleImportPins = (newPins: PinData[]) => {
    // Merge without duplicates based on ID or just add all
    setPins(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const uniqueNewPins = newPins.filter(p => !existingIds.has(p.id));
      return [...uniqueNewPins, ...prev];
    });
  };

  // Derived state for the selected map pin
  const selectedMapPin = useMemo(() => {
    return pins.find(p => p.id === selectedMapPinId);
  }, [pins, selectedMapPinId]);

  return (
    <div className="relative h-screen w-full flex flex-col overflow-hidden bg-slate-50">
      <div className="fixed inset-0 blurry-map z-0"></div>
      
      <div className="relative z-10 flex flex-col h-full bg-white/30 backdrop-blur-[2px]">
        <Header 
          isAllCollapsed={globalCollapseSignal} 
          onToggleAll={() => setGlobalCollapseSignal(!globalCollapseSignal)} 
          pins={pins}
          onImport={handleImportPins}
          onDeleteAll={handleDeleteAll}
        />
        
        {/* Weergave schakelaar Toolbar */}
        <div className="px-6 pb-6 flex justify-center sticky top-[100px] z-20">
          <div className="bg-white/80 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200 flex gap-1 shadow-xl">
            <button 
              onClick={() => setViewMode('list')}
              className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Lijst
            </button>
            <button 
              onClick={() => setViewMode('map')}
              disabled={pins.length === 0}
              className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'map' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'} ${pins.length === 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Kaart
            </button>
          </div>
        </div>
        
        <main className="flex-1 overflow-y-auto px-4 pb-32 scroll-smooth">
          {error && (
            <div className="bg-red-500/90 text-white p-4 rounded-2xl mb-6 text-sm font-bold shadow-xl animate-in fade-in zoom-in max-w-lg mx-auto border border-red-400/50">
              {error}
            </div>
          )}
          
          {pins.length === 0 && !isRecording && (
            <div className="flex flex-col items-center justify-center h-80 text-center animate-in fade-in duration-700">
              <div className="w-20 h-20 bg-slate-200/50 rounded-3xl flex items-center justify-center mb-6 backdrop-blur-md border border-slate-200/50">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
              <p className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Nog geen pins opgeslagen</p>
              <p className="text-sm text-slate-500 max-w-[200px] leading-relaxed">Klik op de rode knop om je eerste locatie vast te leggen of importeer gegevens!</p>
            </div>
          )}

          {viewMode === 'list' ? (
            <div className="grid gap-4 max-w-lg mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700 pb-10">
              {pins.map((pin) => (
                <PinCard 
                  key={pin.id} 
                  pin={pin} 
                  onDelete={() => deletePin(pin.id)}
                  onUpdateNote={updatePinNote}
                  forceCollapseSignal={globalCollapseSignal}
                  initiallyExpanded={pin.id === lastCreatedPinId}
                />
              ))}
            </div>
          ) : (
            <div className="relative w-full max-w-4xl mx-auto h-[65vh] min-h-[450px] animate-in zoom-in-95 fade-in duration-500 mb-10">
              <MapView 
                pins={pins} 
                onPinClick={(id) => setSelectedMapPinId(id)}
                onMapClick={() => setSelectedMapPinId(null)}
              />
              
              {/* Selected Pin Overlay */}
              {selectedMapPin && (
                <div className="absolute bottom-4 left-4 right-4 z-[500] animate-in slide-in-from-bottom-10 fade-in duration-300">
                  <div className="relative bg-white/50 backdrop-blur-sm p-1 rounded-3xl shadow-2xl">
                    <button 
                      onClick={() => setSelectedMapPinId(null)}
                      className="absolute -top-3 -right-2 bg-slate-900 text-white hover:bg-red-600 rounded-full p-2 z-[600] shadow-lg transition-colors scale-90"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <PinCard 
                      pin={selectedMapPin}
                      onDelete={() => deletePin(selectedMapPin.id)}
                      onUpdateNote={updatePinNote}
                      forceCollapseSignal={false} // Always open
                      initiallyExpanded={true} // Always open
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        <RecordButton onClick={recordLocation} isLoading={isRecording} />
      </div>
    </div>
  );
};

export default App;
