
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
  const [globalCollapseSignal, setGlobalCollapseSignal] = useState<boolean>(true);
  
  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPinIds, setSelectedPinIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const [viewMode, setViewMode] = useState<'list' | 'map'>(() => {
    const savedMode = localStorage.getItem('locator_view_mode');
    return (savedMode === 'list' || savedMode === 'map') ? savedMode : 'list';
  });
  const [lastCreatedPinId, setLastCreatedPinId] = useState<string | null>(null);
  const [selectedMapPinId, setSelectedMapPinId] = useState<string | null>(null);

  // Optimized Fullscreen: only trigger on user gesture to avoid flicker on launch
  useEffect(() => {
    const handleFirstInteraction = async () => {
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) {
        // Silent catch for browser restrictions
      }
      // Only try once to avoid annoying the user
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

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

  useEffect(() => {
    localStorage.setItem('my_locater_pins', JSON.stringify(pins));
  }, [pins]);

  useEffect(() => {
    localStorage.setItem('locator_view_mode', viewMode);
    setSelectedMapPinId(null);
  }, [viewMode]);

  useEffect(() => {
    if (pins.length === 0 && viewMode === 'map') {
      setViewMode('list');
    }
  }, [pins, viewMode]);

  // Reset selection when leaving selection mode
  useEffect(() => {
    if (!isSelectionMode) {
      setSelectedPinIds(new Set());
    }
  }, [isSelectionMode]);

  const getPreciseLocation = () => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocatie wordt niet ondersteund."));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        maximumAge: 0, 
        timeout: 20000,
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

      const timeoutTimer = setTimeout(() => {
        if (bestPosition) {
          finish(bestPosition);
        } else {
          fail(new Error("Geen GPS signaal ontvangen."));
        }
      }, 20000);

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const dataAge = position.timestamp ? Date.now() - position.timestamp : 0;
          if (dataAge > 60000) return;

          const accuracy = position.coords.accuracy;
          if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
            bestPosition = position;
          }

          if (accuracy <= 30) {
            clearTimeout(timeoutTimer);
            finish(position);
          }
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            clearTimeout(timeoutTimer);
            fail(error);
          }
        },
        options
      );
    });
  };

  const recordLocation = useCallback(async () => {
    setIsRecording(true);
    setError(null);

    try {
      const position = await getPreciseLocation();
      const { latitude, longitude, accuracy } = position.coords;
      const now = new Date();
      
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      );
      
      if (!geoRes.ok) throw new Error("Kon adres niet ophalen");
      
      const geoData: GeocodingResult = await geoRes.json();
      
      const city = geoData.address.city || geoData.address.town || geoData.address.village || "Onbekende Stad";
      const countryCode = geoData.address.country_code?.toUpperCase() || "UN";

      let address = geoData.display_name;
      if (geoData.address.road) {
        address = `${geoData.address.road} ${geoData.address.house_number || ''}`.trim();
        if (city && city !== "Onbekende Stad") {
           address += `, ${city}`;
        }
      }

      const mapImageUrl = `https://static-maps.yandex.ru/1.x/?ll=${longitude},${latitude}&z=16&l=map&pt=${longitude},${latitude},pm2rdl&size=450,300`;

      let initialNote = '';
      if (accuracy > 1000) {
        const kmOff = Math.round(accuracy / 1000);
        initialNote = `⚠️ Onnauwkeurig signaal (~${kmOff}km afwijking)`;
      }

      // Format date as "zo 4-1-2026"
      const days = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
      const dayName = days[now.getDay()];
      const formattedDate = `${dayName} ${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;

      const newPinId = crypto.randomUUID();
      const newPin: PinData = {
        id: newPinId,
        latitude,
        longitude,
        address, 
        city,
        countryCode,
        date: formattedDate,
        time: now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
        mapImageUrl,
        note: initialNote
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

  const handleBulkDelete = () => {
    setPins(prev => prev.filter(p => !selectedPinIds.has(p.id)));
    setSelectedPinIds(new Set());
    setIsSelectionMode(false);
    setShowBulkDeleteConfirm(false);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedPinIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedPinIds(newSet);
  };

  const updatePinNote = (id: string, note: string) => {
    setPins(prev => prev.map(p => (p.id === id ? { ...p, note } : p)));
  };

  const handleDeleteAll = useCallback(() => {
    setPins([]);
    localStorage.removeItem('my_locater_pins');
    setViewMode('list');
    setSelectedMapPinId(null);
    setIsSelectionMode(false);
  }, []);

  const handleImportPins = (newPins: PinData[]) => {
    setPins(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const uniqueNewPins = newPins.filter(p => !existingIds.has(p.id));
      return [...uniqueNewPins, ...prev];
    });
  };

  const selectedMapPin = useMemo(() => {
    return pins.find(p => p.id === selectedMapPinId);
  }, [pins, selectedMapPinId]);

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden">
      
      <div className="relative z-10 flex flex-col h-screen bg-white/30 backdrop-blur-[2px]">
        <Header 
          isAllCollapsed={globalCollapseSignal} 
          onToggleAll={() => setGlobalCollapseSignal(!globalCollapseSignal)} 
          pins={pins}
          onImport={handleImportPins}
          onDeleteAll={handleDeleteAll}
          isSelectionMode={isSelectionMode}
          onToggleSelectionMode={() => setIsSelectionMode(!isSelectionMode)}
        />
        
        {isSelectionMode ? (
           <div className="px-6 pb-6 flex justify-center sticky top-[100px] z-20 animate-in fade-in slide-in-from-top-4">
             <div className="bg-slate-900 text-white px-6 py-2 rounded-2xl shadow-xl flex items-center gap-3">
               <span className="font-bold text-sm">Selecteer items</span>
               <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-mono">{selectedPinIds.size}</span>
               <button onClick={() => setIsSelectionMode(false)} className="ml-2 text-slate-300 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
               </button>
             </div>
           </div>
        ) : (
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
                <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] min-w-[1.2rem] text-center ${viewMode === 'list' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {pins.length}
                </span>
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
        )}
        
        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-32 scroll-smooth">
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
              <p className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Nog geen pins<br/>opgeslagen</p>
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
                  initiallyExpanded={!isSelectionMode && pin.id === lastCreatedPinId}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedPinIds.has(pin.id)}
                  onToggleSelect={() => toggleSelection(pin.id)}
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
                      forceCollapseSignal={false}
                      initiallyExpanded={true}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {isSelectionMode ? (
          /* Bulk Delete Button */
          <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              disabled={selectedPinIds.size === 0}
              className={`
                pointer-events-auto
                group relative flex items-center justify-center gap-2 px-8 py-4
                bg-red-600 text-white font-bold rounded-full
                shadow-[0_8px_20px_rgba(220,38,38,0.4)]
                transition-all duration-300 hover:scale-105 active:scale-95 
                disabled:opacity-0 disabled:translate-y-10
              `}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Verwijder ({selectedPinIds.size})</span>
            </button>
          </div>
        ) : (
          <RecordButton onClick={recordLocation} isLoading={isRecording} />
        )}

        {/* Bulk Delete Confirmation Modal */}
        {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-48">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowBulkDeleteConfirm(false)}
          ></div>
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-100 animate-in slide-in-from-top-10 fade-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">Selectie verwijderen?</h3>
              <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
                Je staat op het punt om <span className="text-slate-900 font-bold">{selectedPinIds.size}</span> locaties te wissen.
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Annuleer
                </button>
                <button 
                  onClick={handleBulkDelete}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all active:scale-95"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default App;
