import { EventEmitter } from 'events';

export type WebSocketEvents = {
    message: [data: string];
    open: [];
    close: [];
    error: [error: Event];
};

class WebSocketManager extends EventEmitter<WebSocketEvents> {
    public socket: WebSocket | null = null;
    private url: string;

    constructor(url: string) {
        super();
        this.url = url;
    }

    public connect() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) return;

        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => this.emit('open');
        this.socket.onmessage = (event) => this.emit('message', event.data);
        this.socket.onclose = () => {
            this.emit('close');
            setTimeout(() => this.connect(), 3000);
        };
        this.socket.onerror = (event) => this.emit('error', event);
    }

    public send(data: any) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket not connected');
        }
    }

    public disconnect() {
        this.socket?.close();
    }
}

export const ws = new WebSocketManager('ws://localhost:25503/ws');
