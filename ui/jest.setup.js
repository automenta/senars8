// jest.setup.js
import '@testing-library/jest-dom';

// Add missing globals for TextEncoder/TextDecoder/ReadableStream
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = require('stream').Readable;
}

if (typeof global.WritableStream === 'undefined') {
  global.WritableStream = require('stream').Writable;
}

if (typeof global.TransformStream === 'undefined') {
  const { Transform } = require('stream');
  global.TransformStream = Transform;
}
