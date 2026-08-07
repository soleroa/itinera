import { useEffect, useRef, useState } from 'react';
import { ChatInput } from './components/ChatInput';
import { MessageBubble } from './components/MessageBubble';
import { askAgent, AgentError } from './lib/agent-client';
import type { ChatMessage } from './types';

function makeId() {
  return crypto.randomUUID();
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string) => {
    const userMessage: ChatMessage = { id: makeId(), role: 'user', content: text };
    const pendingId = makeId();

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: pendingId, role: 'assistant', content: '', status: 'pending' },
    ]);
    setIsSending(true);

    try {
      const answer = await askAgent(text);
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingId ? { ...m, content: answer, status: undefined } : m)),
      );
    } catch (err) {
      const message = err instanceof AgentError ? err.message : 'No se pudo contactar al agente.';
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingId ? { ...m, content: message, status: 'error' } : m)),
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mx-auto flex h-svh max-w-2xl flex-col bg-neutral-100 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Itinera</h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Contale a tu agente de viajes qué tenés en mente
        </p>
      </header>

      <main className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-neutral-400 dark:text-neutral-600">
            <p className="text-sm">Todavía no hay mensajes.</p>
            <p className="text-xs">Probá con "quiero 5 días en Bariloche con 300 mil pesos"</p>
          </div>
        )}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </main>

      <ChatInput disabled={isSending} onSend={handleSend} />
    </div>
  );
}
