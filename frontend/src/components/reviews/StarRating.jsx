import React from 'react';

function Star({ fillPercent = 0, className = '' }) {
  const clamped = Math.max(0, Math.min(100, fillPercent));
  const clipId = `star-clip-${Math.random().toString(36).slice(2)}`;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={`${clamped}%`} height="100%" />
        </clipPath>
      </defs>
      <path
        d="M12 2.8l2.9 5.86 6.47.94-4.68 4.56 1.1 6.44L12 17.52 6.21 20.6l1.1-6.44L2.63 9.6l6.47-.94L12 2.8z"
        fill="currentColor"
        className="text-gray-200"
      />
      <path
        d="M12 2.8l2.9 5.86 6.47.94-4.68 4.56 1.1 6.44L12 17.52 6.21 20.6l1.1-6.44L2.63 9.6l6.47-.94L12 2.8z"
        fill="currentColor"
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
}

export default function StarRating({
  value = 0,
  count = 5,
  sizeClass = 'w-4 h-4',
  ariaLabel,
  accentColor = '#F59E0B',
}) {
  const numeric = Number(value) || 0;
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={ariaLabel || `Rating ${numeric} out of ${count}`}>
      {Array.from({ length: count }).map((_, idx) => {
        const fillPercent = Math.max(0, Math.min(1, numeric - idx)) * 100;
        return (
          <span key={idx} style={{ color: accentColor }}>
            <Star fillPercent={fillPercent} className={sizeClass} />
          </span>
        );
      })}
    </div>
  );
}
