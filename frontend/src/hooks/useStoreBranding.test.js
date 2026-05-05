import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import axiosInstance from '../api/axios';
import useStoreBranding from './useStoreBranding';

jest.mock('../api/axios', () => ({
  get: jest.fn(),
}));

function HookProbe({ slug }) {
  const { branding, status, storeInfo } = useStoreBranding(slug);
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="store-name">{storeInfo?.name || ''}</span>
      <span data-testid="buttons-color">{branding.buttons}</span>
    </div>
  );
}

describe('useStoreBranding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('loads store branding and updates global css vars', async () => {
    axiosInstance.get.mockResolvedValueOnce({
      data: {
        store: {
          name: 'Demo',
          status: 'Active',
          theme: 'default',
          branding: { layerColors: { buttons: '#2A9D8F', topBar: '#264653' } },
        },
      },
    });

    render(<HookProbe slug="demo-store" />);

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('ok');
    });
    expect(screen.getByTestId('store-name').textContent).toBe('Demo');
    expect(screen.getByTestId('buttons-color').textContent).toBe('#2A9D8F');
    expect(document.documentElement.style.getPropertyValue('--brand-green')).toBe('#2A9D8F');
    expect(document.documentElement.style.getPropertyValue('--brand-dark-blue-green')).toBe('#264653');
  });
});
