
import React, { useRef, useState, useEffect } from 'react';
import { PinData } from '../types';

interface HeaderProps {
  isAllCollapsed: boolean;
  onToggleAll: () => void;
  pins: PinData[];
  onImport: (pins: PinData[]) => void;
  onDeleteAll: () => void;
}

const Header: React.FC<HeaderProps> = ({ isAllCollapsed, onToggleAll, pins, onImport, onDeleteAll }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If modal is open, ignore clicks outside the menu (modal has its own backdrop)
      if (showConfirm) return;

      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showConfirm]);

  const handleExport = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    
    if (pins.length === 0) {
      alert("Geen gegevens om te exporteren.");
      return;
    }
    const dataStr = JSON.stringify(pins, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const exportFileDefaultName = `Locaties+${year}-${month}-${day}+${hours}-${minutes}-${seconds}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    // Direct click is more reliable than setTimeout for file inputs
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);
        
        if (Array.isArray(importedData)) {
          onImport(importedData);
          alert(`${importedData.length} locaties succesvol geïmporteerd!`);
        } else {
          alert("Ongeldig bestandsformaat. Verwacht een lijst met locaties.");
        }
      } catch (err) {
        alert("Fout bij het lezen van het bestand. Zorg ervoor dat het een geldig JSON-bestand is.");
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be picked again
    event.target.value = '';
  };

  const handleDeleteAllClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    
    if (pins.length === 0) {
      alert("Er zijn geen pins om te verwijderen.");
      return;
    }
    
    // Show custom modal instead of native confirm
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    onDeleteAll();
    setShowConfirm(false);
  };

  return (
    <header className="sticky top-0 z-30 w-full px-6 py-6 flex items-center justify-between bg-white/80 backdrop-blur-2xl border-b border-slate-200/60 shadow-lg">
      <div className="flex flex-col">
        <h1 className="header-font text-3xl text-slate-900 leading-none uppercase italic tracking-tighter">
          Locatie<span className="text-red-600">.</span>
        </h1>
        <div className="flex items-center gap-1.5 mt-2">
           <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.5)]"></span>
           <span className="text-[10px] uppercase tracking-[0.25em] font-black text-slate-400 flex items-center">
             Volgsysteem 
             <span className="mx-1.5 text-slate-300 font-normal">|</span>
             <span className="text-slate-600">{pins.length} {pins.length === 1 ? 'Pin' : 'Pins'}</span>
           </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 relative">
        {/* Toggle Collapse Button */}
        <button 
          onClick={onToggleAll}
          className="p-3 bg-slate-100 hover:bg-slate-200 active:scale-90 transition-all rounded-2xl border border-slate-200 text-slate-600 group shadow-sm hover:shadow-md cursor-pointer"
          title={isAllCollapsed ? "Alles uitklappen" : "Alles inklappen"}
          type="button"
        >
          {isAllCollapsed ? (
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          ) : (
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>

        {/* Menu Button */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`p-3 bg-slate-100 hover:bg-slate-200 active:scale-90 transition-all rounded-2xl border border-slate-200 text-slate-600 shadow-sm hover:shadow-md cursor-pointer ${isMenuOpen ? 'bg-slate-200' : ''}`}
            title="Menu"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
              <div className="py-1">
                <button
                  onClick={handleImportClick}
                  className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors cursor-pointer"
                  type="button"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="font-semibold">Importeer data</span>
                </button>
                
                <button
                  onClick={handleExport}
                  className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors cursor-pointer"
                  type="button"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="font-semibold">Exporteer data</span>
                </button>

                <div className="h-px bg-slate-100 my-1"></div>

                <button
                  onClick={handleDeleteAllClick}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors cursor-pointer"
                  type="button"
                >
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="font-bold">Verwijder alles</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Hidden file input placed outside conditional rendering */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        className="hidden" 
      />

      {/* Custom Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 h-full w-full">
          {/* Backdrop with click handler */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowConfirm(false)}
          ></div>
          
          {/* Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-100 animate-in zoom-in-95 fade-in duration-200 mx-auto my-auto">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">Alles verwijderen?</h3>
              <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
                Je staat op het punt om <span className="text-slate-900 font-bold">{pins.length}</span> opgeslagen locaties te wissen. Dit kan niet ongedaan worden gemaakt.
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Annuleer
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all active:scale-95"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
