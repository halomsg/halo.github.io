import React from 'react';

interface AvatarSelectorProps {
  selected: string;
  onSelect: (avatar: string) => void;
  label: string;
}

const EMOJIS = ['👽', '🦊', '🐱', '🐶', '🦁', '🐯', '🦄', '🐼', '🐨', '🐸', '💀', '🤖', '👻', '🎃', '💩', '🤡'];

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({ selected, onSelect, label }) => {
  return (
    <div className="w-full mb-4">
      <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">
        {label}
      </label>
      <div className="grid grid-cols-8 gap-2 p-3 bg-slate-800/50 border border-slate-700 rounded-xl">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className={`
              w-8 h-8 flex items-center justify-center text-xl rounded-lg transition-all duration-200
              ${selected === emoji 
                ? 'bg-halo-600 shadow-lg shadow-halo-500/30 scale-110' 
                : 'hover:bg-slate-700 hover:scale-105 opacity-70 hover:opacity-100'}
            `}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};