import { describe, it, expect } from 'vitest';

interface NpmOutdatedEntry {
  current: string;
  wanted: string;
  latest: string;
  dependent?: string;
  location?: string;
}

/**
 * Categorize outdated packages based on npm outdated --json output.
 * - semver: wanted > current (update available within declared semver range)
 * - major: wanted == current but latest > current (newer latest outside declared range)
 */
function categorizeOutdated(
  outdated: Record<string, NpmOutdatedEntry>
): { semver: string[]; major: string[] } {
  const semver: string[] = [];
  const major: string[] = [];

  for (const [pkg, info] of Object.entries(outdated)) {
    if (info.wanted !== info.current && info.latest !== info.wanted) {
      // wanted > current, but latest also > wanted — both updates available
      semver.push(pkg);
    } else if (info.wanted === info.current && info.latest !== info.current) {
      // wanted == current (nothing within range), but latest is newer — outside range
      major.push(pkg);
    } else if (info.wanted !== info.current) {
      // wanted > current, latest == wanted — only semver update
      semver.push(pkg);
    }
  }

  return { semver, major };
}

describe('doctor dependency categorization', () => {
  it('returns empty arrays when no packages are outdated', () => {
    const result = categorizeOutdated({});
    expect(result.semver).toHaveLength(0);
    expect(result.major).toHaveLength(0);
  });

  it('categorizes a patch/minor update as semver', () => {
    const result = categorizeOutdated({
      'some-pkg': { current: '1.0.0', wanted: '1.0.1', latest: '1.0.1' }
    });
    expect(result.semver).toEqual(['some-pkg']);
    expect(result.major).toHaveLength(0);
  });

  it('categorizes a major update as major when wanted == current', () => {
    const result = categorizeOutdated({
      'breaking-pkg': { current: '1.0.0', wanted: '1.0.0', latest: '2.0.0' }
    });
    expect(result.semver).toHaveLength(0);
    expect(result.major).toEqual(['breaking-pkg']);
  });

  it('categorizes package with both semver and major available as semver', () => {
    // wanted > current AND latest > wanted means both updates available
    // The semver update is the immediate concern; major is secondary
    const result = categorizeOutdated({
      'hybrid-pkg': { current: '1.0.0', wanted: '1.5.0', latest: '2.0.0' }
    });
    expect(result.semver).toEqual(['hybrid-pkg']);
    expect(result.major).toHaveLength(0);
  });

  it('handles multiple packages across both categories', () => {
    const result = categorizeOutdated({
      'patch-pkg': { current: '1.0.0', wanted: '1.0.1', latest: '1.0.1' },
      'major-pkg': { current: '2.0.0', wanted: '2.0.0', latest: '3.0.0' },
      'minor-pkg': { current: '1.0.0', wanted: '1.1.0', latest: '1.1.0' }
    });
    expect(result.semver).toEqual(['patch-pkg', 'minor-pkg']);
    expect(result.major).toEqual(['major-pkg']);
  });

  it('handles packages at exact same versions (edge case)', () => {
    // A package that somehow shows up with all same versions
    const result = categorizeOutdated({
      'unchanged': { current: '1.0.0', wanted: '1.0.0', latest: '1.0.0' }
    });
    expect(result.semver).toHaveLength(0);
    expect(result.major).toHaveLength(0);
  });

  it('handles packages with different version formats', () => {
    const result = categorizeOutdated({
      'alpha': { current: '1.0.0-alpha', wanted: '1.0.0', latest: '1.0.0' },
      'scoped': { current: '0.1.0', wanted: '0.2.0', latest: '1.0.0' }
    });
    expect(result.semver).toEqual(['alpha', 'scoped']);
    expect(result.major).toHaveLength(0);
  });
});
