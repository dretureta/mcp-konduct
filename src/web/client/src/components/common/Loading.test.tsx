import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Loading } from './Loading';

describe('Loading', () => {
  it('uses a valid Tailwind border width class for the medium spinner', () => {
    const html = renderToStaticMarkup(<Loading size="md" />);

    expect(html).not.toContain('border-3');
    expect(html).toContain('border-[3px]');
  });
});
