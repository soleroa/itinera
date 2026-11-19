import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { TripRequest } from '../types';
import { formatDateRange, plural } from '../lib/format';
import { ArrowRightIcon, MinusIcon, PlusIcon } from './Icons';
import { Eyebrow } from './Layout';

type Draft = {
  destination: string;
  origin: string;
  departure: string;
  returnDate: string;
  travelers: number;
  maxBudget: string;
};

const STEPS = ['Destination', 'Origin', 'Dates', 'Details'] as const;
const DESTINATION_IDEAS = ['Bariloche', 'Mendoza', 'Salta', 'Ushuaia', 'Iguazú'];
const ORIGIN_IDEAS = ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza'];

const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

const fieldClass =
  'w-full rounded-xl border border-line bg-paper px-4 py-3.5 text-lg text-ink outline-none focus-visible:outline-none transition placeholder:text-ink-3/70 focus:border-terracotta focus:ring-4 focus:ring-terracotta/15';

export function TripWizard({ onSubmit }: { onSubmit: (trip: TripRequest) => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    destination: '',
    origin: '',
    departure: '',
    returnDate: '',
    travelers: 2,
    maxBudget: '',
  });

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const isLast = step === STEPS.length - 1;
  const canContinue = [
    draft.destination.trim() !== '',
    draft.origin.trim() !== '',
    draft.departure !== '' && draft.returnDate !== '' && draft.returnDate > draft.departure,
    draft.maxBudget === '' || Number(draft.maxBudget) > 0,
  ][step];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canContinue) return;
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    onSubmit({
      destination: draft.destination.trim(),
      origin: draft.origin.trim(),
      departure: draft.departure,
      returnDate: draft.returnDate,
      travelers: draft.travelers,
      maxBudget: draft.maxBudget ? Number(draft.maxBudget) : null,
    });
  };

  // What the traveler has already told us, shown as a running recap above the question.
  const recap = [
    step > 0 && draft.destination.trim(),
    step > 1 && `from ${draft.origin.trim()}`,
    step > 2 && formatDateRange(draft.departure, draft.returnDate),
  ].filter(Boolean) as string[];

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 rounded-3xl border border-line bg-card p-6 shadow-[0_1px_0_var(--line),0_24px_48px_-28px_rgba(35,29,22,0.35)] sm:p-8"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Eyebrow>
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </Eyebrow>
        </div>
        <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
          {STEPS.map((name, i) => (
            <div
              key={name}
              className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                i <= step ? 'bg-terracotta' : 'bg-line'
              }`}
            />
          ))}
        </div>
        {recap.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {recap.map((item) => (
              <span
                key={item}
                className="rounded-full bg-paper-2 px-3 py-1 text-sm text-ink-2"
              >
                {item}
              </span>
            ))}
          </div>
        )}
      </div>

      <div key={step} className="animate-fade-up flex flex-col gap-5">
        {step === 0 && (
          <Question title="Where do you want to go?" hint="A city or destination in Argentina or beyond.">
            <input
              autoFocus
              value={draft.destination}
              onChange={(e) => update('destination', e.target.value)}
              placeholder="Bariloche"
              aria-label="Destination"
              className={fieldClass}
            />
            <Ideas items={DESTINATION_IDEAS} onPick={(v) => update('destination', v)} />
          </Question>
        )}

        {step === 1 && (
          <Question
            title={`Where are you flying to ${draft.destination.trim()} from?`}
            hint="The city your flight departs from."
          >
            <input
              autoFocus
              value={draft.origin}
              onChange={(e) => update('origin', e.target.value)}
              placeholder="Buenos Aires"
              aria-label="Origin"
              className={fieldClass}
            />
            <Ideas items={ORIGIN_IDEAS} onPick={(v) => update('origin', v)} />
          </Question>
        )}

        {step === 2 && (
          <Question title="When are you traveling?" hint="Pick your departure and return dates.">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-2">
                Departure
                <input
                  type="date"
                  autoFocus
                  min={today}
                  value={draft.departure}
                  onChange={(e) => update('departure', e.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-2">
                Return
                <input
                  type="date"
                  min={draft.departure || today}
                  value={draft.returnDate}
                  onChange={(e) => update('returnDate', e.target.value)}
                  className={fieldClass}
                />
              </label>
            </div>
            {draft.departure !== '' && draft.returnDate !== '' && !canContinue && (
              <p className="text-sm text-terracotta">The return must be after the departure.</p>
            )}
          </Question>
        )}

        {step === 3 && (
          <Question title="Last details" hint="Your budget is optional, but it is what we check prices against.">
            <div className="flex items-center justify-between rounded-xl border border-line bg-paper px-4 py-3">
              <span className="font-medium text-ink-2">Travelers</span>
              <div className="flex items-center gap-4">
                <StepperButton
                  label="Fewer travelers"
                  disabled={draft.travelers <= 1}
                  onClick={() => update('travelers', draft.travelers - 1)}
                >
                  <MinusIcon width={18} height={18} />
                </StepperButton>
                <span className="w-6 text-center font-display text-2xl font-semibold" aria-live="polite">
                  {draft.travelers}
                </span>
                <StepperButton
                  label="More travelers"
                  disabled={draft.travelers >= 9}
                  onClick={() => update('travelers', draft.travelers + 1)}
                >
                  <PlusIcon width={18} height={18} />
                </StepperButton>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="max-budget" className="text-sm font-medium text-ink-2">
                Maximum budget for flight + accommodation
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-ink-3">
                  $
                </span>
                <input
                  id="max-budget"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  autoFocus
                  value={draft.maxBudget}
                  onChange={(e) => update('maxBudget', e.target.value)}
                  placeholder="2000"
                  className={`${fieldClass} pl-9 pr-16`}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-3">
                  USD
                </span>
              </div>
              {!canContinue ? (
                <p className="text-sm text-terracotta">The budget must be greater than zero.</p>
              ) : (
                <p className="text-sm text-ink-3">
                  For {plural(draft.travelers, 'traveler')}, in total. Food and local transport are not
                  included.
                </p>
              )}
            </div>
          </Question>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="rounded-xl px-4 py-3 font-medium text-ink-2 transition hover:bg-paper-2"
          >
            Back
          </button>
        )}
        <button
          type="submit"
          disabled={!canContinue}
          className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-terracotta px-6 py-3.5 text-lg font-semibold text-on-accent transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLast ? 'Plan my trip' : 'Continue'}
          <ArrowRightIcon className="transition group-hover:translate-x-0.5" />
        </button>
      </div>
    </form>
  );
}

function Question({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight">{title}</h2>
        <p className="text-ink-2">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function Ideas({ items, onPick }: { items: string[]; onPick: (value: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-ink-3">Try</span>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPick(item)}
          className="rounded-full border border-line px-3 py-1 text-sm text-ink-2 transition hover:border-terracotta hover:text-terracotta"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function StepperButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-2 transition hover:border-terracotta hover:text-terracotta disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink-2"
    >
      {children}
    </button>
  );
}
