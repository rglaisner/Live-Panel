/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface LogEntry {
  timestamp: Date;
  message: string;
  level: 'info' | 'error';
}

export interface ProfilingEntry {
  timestamp: Date;
  type: 'config' | 'input';
  role: string;
  connectionId: string;
  data: any;
}

export interface QAEntry {
  timestamp: Date;
  question: string;
  answer: string;
  userAudioUrl?: string;
  agentAudioUrl?: string;
}

export interface WebSource {
  uri: string;
  title: string;
}

type Listener = (logs: LogEntry[], qaHistory: QAEntry[], currentPrompt: string, profilingData: ProfilingEntry[], sources: WebSource[]) => void;

class Logger {
  private logs: LogEntry[] = [];
  private qaHistory: QAEntry[] = [];
  private profilingData: ProfilingEntry[] = [];
  private currentPrompt: string = '';
  private sources: WebSource[] = [];
  private listeners: Set<Listener> = new Set();
  private lastMessage: string | null = null;
  private repeatCount: number = 0;
  private aggregationState: {
    type: 'audio' | 'buffer' | null;
    key: string | null;
    count: number;
    totalBytes: number;
  } = { type: null, key: null, count: 0, totalBytes: 0 };

  log(message: string, level: 'info' | 'error' = 'info') {
    // 1. Check for Audio Chunk pattern with Line Index
    // Format: Audio chunk received for host-ptixoe (Line 0): 2560 bytes
    const audioMatch = message.match(/^Audio chunk received for (.*) \(Line (\d+)\): (\d+) bytes$/);
    if (audioMatch && level === 'info') {
      const [, connId, lineIdx, bytes] = audioMatch;
      const byteCount = parseInt(bytes, 10);
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
      
      // Look back at the last 10 entries to find a matching audio log to update
      for (let i = 1; i <= Math.min(10, this.logs.length); i++) {
        const entry = this.logs[this.logs.length - i];
        // Pattern: Line 0 (host-ptixoe): 120 chunks (350KB) | Started: ... | Ended: ...
        const match = entry.message.match(new RegExp(`^Line ${lineIdx} \\(${connId}\\): (\\d+) chunks \\((.*)\\) \\| Started: (.*) \\| Ended: (.*)$`));
        
        if (match) {
          const count = parseInt(match[1], 10) + 1;
          const prevBytesMatch = match[2].match(/(\d+(\.\d+)?)KB/);
          const prevBytes = prevBytesMatch ? parseFloat(prevBytesMatch[1]) * 1024 : 0;
          const totalBytes = prevBytes + byteCount;
          const startedAt = match[3];
          
          entry.message = `Line ${lineIdx} (${connId}): ${count} chunks (${(totalBytes / 1024).toFixed(1)}KB) | Started: ${startedAt} | Ended: ${timeStr}`;
          entry.timestamp = now;
          this.notifyListeners();
          return;
        }
      }

      // No match found, create new summary entry
      const entry: LogEntry = {
        timestamp: now,
        message: `Line ${lineIdx} (${connId}): 1 chunks (${(byteCount / 1024).toFixed(1)}KB) | Started: ${timeStr} | Ended: ${timeStr}`,
        level: 'info'
      };
      this.logs.push(entry);
      this.notifyListeners();
      return;
    }

    // 2. Fallback for Q&A or other audio logs without line index
    // Format: Audio chunk received for connection qa-ptixoe: 2560 bytes
    const simpleAudioMatch = message.match(/^Audio chunk received for connection (.*): (\d+) bytes$/);
    if (simpleAudioMatch && level === 'info') {
      const [, connId, bytes] = simpleAudioMatch;
      const byteCount = parseInt(bytes, 10);
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });

      for (let i = 1; i <= Math.min(10, this.logs.length); i++) {
        const entry = this.logs[this.logs.length - i];
        // Pattern: Q&A (qa-ptixoe): 120 chunks (350KB) | Started: ... | Ended: ...
        const match = entry.message.match(new RegExp(`^Q&A \\(${connId}\\): (\\d+) chunks \\((.*)\\) \\| Started: (.*) \\| Ended: (.*)$`));
        
        if (match) {
          const count = parseInt(match[1], 10) + 1;
          const prevBytesMatch = match[2].match(/(\d+(\.\d+)?)KB/);
          const prevBytes = prevBytesMatch ? parseFloat(prevBytesMatch[1]) * 1024 : 0;
          const totalBytes = prevBytes + byteCount;
          const startedAt = match[3];
          
          entry.message = `Q&A (${connId}): ${count} chunks (${(totalBytes / 1024).toFixed(1)}KB) | Started: ${startedAt} | Ended: ${timeStr}`;
          entry.timestamp = now;
          this.notifyListeners();
          return;
        }
      }

      const entry: LogEntry = {
        timestamp: now,
        message: `Q&A (${connId}): 1 chunks (${(byteCount / 1024).toFixed(1)}KB) | Started: ${timeStr} | Ended: ${timeStr}`,
        level: 'info'
      };
      this.logs.push(entry);
      this.notifyListeners();
      return;
    }

    // 3. Check for Buffered Chunk pattern
    // Format: Saved pre-warm audio chunk for guest.
    const bufferMatch = message.match(/^Saved pre-warm audio chunk for (.*)\.$/);
    if (bufferMatch && level === 'info') {
      const role = bufferMatch[1];
      for (let i = 1; i <= Math.min(5, this.logs.length); i++) {
        const entry = this.logs[this.logs.length - i];
        const match = entry.message.match(new RegExp(`^Buffered pre-warm chunks for ${role} \\(x(\\d+)\\)$`));
        if (match) {
          const count = parseInt(match[1], 10) + 1;
          entry.message = `Buffered pre-warm chunks for ${role} (x${count})`;
          entry.timestamp = new Date();
          this.notifyListeners();
          return;
        }
      }
      const entry: LogEntry = {
        timestamp: new Date(),
        message: `Buffered pre-warm chunks for ${role} (x1)`,
        level: 'info'
      };
      this.logs.push(entry);
      this.notifyListeners();
      return;
    }

    // 4. Fallback to simple identical message aggregation
    if (message === this.lastMessage && level === 'info') {
      this.repeatCount++;
      const lastEntry = this.logs[this.logs.length - 1];
      if (lastEntry) {
        lastEntry.message = `${message} (x${this.repeatCount + 1})`;
        lastEntry.timestamp = new Date();
        this.notifyListeners();
        return;
      }
    }

    this.lastMessage = message;
    this.repeatCount = 0;
    const entry: LogEntry = {
      timestamp: new Date(),
      message,
      level,
    };
    this.logs.push(entry);
    this.notifyListeners();
    // Also log to console for development
    if (level === 'error') {
      console.error(`[App Log] ${message}`);
    } else {
      console.log(`[App Log] ${message}`);
    }
  }

  logQA(question: string, answer: string, userAudioUrl?: string, agentAudioUrl?: string) {
      const entry: QAEntry = {
          timestamp: new Date(),
          question,
          answer,
          userAudioUrl,
          agentAudioUrl,
      };
      this.qaHistory.push(entry);
      this.notifyListeners();
  }

  setPrompt(prompt: string) {
    this.currentPrompt = prompt;
    this.notifyListeners();
  }

  setSources(sources: WebSource[]) {
    this.sources = sources;
    this.notifyListeners();
  }

  logProfiling(type: 'config' | 'input', role: string, data: any, connectionId: string = 'unknown') {
    const entry: ProfilingEntry = {
      timestamp: new Date(),
      type,
      role,
      connectionId,
      data,
    };
    this.profilingData.push(entry);
    this.notifyListeners();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    // Immediately notify the new listener with the current logs
    listener([...this.logs], [...this.qaHistory], this.currentPrompt, [...this.profilingData], [...this.sources]); 
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  clear() {
    this.log('Logs cleared.');
    // Clear logs after a small delay to allow the "cleared" message to be seen
    setTimeout(() => {
        this.logs = [];
        this.qaHistory = [];
        this.profilingData = [];
        this.sources = [];
        this.notifyListeners();
    }, 50);
  }

  private notifyListeners() {
    const currentLogs = [...this.logs];
    const currentQA = [...this.qaHistory];
    const prompt = this.currentPrompt;
    const profiling = [...this.profilingData];
    const sources = [...this.sources];
    this.listeners.forEach(listener => listener(currentLogs, currentQA, prompt, profiling, sources));
  }
}

export const logger = new Logger();

// Initial log
logger.log('Application initialized.');
