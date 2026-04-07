import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from './Button';

describe('Button', () => {
  describe('variant classes', () => {
    it('primary variant includes bg-primary token class', () => {
      const html = renderToStaticMarkup(
        <Button variant="primary">Test</Button>
      );
      expect(html).toContain('bg-primary');
    });

    it('danger variant should use semantic token (bg-error) instead of rose-500', () => {
      const html = renderToStaticMarkup(
        <Button variant="danger">Delete</Button>
      );
      // After refactor, should NOT contain hardcoded rose
      expect(html).not.toContain('rose-500');
      expect(html).not.toContain('rose-600');
      // Should use semantic token bg-error instead of non-existent bg-danger
      expect(html).toContain('bg-error');
    });
  });
});
