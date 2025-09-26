import WebSocket from 'ws';
import EventEmitter from 'events';

class AgentCommunicationService extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    this.ws = null;
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.on('open', () => {
      this.emit('connect');
    });

    this.ws.on('close', () => {
      this.emit('disconnect');
    });

    this.ws.on('error', (error) => {
      this.emit('error', error);
    });

    this.ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            this.emit('data', data);
        } catch (error) {
            this.emit('error', new Error(`Failed to parse incoming message: ${message.toString()}`));
        }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }
}

export default AgentCommunicationService;