export type TimeSegment = { start: number; end: number; busy: boolean; past?: boolean; own?: boolean; direct?: boolean };

// Minutes since opening, calculated from absolute timestamps in Moscow time.
export function timeline(date: string, intervals: { start: string; end: string; own?: boolean; booked?: boolean; blockedByName?: string }[], now?: number): TimeSegment[] {
  const opening = Date.parse(`${date}T09:00:00+03:00`);
  const ranges = intervals.map(interval => ({
    start: Math.max(0, (Date.parse(interval.start) - opening) / 60000),
    end: Math.min(720, (Date.parse(interval.end) - opening) / 60000),
  })).filter(range => range.end > range.start).sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    // Touching bookings remain separate so each has its own tooltip and border.
    if (last && range.start < last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  const segments: TimeSegment[] = [];
  let cursor = 0;
  for (const range of merged) {
    if (range.start > cursor) segments.push({ start: cursor, end: range.start, busy: false });
    segments.push({ ...range, busy: true });
    cursor = range.end;
  }
  if (cursor < 720) segments.push({ start: cursor, end: 720, busy: false });
  const ownRanges = intervals.filter(interval => interval.own && !interval.blockedByName).map(interval => ({
    start: Math.max(0, (Date.parse(interval.start) - opening) / 60000),
    end: Math.min(720, (Date.parse(interval.end) - opening) / 60000),
  }));
  const linkedRanges = intervals.filter(interval => interval.blockedByName).map(interval => ({
    start: Math.max(0, (Date.parse(interval.start) - opening) / 60000),
    end: Math.min(720, (Date.parse(interval.end) - opening) / 60000),
  }));
  const directRanges = intervals.filter(interval => interval.booked && !interval.blockedByName).map(interval => ({
    start: Math.max(0, (Date.parse(interval.start) - opening) / 60000),
    end: Math.min(720, (Date.parse(interval.end) - opening) / 60000),
  }));
  const colored = segments.flatMap(segment => {
    if (!segment.busy) return [segment];
    const boundaries = Array.from(new Set([segment.start, segment.end, ...[...ownRanges, ...linkedRanges, ...directRanges].flatMap(range => [range.start, range.end]).filter(point => point > segment.start && point < segment.end)])).sort((a, b) => a - b);
    return boundaries.slice(0, -1).map((start, index) => {
      const end = boundaries[index + 1];
      const own = ownRanges.some(range => range.start <= start && range.end >= end);
      const direct = directRanges.some(range => range.start <= start && range.end >= end);
      return { ...segment, start, end, ...(own ? { own: true } : {}), ...(direct ? { direct: true } : {}) };
    });
  });
  if (now === undefined) return colored;
  const elapsed = Math.max(0, Math.min(720, Math.floor((now - opening) / 60000)));
  return colored.flatMap(segment => {
    if (segment.end <= elapsed) return [{ ...segment, past: true }];
    if (segment.start >= elapsed) return [segment];
    return [{ ...segment, end: elapsed, past: true }, { ...segment, start: elapsed }];
  });
}

export function timelineTime(minutes: number) {
  return `${String(9 + Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
