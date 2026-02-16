const { execFile } = require('child_process');

// Helper: Send message to Chrome extension via native messaging protocol
function sendMessage(obj) {
  const json = JSON.stringify(obj);
  const buffer = Buffer.from(json, 'utf8');
  const length = buffer.length;

  // Write 4-byte little-endian length prefix
  const header = Buffer.allocUnsafe(4);
  header.writeUInt32LE(length, 0);

  process.stdout.write(header);
  process.stdout.write(buffer);
}

// Helper: Get the active window's process name using PowerShell
function getActiveWindow() {
  return new Promise((resolve, reject) => {
    const psCommand = `Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class W{[DllImport("user32.dll")]public static extern IntPtr GetForegroundWindow();[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);};' -Language CSharp; $hwnd=[W]::GetForegroundWindow(); $procId=0; [W]::GetWindowThreadProcessId($hwnd,[ref]$procId)|Out-Null; (Get-Process -Id $procId).ProcessName`;

    execFile('powershell.exe', ['-NoProfile', '-Command', psCommand], (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      const processName = stdout.trim();
      resolve(processName);
    });
  });
}

// Incoming message buffer and state
let messageBuffer = Buffer.alloc(0);
let messageLength = null;

// Handle incoming messages from Chrome extension
function processMessage(message) {
  try {
    const obj = JSON.parse(message.toString('utf8'));

    if (obj.type === 'ping') {
      sendMessage({ type: 'pong' });
    }
  } catch (err) {
    process.stderr.write(`Error processing message: ${err.message}\n`);
  }
}

// Read length-prefixed messages from stdin
process.stdin.on('data', (chunk) => {
  messageBuffer = Buffer.concat([messageBuffer, chunk]);

  while (true) {
    // Read length prefix if we don't have it yet
    if (messageLength === null && messageBuffer.length >= 4) {
      messageLength = messageBuffer.readUInt32LE(0);
      messageBuffer = messageBuffer.slice(4);
    }

    // Read message body if we have the full length
    if (messageLength !== null && messageBuffer.length >= messageLength) {
      const message = messageBuffer.slice(0, messageLength);
      messageBuffer = messageBuffer.slice(messageLength);
      messageLength = null;

      processMessage(message);
    } else {
      // Need more data
      break;
    }
  }
});

// Handle stdin close (Chrome disconnected)
process.stdin.on('end', () => {
  process.stderr.write('stdin closed, exiting\n');
  process.exit(0);
});

// Poll for active window every 1 second
setInterval(async () => {
  try {
    const processName = await getActiveWindow();
    sendMessage({ type: 'app-focus', processName });
  } catch (err) {
    process.stderr.write(`Error getting active window: ${err.message}\n`);
  }
}, 1000);

// Start reading from stdin
process.stdin.resume();

process.stderr.write('Brainrot Blocker native host started\n');
