export function asNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export function asDecimal(value: number, digits: number = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function describeCount(count: number, singular: string, plural?: string): string {
  const label = count === 1 ? singular : plural ?? `${singular}s`;
  return `${asNumber(count)} ${label}`;
}
