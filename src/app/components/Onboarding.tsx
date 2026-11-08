import { useEffect, useRef, useState } from 'preact/hooks';
import type { ChannelGroup } from '../../shared/types';
import { GROUP_LABEL } from '../views/ChannelsManageView';
import { channelPrefs, DEFAULT_FAVORITES, orderedChannels, setFavorites } from '../store/channels';
import { updateSettings } from '../store/settings';
import { onboardingOpen } from '../store/ui';
import { Icon } from './Icon';
import { Logo } from './Shell';

const STEPS = 3;

export function Onboarding() {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const open = onboardingOpen.value;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setStep(0);
      const current = channelPrefs.value.favorites;
      setPicked(new Set(current.length ? current : DEFAULT_FAVORITES));
      d.showModal();
    } else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-step-focus]')?.focus();
  }, [step, open]);

  const finish = (save: boolean) => {
    if (save) {
      // Reihenfolge der Auswahl gemäß Standard-Reihenfolge
      const ids = orderedChannels.value.map((c) => c.id).filter((id) => picked.has(id));
      setFavorites(ids);
    }
    updateSettings({ onboarded: true });
    onboardingOpen.value = false;
  };

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const groups = new Map<ChannelGroup, typeof orderedChannels.value>();
  for (const c of orderedChannels.value) {
    if (!groups.has(c.group)) groups.set(c.group, []);
    groups.get(c.group)!.push(c);
  }

  return (
    <dialog
      ref={ref}
      class="modal onboarding"
      aria-labelledby="ob-title"
      onCancel={(e) => {
        e.preventDefault();
        finish(false);
      }}
    >
      <div class="modal-inner">
        <div class="ob-top">
          <span class="ob-steps">
            <span class="sr-only">
              Schritt {step + 1} von {STEPS}
            </span>
            {Array.from({ length: STEPS }, (_, i) => (
              <span key={i} class={i <= step ? 'on' : ''} aria-hidden="true" />
            ))}
          </span>
          <button type="button" class="btn btn-ghost btn-small" onClick={() => finish(step > 0)}>
            Überspringen
          </button>
        </div>

        {step === 0 ? (
          <div class="ob-step">
            <Logo size={64} />
            <h2 id="ob-title" tabIndex={-1} data-step-focus>
              Willkommen bei Flimmer
            </h2>
            <p class="lead">Das TV-Programm, aufgeräumt: Was läuft jetzt, was kommt um 20:15 – in zwei Sekunden.</p>
            <ul class="ob-points">
              <li>
                <Icon name="shield" size={20} /> Keine Werbung, kein Tracking, kein Konto
              </li>
              <li>
                <Icon name="offline" size={20} /> Funktioniert auch offline
              </li>
              <li>
                <Icon name="bookmark" size={20} /> Merkliste mit Erinnerung und Kalender
              </li>
            </ul>
          </div>
        ) : step === 1 ? (
          <div class="ob-step ob-channels">
            <h2 id="ob-title" tabIndex={-1} data-step-focus>
              Welche Sender schaust du?
            </h2>
            <p class="muted">
              {picked.size} ausgewählt · Diese erscheinen als „Meine Sender“. Alles später änderbar.
            </p>
            <div class="ob-quick">
              <button type="button" class="btn btn-small btn-ghost" onClick={() => setPicked(new Set(DEFAULT_FAVORITES))}>
                Beliebte
              </button>
              <button type="button" class="btn btn-small btn-ghost" onClick={() => setPicked(new Set(orderedChannels.value.map((c) => c.id)))}>
                Alle
              </button>
              <button type="button" class="btn btn-small btn-ghost" onClick={() => setPicked(new Set())}>
                Keine
              </button>
            </div>
            <div class="ob-scroll">
              {[...groups.entries()].map(([g, list]) => (
                <fieldset key={g} class="ob-group">
                  <legend>{GROUP_LABEL[g]}</legend>
                  <div class="ob-grid">
                    {list.map((c) => (
                      <label key={c.id} class={`ob-ch${picked.has(c.id) ? ' on' : ''}`}>
                        <input type="checkbox" checked={picked.has(c.id)} onChange={() => toggle(c.id)} />
                        <span>{c.name}</span>
                        <Icon name="check" size={16} class="ob-check" />
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </div>
        ) : (
          <div class="ob-step">
            <h2 id="ob-title" tabIndex={-1} data-step-focus>
              Alles bereit
            </h2>
            <ul class="ob-points">
              <li>
                <Icon name="now" size={20} /> <span><strong>Jetzt</strong> zeigt, was läuft – mit Fortschritt und „Danach“.</span>
              </li>
              <li>
                <Icon name="grid" size={20} /> <span><strong>Programm</strong> ist das klassische Raster mit Tagesauswahl.</span>
              </li>
              <li>
                <Icon name="install" size={20} /> <span>Tipp: Installiere Flimmer über „Mehr“ – dann startet es wie eine App.</span>
              </li>
              <li class="only-desktop">
                <Icon name="keyboard" size={20} /> <span>Am PC: <kbd>?</kbd> zeigt alle Tastaturkürzel.</span>
              </li>
            </ul>
          </div>
        )}

        <div class="ob-actions">
          {step > 0 ? (
            <button type="button" class="btn btn-ghost" onClick={() => setStep(step - 1)}>
              Zurück
            </button>
          ) : (
            <span />
          )}
          {step < STEPS - 1 ? (
            <button type="button" class="btn btn-accent" onClick={() => setStep(step + 1)}>
              Weiter <Icon name="chevronRight" size={18} />
            </button>
          ) : (
            <button type="button" class="btn btn-accent" onClick={() => finish(true)}>
              Los geht’s
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
