const NEW_WINDOW_MS = 48 * 60 * 60 * 1000;

function isWithinNewWindow(date: Date, now = Date.now()) {
  const elapsed = now - date.valueOf();
  return elapsed >= 0 && elapsed < NEW_WINDOW_MS;
}

export function isNewlyPublished(pubDate: Date, now = Date.now()) {
  return isWithinNewWindow(pubDate, now);
}

export function isRecentlyChanged(pubDate: Date, updatedDate?: Date, now = Date.now()) {
  const latestDate = updatedDate && updatedDate > pubDate ? updatedDate : pubDate;
  return isWithinNewWindow(latestDate, now);
}
