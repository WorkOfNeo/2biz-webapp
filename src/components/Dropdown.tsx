import React, { useState, useRef, useEffect } from 'react';

interface DropdownProps {
  seasonOptions: string[];
  seasonFilter: string;
  onSeasonChange: (season: string) => void;
}

const Dropdown: React.FC<DropdownProps> = ({
  seasonOptions,
  seasonFilter,
  onSeasonChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  const handleSeasonSelect = (season: string) => {
    onSeasonChange(season);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block w-full max-w-xs" ref={dropdownRef}>
      <button
        onClick={handleToggleDropdown}
        className="w-full bg-white border border-gray-300 p-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {seasonFilter || 'Select Season'}
        <span className="float-right">
          <svg
            className={`h-4 w-4 inline-block transform transition-transform ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M19 9l-7 7-7-7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 shadow-lg max-h-60 overflow-auto">
          {seasonOptions.map((season) => (
            <div
              key={season}
              onClick={() => handleSeasonSelect(season)}
              className={`p-2 cursor-pointer hover:bg-gray-100 ${
                seasonFilter === season ? 'bg-gray-200' : ''
              }`}
            >
              {season}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;