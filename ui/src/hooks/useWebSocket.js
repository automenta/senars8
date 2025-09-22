import { useState, useEffect, useRef } from 'react';

const useWebSocket = (url) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const webSocket = useRef(null);

  useEffect(() => {
    if (!url) {
      return;
    }

    webSocket.current = new WebSocket(url);

    webSocket.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    webSocket.current.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    webSocket.current.onmessage = (event) => {
      setLastMessage(event.data);
    };

    webSocket.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Cleanup function
    return () => {
      if (webSocket.current) {
        webSocket.current.close();
      }
    };
  }, [url]);

  const sendMessage = (message) => {
    if (webSocket.current && webSocket.current.readyState === WebSocket.OPEN) {
      webSocket.current.send(message);
    } else {
      console.error('WebSocket is not connected.');
    }
  };

  return { isConnected, lastMessage, sendMessage };
};

export default useWebSocket;
