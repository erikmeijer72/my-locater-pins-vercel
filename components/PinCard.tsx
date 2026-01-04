
import React, { useState, useEffect, useRef } from 'react';
import { PinData } from '../types';

interface PinCardProps {
  pin: PinData;
  onDelete: () => void;
  onUpdateNote: (id: string, note: string) => void;
  forceCollapseSignal: boolean;
  initiallyExpanded?: boolean;
}

const PinCard: React.FC<PinCardProps> = ({ pin, onDelete, onUpdateNote, forceCollapseSignal, initiallyExpanded }) => {
  // Use initiallyExpanded if provided (for new pins), otherwise default to false
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded || false);
  const [noteText, setNoteText] = useState(pin.note || '');
  const prevSignalRef = useRef(forceCollapseSignal);

  // Sync met globale inklap-signaal
  useEffect(() => {
    if (forceCollapseSignal !== prevSignalRef.current) {
      setIsExpanded(!forceCollapseSignal);
      prevSignalRef.current = forceCollapseSignal;
    }
  }, [forceCollapseSignal]);

  // Sync local note text if pin data changes externally
  useEffect(() => {
    setNoteText(pin.note || '');
  }, [pin.note]);

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://www.google.com/maps/search/?api=1&query=${pin.latitude},${pin.longitude}`;
    window.open(url, '_blank');
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: 'Mijn Locatie Pin',
      text: `Ik heb een locatie vastgelegd op ${pin.address}.${pin.note ? `\nNotitie: ${pin.note}` : ''}`,
      url: `https://www.google.com/maps?q=${pin.latitude},${pin.longitude}`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Fout bij delen:', err);
      }
    } else {
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      alert('Link gekopieerd naar klembord!');
    }
  };

  const handleNoteBlur = () => {
    if (noteText !== pin.note) {
      onUpdateNote(pin.id, noteText);
    }
  };

  const flagUrl = `https://flagcdn.com/w40/${pin.countryCode.toLowerCase()}.png`;

  return (
    <div className={`
      group relative rounded-2xl overflow-hidden border transition-all duration-500 ease-out
      ${isExpanded 
        ? 'bg-slate-100 border-slate-300 shadow-2xl mb-4 scale-[1.01] z-10' 
        : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50 mb-2 hover:border-red-500/30'
      }
    `}>
      {/* Kopbalk - Altijd Zichtbaar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-slate-100/50' : 'hover:bg-slate-50'}`}
      >
        <div className="flex items-center gap-4">
          <img src={flagUrl} alt={pin.countryCode} className="h-4 w-6 object-cover rounded shadow-sm border border-slate-100 flex-shrink-0" />
          <div className="flex flex-col">
            <span className={`font-black text-sm leading-none tracking-tight uppercase transition-colors ${isExpanded ? 'text-red-700' : 'text-slate-900'}`}>
              {pin.city}
            </span>
            <span className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{pin.date} • {pin.time}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {!isExpanded && (
            <div className="hidden sm:flex items-center gap-2 mr-2">
               <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">{pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}</span>
            </div>
          )}
          <div className={`transition-all duration-500 p-1 rounded-lg ${isExpanded ? 'rotate-180 bg-red-600 text-white shadow-md shadow-red-200' : 'rotate-0 bg-red-50 text-red-600'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Inklapbaar Gedeelte */}
      {isExpanded && (
        <div className="animate-in slide-in-from-top-4 duration-500">
          {/* Kaart Afbeelding - Smaller, inset and rounded */}
          <div className="px-4 pt-2">
            <div className="relative h-28 w-full bg-slate-200 rounded-xl overflow-hidden border border-slate-300 shadow-inner">
              <img 
                src={pin.mapImageUrl} 
                alt="Kaartweergave" 
                className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent pointer-events-none"></div>
            </div>
          </div>

          <div className="p-4">
            <div className="flex flex-col gap-3">
              
              <div className="flex items-start justify-between gap-3">
                {/* Adres Text Area */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mb-1">Adres</p>
                  <p className="text-xs text-slate-700 leading-relaxed font-bold" title={pin.address}>
                    {pin.address}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 shrink-0 pt-2">
                  <button 
                    onClick={handleNavigate}
                    title="Navigeer"
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-white rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 bg-slate-200/50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                  
                  <button 
                    onClick={handleShare}
                    title="Deel"
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 bg-slate-200/50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </button>

                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    title="Verwijder"
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-white rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 bg-slate-200/50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Notes Input Area */}
              <div className="w-full">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onBlur={handleNoteBlur}
                  placeholder="Voeg een notitie toe..."
                  rows={1}
                  className="w-full h-9 py-2 px-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300 transition-all resize-none text-slate-800 font-medium placeholder-slate-400 shadow-inner"
                />
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PinCard;
