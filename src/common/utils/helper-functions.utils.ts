export const arrayToObjectByField = <
  T extends Record<string, any>,
  K extends keyof T,
>(
  arr: T[],
  key: K,
): Record<string, T> => arr.reduce((a, b) => ({ ...a, [b[key]]: b }), {});

type maskArgs = { str: string; num: number; mask?: string; reverse?: boolean };

export const maskWithChar = ({
  str,
  num,
  mask = '*',
  reverse = false,
}: maskArgs): string => {
  return reverse
    ? `${str}`.slice(0, `${str}`.length - num).padEnd(`${str}`.length, mask)
    : `${str}`.slice(num).padStart(`${str}`.length, mask);
};
