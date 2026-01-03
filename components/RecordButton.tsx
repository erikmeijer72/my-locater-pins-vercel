
import React from 'react';

interface RecordButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

const RecordButton: React.FC<RecordButtonProps> = ({ onClick, isLoading }) => {
  return (
    <div className="fixed bottom-8 left-8 z-50 flex flex-col items-center">
      <button
        onClick={onClick}
        disabled={isLoading}
        aria-label="Record Location"
        className={`
          group relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20
          bg-red-600 
          /* Shadow vector (10,10) rotated 45deg becomes (0, 14.14) on screen (Downwards) */
          shadow-[6px_6px_20px_rgba(220,38,38,0.5)] active:shadow-[2px_2px_10px_rgba(220,38,38,0.4)]
          transition-all duration-300 hover:scale-110 active:scale-95 
          disabled:opacity-50 disabled:cursor-not-allowed
          border-[3px] sm:border-4 border-white/50
          /* TL, TR, BR(Sharp), BL - Points Down when rotated 45deg */
          rounded-[50%_50%_0_50%] rotate-45 
        `}
      >
        {/* Pulsing ring - matches pin shape */}
        {!isLoading && (
          <span className="absolute inset-0 rounded-[50%_50%_0_50%] bg-white animate-ping opacity-20 scale-125"></span>
        )}
        
        {/* Content Wrapper - Counter Rotate to keep content upright */}
        <div className="-rotate-45 flex items-center justify-center">
          {isLoading ? (
            <svg className="animate-spin h-6 w-6 sm:h-8 sm:w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            /* The "hole" of the pin */
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full shadow-inner"></div>
          )}
        </div>
      </button>
    </div>
  );
};

export default RecordButton;
