import React, { useState, useRef, useEffect } from 'react';

interface SliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  label?: string;
  formatLabel?: (value: number) => string;
  step?: number;
  disabled?: boolean;
  className?: string;
}

const Slider: React.FC<SliderProps> = ({
  min,
  max,
  value,
  onChange,
  label,
  formatLabel,
  step = 1,
  disabled = false,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value));
  };

  const getValueFromPosition = (clientX: number): number => {
    if (!trackRef.current) return value;
    
    const rect = trackRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const rawValue = min + percentage * (max - min);
    const steppedValue = Math.round(rawValue / step) * step;
    return Math.max(min, Math.min(max, steppedValue));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    
    if (trackRef.current) {
      const newValue = getValueFromPosition(e.clientX);
      onChange(newValue);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setIsDragging(true);
    
    if (trackRef.current && e.touches[0]) {
      const newValue = getValueFromPosition(e.touches[0].clientX);
      onChange(newValue);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !trackRef.current) return;
      const newValue = getValueFromPosition(e.clientX);
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !trackRef.current || !e.touches[0]) return;
      e.preventDefault();
      const newValue = getValueFromPosition(e.touches[0].clientX);
      onChange(newValue);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, min, max, step, onChange]);

  const percentage = ((value - min) / (max - min)) * 100;
  const displayValue = formatLabel ? formatLabel(value) : value;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-4">
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
          <span className="text-2xl font-bold text-primary-600">
            {displayValue}
          </span>
        </div>
      )}

      <div className="relative">
        {/* Track - clickable */}
        <div
          ref={trackRef}
          className="h-2 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Progress */}
          <div
            className="h-full gradient-primary transition-all duration-200"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Input (invisible but functional for keyboard navigation) */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer disabled:cursor-not-allowed pointer-events-none"
          aria-label={label}
        />

        {/* Thumb - draggable */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-4 border-primary-500 rounded-full shadow-medium transition-all duration-200 z-10 ${
            isDragging ? 'scale-125 cursor-grabbing' : 'scale-100 cursor-grab'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ left: `calc(${percentage}% - 12px)` }}
          onMouseDown={(e) => {
            if (disabled) return;
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
          }}
          onTouchStart={(e) => {
            if (disabled) return;
            e.stopPropagation();
            setIsDragging(true);
          }}
        />
      </div>

      {/* Min/Max labels */}
      <div className="flex justify-between mt-2 text-sm text-gray-500">
        <span>{formatLabel ? formatLabel(min) : min}</span>
        <span>{formatLabel ? formatLabel(max) : max}</span>
      </div>
    </div>
  );
};

export default Slider;
