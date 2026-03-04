/**
 * App.test.js - Basic App Test (Jest + React Testing Library)
 * -----------------------------------------------------------
 * Simple smoke test: renders the App component and checks that something is on the page.
 * You can add more tests here or in other *.test.js files. Run with: npm test.
 */
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
