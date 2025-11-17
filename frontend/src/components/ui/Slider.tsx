import React, { useState } from 'react';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value));
  };

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
        {/* Track */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          {/* Progress */}
          <div
            className="h-full gradient-primary transition-all duration-200"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Input (invisible but functional) */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          disabled={disabled}
          className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        {/* Thumb */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-4 border-primary-500 rounded-full shadow-medium transition-all duration-200 ${
            isDragging ? 'scale-125' : 'scale-100'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          style={{ left: `calc(${percentage}% - 12px)` }}
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
