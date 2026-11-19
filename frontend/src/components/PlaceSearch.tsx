import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { searchCities } from '../lib/places-client';
import type { CitySuggestion } from '../lib/places-client';
import { PinIcon } from './Icons';

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

/**
 * A city search box with suggestions from Google Places, like the field of a flight search.
 * It is still a free-text field: if the backend or the suggestions are unavailable, whatever the
 * traveler types is used as is.
 */
export function PlaceSearch({
  id,
  value,
  onChange,
  placeholder,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  // The last value chosen from the list: no need to search again for it.
  const picked = useRef<string | null>(null);

  useEffect(() => {
    const query = value.trim();
    if (!open || query.length < MIN_CHARS || query === picked.current) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      searchCities(query, controller.signal)
        .then((found) => {
          setSuggestions(found);
          setActive(-1);
        })
        .catch(() => !controller.signal.aborted && setSuggestions([]))
        .finally(() => !controller.signal.aborted && setLoading(false));
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, open]);

  const choose = (city: CitySuggestion) => {
    picked.current = city.name;
    onChange(city.name);
    setOpen(false);
    setSuggestions([]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && open && active >= 0) {
      e.preventDefault();
      choose(suggestions[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && suggestions.length > 0;

  return (
    <div className="relative">
      <input
        id={id}
        value={value}
        onChange={(e) => {
          picked.current = null;
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        className={className}
      />
      {loading && (
        <span className="label absolute right-0 top-3 normal-case tracking-normal" aria-hidden="true">
          searching…
        </span>
      )}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="hard-shadow absolute inset-x-0 top-full z-20 mt-2 border border-ink bg-card"
        >
          {suggestions.map((city, i) => (
            <li
              key={city.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: the input's blur would close the list before a click lands.
              onMouseDown={(e) => {
                e.preventDefault();
                choose(city);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 ${
                i === active ? 'bg-ink text-paper' : ''
              }`}
            >
              <PinIcon width={16} height={16} className={i === active ? 'text-paper' : 'text-accent'} />
              <span className="min-w-0">
                <span className="block truncate font-display text-xl font-semibold leading-tight tracking-tight">
                  {city.name}
                </span>
                <span className={`block truncate font-mono text-xs ${i === active ? 'text-paper/70' : 'text-ink-3'}`}>
                  {city.detail}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
