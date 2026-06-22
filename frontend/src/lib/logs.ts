const KEY = 'andrea_logs';

export interface LogEntry {
  type: string;
  detail?: string;
  date: string;
  ip?: string;
  ua?: string;
}

export function getLogs(): LogEntry[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

export function addLog(type: string, detail?: string) {
  const logs = getLogs();
  const entry: LogEntry = {
    type,
    detail,
    date: new Date().toISOString(),
    ua: navigator.userAgent,
  };
  // Try to get IP
  fetch('https://api.ipify.org?format=json')
    .then(r => r.json())
    .then(d => {
      entry.ip = d.ip;
      logs.unshift(entry);
      localStorage.setItem(KEY, JSON.stringify(logs.slice(0, 500)));
    })
    .catch(() => {
      logs.unshift(entry);
      localStorage.setItem(KEY, JSON.stringify(logs.slice(0, 500)));
    });
}
