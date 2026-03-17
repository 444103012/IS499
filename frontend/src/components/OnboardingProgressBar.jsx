import React from 'react';

const TOTAL_STEPS = 6;

const stepLabelsEn = [
  'Store Details',
  'Plan',
  'Theme',
  'Payment',
  'Shipping',
  'Review',
];

const stepLabelsAr = [
  'تفاصيل المتجر',
  'الخطة',
  'القالب',
  'الدفع',
  'الشحن',
  'المراجعة',
];

export default function OnboardingProgressBar({ currentStep, isRTL }) {
  const labels = isRTL ? stepLabelsAr : stepLabelsEn;

  return (
    <div className="w-full mb-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`flex justify-between items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const step = i + 1;
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0
                    ${isActive ? 'bg-storelaunch-green text-white ring-2 ring-storelaunch-green ring-offset-2' : ''}
                    ${isCompleted ? 'bg-storelaunch-green text-white' : ''}
                    ${!isActive && !isCompleted ? 'bg-gray-200 text-gray-500' : ''}
                  `}
                >
                  {isCompleted ? '✓' : step}
                </div>
                <span
                  className={`
                    mt-1 text-xs font-medium truncate w-full text-center
                    ${isActive ? 'text-storelaunch-green' : isCompleted ? 'text-gray-600' : 'text-gray-400'}
                  `}
                >
                  {labels[i]}
                </span>
              </div>
              {i < TOTAL_STEPS - 1 && (
                <div
                  className={`
                    flex-1 h-1 min-w-[8px] rounded transition-colors
                    ${step < currentStep ? 'bg-storelaunch-green' : 'bg-gray-200'}
                  `}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
