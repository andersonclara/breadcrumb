import WebSocket from 'ws';
const deadline = Date.now() + 90000;
const attached = new Set();
const sockets = new Set();
let sequence = 0;
console.log('Listening for the next Expo device connection for 90 seconds.');
while (Date.now() < deadline) {
  try {
    const targets = await (await fetch('http://127.0.0.1:8081/json/list', { signal: AbortSignal.timeout(1500) })).json();
    for (const target of targets) {
      if (!target.webSocketDebuggerUrl || attached.has(target.id)) continue;
      attached.add(target.id);
      const socket = new WebSocket(target.webSocketDebuggerUrl, { origin: 'http://127.0.0.1:8081' });
      sockets.add(socket);
      socket.on('open', () => {
        console.log('Device inspector connected:', target.title);
        socket.send(JSON.stringify({ id: ++sequence, method: 'Runtime.enable' }));
      });
      socket.on('message', raw => {
        try {
          const message = JSON.parse(String(raw));
          if (message.method === 'Runtime.exceptionThrown') {
            const detail = message.params.exceptionDetails;
            console.log('JS EXCEPTION:', detail.exception?.description ?? detail.text);
          }
          if (message.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(message.params.type)) {
            console.log('JS ERROR:', message.params.args.map(arg => arg.description ?? arg.value ?? '').join(' ').slice(0, 4000));
          }
        } catch { /* Non-JSON messages are not diagnostic events. */ }
      });
      socket.on('error', error => console.log('Inspector connection:', error.message));
      socket.on('close', () => { console.log('Device inspector disconnected.'); sockets.delete(socket); });
    }
  } catch { /* The dev server can briefly restart while files change. */ }
  await new Promise(resolve => setTimeout(resolve, 300));
}
for (const socket of sockets) socket.close();
console.log('Capture complete. Connected targets:', attached.size);
