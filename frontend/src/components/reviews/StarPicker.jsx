import React from 'react';

export default function StarPicker({ value = 0, onChange, isRTL, accentColor = '#F59E0B', label, disabled = false }) {
  const current = Number(value) || 0;
  const move = (next) => {
    if (typeof onChange === 'function') onChange(Math.max(1, Math.min(5, next)));
  };

  return (
    <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
      {label ? <p className="text-xs text-gray-600 mb-1">{label}</p> : null}
      <div
        role="radiogroup"
        aria-label={label || (isRTL ? 'اختر التقييم' : 'Select rating')}
        className={`inline-flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            move(current + (isRTL ? -1 : 1));
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            move(current + (isRTL ? 1 : -1));
          } else if (e.key === 'Home') {
            e.preventDefault();
            move(1);
          } else if (e.key === 'End') {
            e.preventDefault();
            move(5);
          }
        }}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const active = current >= star;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={current === star}
              aria-label={isRTL ? `${star} من 5` : `${star} out of 5`}
              disabled={disabled}
              onClick={() => move(star)}
              className={`p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-storelaunch-green ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
              style={{ color: active ? accentColor : '#D1D5DB' }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                <path
                  d="M12 2.8l2.9 5.86 6.47.94-4.68 4.56 1.1 6.44L12 17.52 6.21 20.6l1.1-6.44L2.63 9.6l6.47-.94L12 2.8z"
                  fill="currentColor"
                />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
