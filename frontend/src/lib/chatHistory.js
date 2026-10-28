const STORAGE_KEY = 'finagent_recent_chats';

export function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Just now';
  const diffMs = Date.now() - Number(timestamp);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;

  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function detectCategory(text = '') {
  const lower = text.toLowerCase();
  if (lower.includes('loan') || lower.includes('portfolio') || lower.includes('facility') || lower.includes('delinquen')) {
    return 'Loan Portfolio';
  }
  if (lower.includes('10-k') || lower.includes('annual report') || lower.includes('10k')) {
    return '10-K Filing';
  }
  if (lower.includes('10-q') || lower.includes('10q') || lower.includes('ebitda') || lower.includes('revenue') || lower.includes('margin')) {
    return '10-Q Report';
  }
  if (lower.includes('invoice') || lower.includes('surcharge') || lower.includes('billing') || lower.includes('vendor')) {
    return 'Invoice';
  }
  if (lower.includes('balance sheet') || lower.includes('asset') || lower.includes('liabilit') || lower.includes('equity')) {
    return 'Balance Sheet';
  }
  if (lower.includes('cash flow') || lower.includes('operating cash')) {
    return 'Cash Flow';
  }
  return 'Financial Analysis';
}

export const DEFAULT_RECENT_CHATS = [
  {
    id: 'seed-1',
    title: 'Alpha Corp 10-K FY2025',
    category: '10-K Filing',
    timestamp: Date.now() - 2 * 3600 * 1000,
    prompt: 'Extract the Q3 Revenue, Operating Income, and EBITDA margin from Beta Tech Q3 financial statement with source citations.',
  },
  {
    id: 'seed-2',
    title: 'Q3 Cash Flow & EBITDA Shift',
    category: '10-Q Report',
    timestamp: Date.now() - 24 * 3600 * 1000,
    prompt: 'Extract Q3 Operating Income and EBITDA reconciliation for Beta Tech.',
  },
  {
    id: 'seed-3',
    title: 'Vendor Invoice INV-9812 Audit',
    category: 'Invoice',
    timestamp: Date.now() - 48 * 3600 * 1000,
    prompt: 'Audit invoice INV-9812 for discrepancies between line item sums, tax calculations, and the stated final payable amount.',
  },
  {
    id: 'seed-4',
    title: '2024 vs 2025 Balance Sheet',
    category: 'Balance Sheet',
    timestamp: Date.now() - 7 * 24 * 3600 * 1000,
    prompt: 'Compare the 2024 vs 2025 Balance Sheet items: Total Current Assets, Total Liabilities, and Retained Earnings.',
  },
];

export function getRecentChats() {
  if (typeof window === 'undefined') return DEFAULT_RECENT_CHATS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RECENT_CHATS));
      return DEFAULT_RECENT_CHATS.map((c) => ({
        ...c,
        date: formatRelativeTime(c.timestamp),
      }));
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_RECENT_CHATS.map((c) => ({
        ...c,
        date: formatRelativeTime(c.timestamp),
      }));
    }

    return parsed.map((c) => ({
      ...c,
      date: formatRelativeTime(c.timestamp),
    }));
  } catch (e) {
    console.warn('Failed to parse recent chats from localStorage:', e);
    return DEFAULT_RECENT_CHATS.map((c) => ({
      ...c,
      date: formatRelativeTime(c.timestamp),
    }));
  }
}

export function saveRecentChat({ prompt, title, category, id }) {
  if (typeof window === 'undefined' || !prompt) return;

  try {
    const existing = getRecentChats();
    const cleanPrompt = prompt.trim();
    const cleanTitle = title || (cleanPrompt.length > 38 ? cleanPrompt.slice(0, 36) + '...' : cleanPrompt);
    const assignedCategory = category || detectCategory(cleanPrompt);
    const chatId = id || `chat-${Date.now()}`;

    // Filter out if exact prompt already exists so we bump it to the top
    const filtered = existing.filter(
      (c) => c.prompt?.trim().toLowerCase() !== cleanPrompt.toLowerCase() && c.id !== chatId
    );

    const newChat = {
      id: chatId,
      title: cleanTitle,
      prompt: cleanPrompt,
      category: assignedCategory,
      timestamp: Date.now(),
    };

    const updated = [newChat, ...filtered].slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    window.dispatchEvent(new CustomEvent('finagent_recent_chats_updated', { detail: newChat }));
    return newChat;
  } catch (e) {
    console.warn('Failed to save recent chat:', e);
  }
}

export function deleteRecentChat(chatId) {
  if (typeof window === 'undefined' || !chatId) return;

  try {
    const existing = getRecentChats();
    const updated = existing.filter((c) => c.id !== chatId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('finagent_recent_chats_updated', { detail: { deletedId: chatId } }));
  } catch (e) {
    console.warn('Failed to delete recent chat:', e);
  }
}

export function clearAllRecentChats() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('finagent_recent_chats_updated'));
  } catch (e) {
    console.warn('Failed to clear recent chats:', e);
  }
}

