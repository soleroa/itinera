import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { TripRequest } from '../types';

type Draft = {
  destination: string;
  origin: string;
  departure: string;
  returnDate: string;
  travelers: number;
  maxBudget: string;
};

const STEPS = ['destination', 'origin', 'dates', 'details'] as const;

const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

const inputClass =
  'w-full rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-lg text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-emerald-500/25';

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

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl flex-col gap-8">
      <div className="flex items-center gap-2" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((name, i) => (
          <div
            key={name}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i <= step ? 'bg-emerald-500' : 'bg-neutral-200 dark:bg-neutral-800'
            }`}
          />
        ))}
      </div>

      {step === 0 && (
        <Question title="Where do you want to go?" hint="A city or destination, e.g. Bariloche">
          <input
            autoFocus
            value={draft.destination}
            onChange={(e) => update('destination', e.target.value)}
            placeholder="Bariloche"
            className={inputClass}
          />
        </Question>
      )}

      {step === 1 && (
        <Question
          title={`Where are you flying to ${draft.destination.trim()} from?`}
          hint="The city your flight departs from"
        >
          <input
            autoFocus
            value={draft.origin}
            onChange={(e) => update('origin', e.target.value)}
            placeholder="Buenos Aires"
            className={inputClass}
          />
        </Question>
      )}

      {step === 2 && (
        <Question title="When are you traveling?" hint="Departure and return dates">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
              Departure
              <input
                type="date"
                autoFocus
                min={today}
                value={draft.departure}
                onChange={(e) => update('departure', e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
              Return
              <input
                type="date"
                min={draft.departure || today}
                value={draft.returnDate}
                onChange={(e) => update('returnDate', e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        </Question>
      )}

      {step === 3 && (
        <Question title="Last details" hint="The budget is optional">
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-5 py-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
              <span className="text-neutral-700 dark:text-neutral-300">Travelers</span>
              <div className="flex items-center gap-4">
                <StepperButton
                  label="Fewer travelers"
                  disabled={draft.travelers <= 1}
                  onClick={() => update('travelers', draft.travelers - 1)}
                >
                  −
                </StepperButton>
                <span className="w-6 text-center text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {draft.travelers}
                </span>
                <StepperButton
                  label="More travelers"
                  disabled={draft.travelers >= 9}
                  onClick={() => update('travelers', draft.travelers + 1)}
                >
                  +
                </StepperButton>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="max-budget" className="text-sm text-neutral-500 dark:text-neutral-400">
                Maximum total budget in USD (flight + accommodation)
              </label>
              <input
                id="max-budget"
                type="number"
                inputMode="numeric"
                min={1}
                autoFocus
                value={draft.maxBudget}
                onChange={(e) => update('maxBudget', e.target.value)}
                placeholder="e.g. 2000"
                className={inputClass}
              />
              {!canContinue && (
                <span className="text-sm text-red-600 dark:text-red-400">
                  The budget must be greater than zero.
                </span>
              )}
            </div>
          </div>
        </Question>
      )}

      <div className="flex items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="rounded-2xl px-5 py-3.5 text-neutral-600 transition hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Back
          </button>
        )}
        <button
          type="submit"
          disabled={!canContinue}
          className="flex-1 rounded-2xl bg-emerald-600 px-6 py-3.5 text-lg font-medium text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {isLast ? 'Plan my trip' : 'Continue'}
        </button>
      </div>
    </form>
  );
}

function Question({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          {title}
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400">{hint}</p>
      </div>
      {children}
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
      className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-xl text-neutral-700 transition hover:bg-emerald-100 hover:text-emerald-700 disabled:opacity-30 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-emerald-900/40"
    >
      {children}
    </button>
  );
}
