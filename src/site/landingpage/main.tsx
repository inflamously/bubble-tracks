// The landing page's one script: puts the track card into #track-card, in place of the static markup index.html ships there.
import { createRoot } from 'react-dom/client';
import { TrackCard } from './track-card/view.js';

const card = document.getElementById('track-card');
if (card) createRoot(card).render(<TrackCard />);
