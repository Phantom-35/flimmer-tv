import { render } from 'preact';
import { App, boot } from './app/App';
import { startReminderScheduler } from './app/lib/reminders';
import { now } from './app/store/data';
import { applyDocumentSettings } from './app/store/settings';
import { pruneWatchlist } from './app/store/watchlist';
import './styles.css';

applyDocumentSettings();
pruneWatchlist(now.value);
boot();
startReminderScheduler();
render(<App />, document.getElementById('app')!);
