/**
 * reportWebVitals.js - Performance Metrics (Optional)
 * -----------------------------------------------------
 * If you pass a function to reportWebVitals (e.g. reportWebVitals(console.log) in index.js),
 * it will report Core Web Vitals (CLS, FID, FCP, LCP, TTFB) for your app. Useful for
 * monitoring real-user performance. By default nothing is passed, so no reporting happens.
 */

const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
