import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Badge } from './Badge';

describe('Badge', () => {
  describe('semantic variant classes', () => {
    it('success variant should use semantic token (e.g. bg-success) instead of emerald', () => {
      const html = renderToStaticMarkup(
        <Badge variant="success">Active</Badge>
      );
      // After refactor, should NOT contain hardcoded emerald
      expect(html).not.toContain('emerald-100');
      expect(html).not.toContain('emerald-200');
      expect(html).not.toContain('emerald-700');
      expect(html).not.toContain('emerald-900');
      // Should use semantic token instead
      expect(html).toContain('bg-success');
    });

    it('warning variant should use semantic token (e.g. bg-warning) instead of amber', () => {
      const html = renderToStaticMarkup(
        <Badge variant="warning">Pending</Badge>
      );
      // After refactor, should NOT contain hardcoded amber
      expect(html).not.toContain('amber-100');
      expect(html).not.toContain('amber-200');
      expect(html).not.toContain('amber-700');
      expect(html).not.toContain('amber-900');
      // Should use semantic token instead
      expect(html).toContain('bg-warning');
    });
  });
});
