declare function describe(description: string, specDefinitions: () => void): void;
declare function it(expectation: string, assertion: () => void): void;
declare function expect<T>(actual: T): {
  toBe(expected: T): void;
  toEqual(expected: T): void;
  toBeCloseTo(expected: number, precision?: number): void;
  toBeGreaterThan(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toThrowError(message?: string | RegExp): void;
};
