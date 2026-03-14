// src/core/communication/bridge.ts

import type { ServerMessage, ClientMessage } from './protocol.ts';

declare global {
  interface Window {
    /** Injected by JCEF (production) */
    cefQuery?: (options: {
      request: string;
      onSuccess?: (response: string) => void;
      onFailure?: (errorCode: number, errorMessage: string) => void;
    }) => void;

    /**
     * Dev-mode injection point.
     * In the browser (outside JCEF) you can open the browser console and call:
     *
     *   window.__devInject({ type: 'UPDATE_SCHEMA_PAYLOAD', payload: {...} })
     *
     * to push a message into the running diagram as if it came from the IDE.
     */
    __devInject?: (message: ServerMessage) => void;
  }
}

export type MessageHandler = (message: ServerMessage) => void;

export class Bridge {
  private handler: MessageHandler;

  constructor(handler: MessageHandler) {
    this.handler = handler;
    this.initializeListener();
    this.notifyReady();

    // Dev-mode helper: expose an injection function on window so you can
    // paste test payloads directly in the browser devtools console.
    if (!window.cefQuery) {
      window.__devInject = (msg: ServerMessage) => {
        console.info('[Bridge Dev] injecting message:', msg);
        this.handler(msg);
      };
      console.info(
          '[Bridge Dev] Running outside JCEF.\n' +
          'Call window.__devInject({ type: "UPDATE_SCHEMA_PAYLOAD", payload: {...} }) ' +
          'to push test data into the diagram.'
      );
    }
  }

  private initializeListener(): void {
    window.addEventListener('message', (event) => {
      if (this.isValidServerMessage(event.data)) {
        this.handler(event.data as ServerMessage);
      }
    });
  }

  private isValidServerMessage(data: unknown): data is { type: string } {
    return (
        data !== null &&
        typeof data === 'object' &&
        'type' in data &&
        typeof (data as Record<string, unknown>).type === 'string'
    );
  }

  private notifyReady(): void {
    this.send({ type: 'READY' });
  }

  send(message: ClientMessage): void {
    const payload = JSON.stringify(message);
    if (window.cefQuery) {
      window.cefQuery({ request: payload });
    } else {
      // In dev/browser mode just log — no CEF to receive it.
      console.debug('[Bridge Dev] outgoing message:', message);
    }
  }

  log(message: string, level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' = 'INFO'): void {
    this.send({ type: 'LOG', level, message });
  }

  setHandler(handler: MessageHandler): void {
    this.handler = handler;
  }
}