import type { AgentResponse } from '../types';
const API_URL = import.meta.env.VITE_API_URL ?? '/agent';

export class AgentError extends Error {}

export async function askAgent(message: string, signal?: AbortSignal): Promise<AgentResponse> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!res.ok) {
    throw new AgentError(`El backend respondió ${res.status}`);
  }

  const data = (await res.json()) as Partial<AgentResponse>;
  if (!data.answer) {
    throw new AgentError('El backend no devolvió una respuesta.');
  }
  return {
    answer: data.answer,
    flights: data.flights ?? [],
    accommodations: data.accommodations ?? [],
  };
}
