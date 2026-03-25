import chalk from 'chalk';

export function success(msg: string): void {
  console.log(chalk.green('✓') + ' ' + msg);
}

export function error(msg: string): void {
  console.log(chalk.red('✗') + ' ' + msg);
}

export function warn(msg: string): void {
  console.log(chalk.yellow('⚠') + ' ' + msg);
}

export function info(msg: string): void {
  console.log(chalk.blue('ℹ') + ' ' + msg);
}

export function json(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function table(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) => {
    const maxWidth = Math.max(
      h.length,
      ...rows.map(r => (r[i] || '').length)
    );
    return maxWidth + 2;
  });

  const headerRow = headers
    .map((h, i) => h.padEnd(colWidths[i]))
    .join(' | ');
  const separator = colWidths.map(w => '-'.repeat(w)).join('-+-');
  const dataRows = rows.map(row =>
    row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join(' | ')
  );

  return [headerRow, separator, ...dataRows].join('\n');
}
