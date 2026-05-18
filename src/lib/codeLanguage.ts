export const PREFERRED_CODE_LANGUAGE_KEY = 'algofit:preferredCodeLanguage';

export type CodeLanguageOption = {
  id: string;
  label: string;
};

export const CODE_LANGUAGES: CodeLanguageOption[] = [
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'c', label: 'C' },
  { id: 'go', label: 'Go' },
  { id: 'kotlin', label: 'Kotlin' },
];

export const DEFAULT_CODE_LANGUAGE = 'python';

const SUPPORTED_IDS = new Set(CODE_LANGUAGES.map((l) => l.id));

export function normalizeCodeLanguage(id: string | null | undefined): string {
  if (id && SUPPORTED_IDS.has(id)) return id;
  return DEFAULT_CODE_LANGUAGE;
}

export function loadPreferredCodeLanguage(): string | null {
  const raw = localStorage.getItem(PREFERRED_CODE_LANGUAGE_KEY);
  if (!raw) return null;
  return SUPPORTED_IDS.has(raw) ? raw : null;
}

export function savePreferredCodeLanguage(languageId: string): void {
  localStorage.setItem(
    PREFERRED_CODE_LANGUAGE_KEY,
    normalizeCodeLanguage(languageId),
  );
}

export function effectiveCodeLanguage(): string {
  return normalizeCodeLanguage(loadPreferredCodeLanguage());
}
