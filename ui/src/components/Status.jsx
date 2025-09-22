import React from 'react';

function Status({ isConnected }) {
  return (
    <div className="status-panel">
      <h2>Status</h2>
      <p>{isConnected ? 'Connected' : 'Not Connected'}</p>
    </div>
  );
}

export default Status;
