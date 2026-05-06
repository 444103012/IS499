import React, { useState } from 'react';
import StarRating from './StarRating';

export default function ReviewCard({
  review,
  isRTL,
  accentColor,
  textColor,
  backgroundColor = '#fff',
  borderColor = '#E5E7EB',
}) {
  const [expanded, setExpanded] = useState(false);
  const comment = String(review?.comment || '').trim();
  const longComment = comment.length > 180;

  return (
    <article
      className={`rounded-2xl border shadow-sm p-5 flex flex-col gap-3 ${isRTL ? 'text-right' : 'text-left'}`}
      style={{ backgroundColor, borderColor }}
    >
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <span className="text-3xl leading-none opacity-25" style={{ color: accentColor }} aria-hidden="true">"</span>
        <StarRating
          value={Number(review?.rating || 0)}
          accentColor={accentColor}
          sizeClass="w-4 h-4"
          ariaLabel={isRTL ? `تقييم ${review?.rating || 0} من 5` : `Rating ${review?.rating || 0} out of 5`}
        />
      </div>
      <p
        className={`text-sm leading-6 ${!expanded && longComment ? 'line-clamp-4' : ''}`}
        style={{ color: textColor }}
      >
        {comment || (isRTL ? 'لا يوجد تعليق.' : 'No comment provided.')}
      </p>
      {longComment ? (
        <button
          type="button"
          className={`text-xs font-medium ${isRTL ? 'self-end' : 'self-start'}`}
          style={{ color: accentColor }}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (isRTL ? 'عرض أقل' : 'Read less') : (isRTL ? 'عرض المزيد' : 'Read more')}
        </button>
      ) : null}
      <div className={`pt-1 flex items-center justify-between gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
          <span
            className="w-8 h-8 rounded-full border border-gray-200 bg-gray-50 inline-flex items-center justify-center text-gray-500"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M12 12a4.2 4.2 0 100-8.4 4.2 4.2 0 000 8.4zm0 2.1c-3.3 0-6 2.1-6 4.7 0 .4.3.7.7.7h10.6c.4 0 .7-.3.7-.7 0-2.6-2.7-4.7-6-4.7z" />
            </svg>
          </span>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm font-semibold" style={{ color: textColor }}>{review?.reviewer_name || (isRTL ? 'عميل موثق' : 'Verified customer')}</p>
            <p className="text-xs text-gray-500">
              {review?.product_name || (review?.product_id == null ? (isRTL ? 'تقييم المتجر' : 'Store review') : (isRTL ? 'تقييم منتج' : 'Product review'))}
            </p>
          </div>
        </div>
        {review?.review_date ? (
          <p className="text-xs text-gray-500 shrink-0">
            {new Date(review.review_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
          </p>
        ) : null}
      </div>
    </article>
  );
}
