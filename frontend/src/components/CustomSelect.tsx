import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-800 text-[#0F172A] dark:text-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 hover:border-slate-350 dark:hover:border-slate-700 transition-all cursor-pointer text-left shadow-sm"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 text-slate-450 dark:text-gray-500 transition-transform duration-300 ${
            isOpen ? 'rotate-180 text-blue-550' : ''
          }`}
        />
      </button>

      {/* Options Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl z-50 overflow-hidden animate-dropdown-enter">
          <div className="max-h-48 overflow-y-auto py-1">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer block ${
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-750 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
