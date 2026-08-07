import type { ChatMessage } from '../types';

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm sm:max-w-[70%] ${
          isUser
            ? 'bg-emerald-600 text-white'
            : message.status === 'error'
              ? 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900'
              : 'bg-white text-neutral-800 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:ring-neutral-700'
        }`}
      >
        {message.status === 'pending' ? (
          <span className="inline-flex items-center gap-1">
            <Dot />
            <Dot delay="150ms" />
            <Dot delay="300ms" />
          </span>
        ) : (
          message.content
        )}
      </div>
    </div>
  );
}

function Dot({ delay = '0ms' }: { delay?: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 dark:bg-neutral-500"
      style={{ animationDelay: delay }}
    />
  );
}
