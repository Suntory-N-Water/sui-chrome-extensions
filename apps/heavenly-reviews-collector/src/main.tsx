import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@sui-chrome-extensions/ui/styles';
import ReviewCollector from './components/ReviewCollector';

// biome-ignore lint/style/noNonNullAssertion: The root element is guaranteed to exist.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReviewCollector />
  </StrictMode>,
);
