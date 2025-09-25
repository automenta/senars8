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
      this.emit('open');
    });

    this.ws.on('close', () => {
      this.emit('close');
    });

    this.ws.on('error', (error) => {
      this.emit('error', error);
    });

    this.ws.on('message', (data) => {
      this.emit('message', data.toString());
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