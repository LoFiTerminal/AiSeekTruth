// Add this to the END of preload.js after the contextBridge.exposeInMainWorld block

// Listen for main process logs and forward to browser console
ipcRenderer.on('main:log', (event, { type, args }) => {
  const prefix = '[MAIN]';
  const formattedArgs = args.map(arg => {
    try {
      return typeof arg === 'string' && arg.startsWith('{') ? JSON.parse(arg) : arg;
    } catch {
      return arg;
    }
  });

  if (type === 'error') {
    console.error(prefix, ...formattedArgs);
  } else if (type === 'warn') {
    console.warn(prefix, ...formattedArgs);
  } else {
    console.log(prefix, ...formattedArgs);
  }
});
