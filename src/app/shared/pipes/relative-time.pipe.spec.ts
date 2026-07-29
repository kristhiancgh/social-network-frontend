import { RelativeTimePipe } from './relative-time.pipe';

describe('RelativeTimePipe', () => {
  let pipe: RelativeTimePipe;

  beforeEach(() => {
    pipe = new RelativeTimePipe();
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-07-27T12:00:00Z'));
  });

  afterEach(() => jasmine.clock().uninstall());

  it('returns an empty string for null or undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('returns an empty string for an unparseable value', () => {
    expect(pipe.transform('not a date')).toBe('');
  });

  it('says "just now" under a minute', () => {
    expect(pipe.transform('2026-07-27T11:59:30Z')).toBe('just now');
  });

  it('reports minutes under an hour', () => {
    expect(pipe.transform('2026-07-27T11:45:00Z')).toBe('15 min');
  });

  it('reports hours under a day', () => {
    expect(pipe.transform('2026-07-27T07:00:00Z')).toBe('5 h');
  });

  it('reports days under a week', () => {
    expect(pipe.transform('2026-07-24T12:00:00Z')).toBe('3 d');
  });

  it('falls back to a real date past a week', () => {
    const result = pipe.transform('2026-05-01T12:00:00Z');
    expect(result).not.toContain('d');
    expect(result).toContain('May');
  });

  it('treats a slightly future timestamp as "just now" rather than negative', () => {
    expect(pipe.transform('2026-07-27T12:00:30Z')).toBe('just now');
  });

  it('accepts a Date as well as a string', () => {
    expect(pipe.transform(new Date('2026-07-27T11:00:00Z'))).toBe('1 h');
  });
});
