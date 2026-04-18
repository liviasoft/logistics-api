const NUMBERS_ONLY = '0123456789';
const UPPERCASE_ALPHABETS_ONLY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE_ALPHABETS_ONLY = 'abcdefghijklmnopqrstuvwxyz';
const SPECIAL_CHARS_ONLY = ',.<>/?`!@#$%^&*()_+=-[]{}\\|\'"~;:';

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

type RandomStringOptions = {
  uppercaseOnly?: boolean;
  lowercaseOnly?: boolean;
  numbersOnly?: boolean;
  alphabetsOnly?: boolean;
  withSymbols?: boolean;
  symbolsOnly?: boolean;
  alphanumeric?: boolean;
  toUppercase?: boolean;
  toLowercase?: boolean;
};

export const generateRandomString = (
  length: number,
  {
    uppercaseOnly = false,
    lowercaseOnly = false,
    numbersOnly = false,
    alphabetsOnly = false,
    alphanumeric = false,
    withSymbols = false,
    symbolsOnly = false,
    toUppercase = false,
    toLowercase = false,
  }: RandomStringOptions,
) => {
  let charSet = '';
  if (uppercaseOnly) charSet = UPPERCASE_ALPHABETS_ONLY;
  if (lowercaseOnly) charSet = LOWERCASE_ALPHABETS_ONLY;
  if (numbersOnly) charSet = NUMBERS_ONLY;
  if (alphabetsOnly)
    charSet = `${UPPERCASE_ALPHABETS_ONLY}${LOWERCASE_ALPHABETS_ONLY}`;
  if (alphanumeric)
    charSet = `${UPPERCASE_ALPHABETS_ONLY}${LOWERCASE_ALPHABETS_ONLY}${NUMBERS_ONLY}`;
  if (withSymbols) charSet += SPECIAL_CHARS_ONLY;
  if (symbolsOnly) charSet = SPECIAL_CHARS_ONLY;

  let result = '';
  const charactersLength = charSet.length;

  for (let i = 0; i < length; i++) {
    result += charSet.charAt(Math.floor(Math.random() * charactersLength));
  }

  if (toUppercase) result = result.toUpperCase();
  if (toLowercase) result = result.toLowerCase();

  return result;
};
