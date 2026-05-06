import React from 'react';
import { act, render, screen } from '@testing-library/react';
import useDebouncedValue from './useDebouncedValue';

const DebounceProbe = ({ value }) => {
  const debounced = useDebouncedValue(value, 300);
  return <div>{debounced}</div>;
};

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('updates value only after delay', () => {
    const { rerender } = render(<DebounceProbe value="a" />);
    expect(screen.getByText('a')).toBeInTheDocument();

    rerender(<DebounceProbe value="ab" />);
    expect(screen.getByText('a')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getByText('ab')).toBeInTheDocument();
  });
});
