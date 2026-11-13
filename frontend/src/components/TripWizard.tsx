import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { TripRequest } from '../types';

type Draft = {
  destino: string;
  origen: string;
  salida: string;
  vuelta: string;
  personas: number;
  presupuestoMin: string;
  presupuestoMax: string;
};

const STEPS = ['destino', 'origen', 'fechas', 'detalles'] as const;

const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD en hora local

const inputClass =
  'w-full rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-lg text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-emerald-500/25';

export function TripWizard({ onSubmit }: { onSubmit: (trip: TripRequest) => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    destino: '',
    origen: '',
    salida: '',
    vuelta: '',
    personas: 2,
    presupuestoMin: '',
    presupuestoMax: '',
  });

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const isLast = step === STEPS.length - 1;
  const canContinue = [
    draft.destino.trim() !== '',
    draft.origen.trim() !== '',
    draft.salida !== '' && draft.vuelta !== '' && draft.vuelta >= draft.salida,
    draft.presupuestoMin === '' ||
      draft.presupuestoMax === '' ||
      Number(draft.presupuestoMin) <= Number(draft.presupuestoMax),
  ][step];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canContinue) return;
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    onSubmit({
      destino: draft.destino.trim(),
      origen: draft.origen.trim(),
      salida: draft.salida,
      vuelta: draft.vuelta,
      personas: draft.personas,
      presupuestoMin: draft.presupuestoMin ? Number(draft.presupuestoMin) : null,
      presupuestoMax: draft.presupuestoMax ? Number(draft.presupuestoMax) : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl flex-col gap-8">
      <div className="flex items-center gap-2" aria-label={`Paso ${step + 1} de ${STEPS.length}`}>
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
        <Question title="¿A dónde querés viajar?" hint="Una ciudad o un destino, ej: Bariloche">
          <input
            autoFocus
            value={draft.destino}
            onChange={(e) => update('destino', e.target.value)}
            placeholder="Bariloche"
            className={inputClass}
          />
        </Question>
      )}

      {step === 1 && (
        <Question
          title={`¿Desde dónde salís hacia ${draft.destino.trim()}?`}
          hint="La ciudad de donde parte el vuelo"
        >
          <input
            autoFocus
            value={draft.origen}
            onChange={(e) => update('origen', e.target.value)}
            placeholder="Buenos Aires"
            className={inputClass}
          />
        </Question>
      )}

      {step === 2 && (
        <Question title="¿Cuándo viajás?" hint="Fecha de ida y de vuelta">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
              Ida
              <input
                type="date"
                autoFocus
                min={today}
                value={draft.salida}
                onChange={(e) => update('salida', e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
              Vuelta
              <input
                type="date"
                min={draft.salida || today}
                value={draft.vuelta}
                onChange={(e) => update('vuelta', e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        </Question>
      )}

      {step === 3 && (
        <Question title="Últimos detalles" hint="El presupuesto es opcional">
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-5 py-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
              <span className="text-neutral-700 dark:text-neutral-300">Personas</span>
              <div className="flex items-center gap-4">
                <StepperButton
                  label="Menos personas"
                  disabled={draft.personas <= 1}
                  onClick={() => update('personas', draft.personas - 1)}
                >
                  −
                </StepperButton>
                <span className="w-6 text-center text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {draft.personas}
                </span>
                <StepperButton
                  label="Más personas"
                  disabled={draft.personas >= 9}
                  onClick={() => update('personas', draft.personas + 1)}
                >
                  +
                </StepperButton>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                Rango de presupuesto total en pesos
              </span>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  autoFocus
                  aria-label="Presupuesto mínimo"
                  value={draft.presupuestoMin}
                  onChange={(e) => update('presupuestoMin', e.target.value)}
                  placeholder="Mínimo, ej: 200000"
                  className={inputClass}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  aria-label="Presupuesto máximo"
                  value={draft.presupuestoMax}
                  onChange={(e) => update('presupuestoMax', e.target.value)}
                  placeholder="Máximo, ej: 400000"
                  className={inputClass}
                />
              </div>
              {!canContinue && (
                <span className="text-sm text-red-600 dark:text-red-400">
                  El mínimo no puede ser mayor que el máximo.
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
            Atrás
          </button>
        )}
        <button
          type="submit"
          disabled={!canContinue}
          className="flex-1 rounded-2xl bg-emerald-600 px-6 py-3.5 text-lg font-medium text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {isLast ? 'Armar mi viaje' : 'Continuar'}
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
