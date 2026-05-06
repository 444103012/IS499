import { getNormalizedStoreBranding } from './storeBranding';

describe('getNormalizedStoreBranding', () => {
  test('returns defaults for malformed branding input', () => {
    const result = getNormalizedStoreBranding('modern', null);
    expect(result.productLayout).toBe('grid-classic');
    expect(result.topBar).toBe('#0F172A');
    expect(result.buttons).toBe('#14B8A6');
    expect(Array.isArray(result.brandColors)).toBe(true);
    expect(result.primaryColor).toBe('#14B8A6');
  });

  test('maps legacy and saved layout values consistently', () => {
    expect(getNormalizedStoreBranding('default', { productLayout: 'list' }).productLayout).toBe('compact-list');
    expect(getNormalizedStoreBranding('default', { productLayout: 'compact-list' }).productLayout).toBe('compact-list');
    expect(getNormalizedStoreBranding('default', { productLayout: 'grid' }).productLayout).toBe('grid-classic');
    expect(getNormalizedStoreBranding('default', { productLayout: 'wide' }).productLayout).toBe('grid-classic');
  });

  test('merges only valid layer colors', () => {
    const result = getNormalizedStoreBranding('default', {
      layerColors: {
        buttons: '#112233',
        background: 'not-a-color',
      },
    });
    expect(result.buttons).toBe('#112233');
    expect(result.background).toBe('#F9FAFB');
  });
});

