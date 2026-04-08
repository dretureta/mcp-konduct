import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ToastContainer, type ToastMessage } from './Toast';

describe('Toast', () => {
  describe('semantic type classes', () => {
    it('success toast should use semantic token (e.g. bg-success) instead of emerald', () => {
      const toasts: ToastMessage[] = [
        { id: '1', type: 'success', message: 'Operation completed' },
      ];
      const html = renderToStaticMarkup(
        <ToastContainer toasts={toasts} onRemove={() => {}} />
      );
      // After refactor, should NOT contain hardcoded emerald
      expect(html).not.toContain('emerald-500');
      // Should use semantic token instead
      expect(html).toContain('bg-success');
    });

    it('error toast should use semantic token (e.g. bg-error) instead of red-500', () => {
      const toasts: ToastMessage[] = [
        { id: '1', type: 'error', message: 'Something went wrong' },
      ];
      const html = renderToStaticMarkup(
        <ToastContainer toasts={toasts} onRemove={() => {}} />
      );
      // After refactor, should NOT contain hardcoded red
      expect(html).not.toContain('red-500');
      // Should use semantic token instead
      expect(html).toContain('bg-error');
    });
  });
});
