import { en } from './en';
import { ru } from './ru';

export const locales = { en, ru } as const;

export type Locale = keyof typeof locales;

type DeepStringify<T> = {
  [Key in keyof T]: T[Key] extends Record<string, unknown> ? DeepStringify<T[Key]> : string;
};

export type Translation = DeepStringify<typeof en>;
