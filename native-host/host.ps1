# Brainrot Blocker - Native Messaging Host
# Zero-dependency desktop app detection for Windows 10/11
# Communicates with Chrome extension via native messaging protocol (binary stdin/stdout)

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Collections.Concurrent;

namespace BrainrotBlocker
{
    public class NativeHost
    {
        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

        private static BinaryWriter writer;
        private static readonly object writeLock = new object();
        private static ConcurrentQueue<string> incomingMessages = new ConcurrentQueue<string>();
        private static volatile bool running = true;

        private static void SendMessage(string json)
        {
            lock (writeLock)
            {
                byte[] bytes = Encoding.UTF8.GetBytes(json);
                writer.Write(bytes.Length);
                writer.Write(bytes);
                writer.Flush();
            }
        }

        private static string GetForegroundProcessName()
        {
            try
            {
                IntPtr hwnd = GetForegroundWindow();
                if (hwnd == IntPtr.Zero) return "unknown";

                uint processId;
                GetWindowThreadProcessId(hwnd, out processId);
                if (processId == 0) return "unknown";

                return Process.GetProcessById((int)processId).ProcessName;
            }
            catch
            {
                return "unknown";
            }
        }

        private static string EscapeJson(string str)
        {
            var sb = new StringBuilder(str.Length);
            foreach (char c in str)
            {
                switch (c)
                {
                    case '\\': sb.Append("\\\\"); break;
                    case '"':  sb.Append("\\\""); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    default:   sb.Append(c); break;
                }
            }
            return sb.ToString();
        }

        private static void StdinReaderThread()
        {
            try
            {
                Stream stdin = Console.OpenStandardInput();
                BinaryReader reader = new BinaryReader(stdin);

                while (running)
                {
                    int length = reader.ReadInt32();
                    byte[] buffer = reader.ReadBytes(length);
                    string message = Encoding.UTF8.GetString(buffer);
                    incomingMessages.Enqueue(message);
                }
            }
            catch (EndOfStreamException)
            {
                // Chrome closed stdin — normal exit
                running = false;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("Stdin reader error: " + ex.Message);
                running = false;
            }
        }

        public static void Run()
        {
            try
            {
                Stream stdout = Console.OpenStandardOutput();
                writer = new BinaryWriter(stdout);

                Thread stdinThread = new Thread(StdinReaderThread);
                stdinThread.IsBackground = true;
                stdinThread.Start();

                Console.Error.WriteLine("Brainrot Blocker native host started");

                while (running)
                {
                    // Process incoming messages from Chrome
                    string message;
                    while (incomingMessages.TryDequeue(out message))
                    {
                        if (message.Contains("\"ping\""))
                        {
                            SendMessage("{\"type\":\"pong\"}");
                        }
                    }

                    // Poll foreground window and report
                    string processName = GetForegroundProcessName();
                    SendMessage("{\"type\":\"app-focus\",\"processName\":\"" +
                                EscapeJson(processName) + "\"}");

                    Thread.Sleep(1000);
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("Fatal error: " + ex.Message);
                Environment.Exit(1);
            }
        }
    }
}
'@ -Language CSharp

[BrainrotBlocker.NativeHost]::Run()
