import React, { useEffect, useRef } from 'react';

function Log({ messages }) {
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="log-panel">
      <h2>Log</h2>
      <pre className="log-content">
        {messages.map((msg, index) => (
          <div key={index}>{msg}</div>
        ))}
        <div ref={logEndRef} />
      </pre>
    </div>
  );
}

export default Log;
