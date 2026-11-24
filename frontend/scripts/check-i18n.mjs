// Compares the translation keys of src/locales/{en,pl,uk}.json (no dependencies).
//
// - Every non-plural leaf key must exist in all languages.
// - Plural keys (`name_one`, `name_few`, ...) are compared by their base name; each language
//   must have every plural form its grammar needs (Intl.PluralRules), e.g. en: one/other,
//   pl and uk: one/few/many/other.
// - Interpolation variables ({{name}}) must match the English text ({{count}} may be
//   omitted in a plural form, e.g. "Last day").
// - Literal keys used in the code (t('a.b'), i18nKey="a.b") must exist in en.json.
//
// Exits with code 1 and a list of problems if anything is wrong.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LOCALES_DIR = join(ROOT, 'src', 'locales')
const SRC_DIR = join(ROOT, 'src')
const BASE = 'en'
const LANGUAGES = ['en', 'pl', 'uk']
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/

const problems = []

// { "a.b.c": "text" } for every string leaf
function flatten(object, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, path, out)
    else if (typeof value === 'string') out[path] = value
    else problems.push(`${path}: value must be a string or an object`)
  }
  return out
}

function variables(text) {
  return new Set([...text.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((match) => match[1]))
}

// Splits flat keys into plain keys and plural groups { base: { form: text } }
function describe(flat) {
  const plain = new Map()
  const plural = new Map()
  for (const [key, text] of Object.entries(flat)) {
    const match = PLURAL_SUFFIX.exec(key)
    if (match) {
      const base = key.slice(0, match.index)
      if (!plural.has(base)) plural.set(base, new Map())
      plural.get(base).set(match[1], text)
    } else {
      plain.set(key, text)
    }
  }
  return { plain, plural }
}

const locales = {}
for (const language of LANGUAGES) {
  const file = join(LOCALES_DIR, `${language}.json`)
  try {
    locales[language] = describe(flatten(JSON.parse(readFileSync(file, 'utf8'))))
  } catch (error) {
    problems.push(`${language}.json: cannot be read (${error.message})`)
  }
}

if (Object.keys(locales).length === LANGUAGES.length) {
  const base = locales[BASE]

  for (const language of LANGUAGES) {
    if (language === BASE) continue
    const current = locales[language]
    const forms = new Intl.PluralRules(language).resolvedOptions().pluralCategories

    // Plain keys: same set, same variables
    for (const [key, text] of base.plain) {
      if (!current.plain.has(key)) {
        problems.push(`${language}: missing key "${key}"`)
        continue
      }
      const expected = [...variables(text)].sort().join(', ')
      const actual = [...variables(current.plain.get(key))].sort().join(', ')
      if (expected !== actual) {
        problems.push(`${language}: "${key}" uses {${actual}} instead of {${expected}}`)
      }
    }
    for (const key of current.plain.keys()) {
      if (!base.plain.has(key)) problems.push(`${language}: extra key "${key}" (not in ${BASE}.json)`)
    }

    // Plural keys: same base names, all forms the language needs
    for (const [baseKey, baseForms] of base.plural) {
      const own = current.plural.get(baseKey)
      if (!own) {
        problems.push(`${language}: missing plural key "${baseKey}" (${forms.map((f) => `_${f}`).join(', ')})`)
        continue
      }
      for (const form of forms) {
        if (!own.has(form)) problems.push(`${language}: missing key "${baseKey}_${form}"`)
      }
      const expected = new Set([...baseForms.values()].flatMap((text) => [...variables(text)]))
      for (const [form, text] of own) {
        for (const name of variables(text)) {
          if (!expected.has(name)) problems.push(`${language}: "${baseKey}_${form}" uses unknown {${name}}`)
        }
        for (const name of expected) {
          if (name !== 'count' && !variables(text).has(name)) {
            problems.push(`${language}: "${baseKey}_${form}" does not use {${name}}`)
          }
        }
      }
    }
    for (const baseKey of current.plural.keys()) {
      if (!base.plural.has(baseKey)) problems.push(`${language}: extra plural key "${baseKey}" (not in ${BASE}.json)`)
    }
  }

  // English itself must have its own plural forms
  const enForms = new Intl.PluralRules(BASE).resolvedOptions().pluralCategories
  for (const [baseKey, own] of base.plural) {
    for (const form of enForms) {
      if (!own.has(form)) problems.push(`${BASE}: missing key "${baseKey}_${form}"`)
    }
  }

  // Literal keys used in the source code must exist in English
  const sourceFiles = []
  ;(function walk(dir) {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path)
      else if (/\.(jsx?|mjs)$/.test(name)) sourceFiles.push(path)
    }
  })(SRC_DIR)

  // Any quoted "namespace.key" string, where namespace is a top-level section of en.json
  const namespaces = new Set([...base.plain.keys(), ...base.plural.keys()].map((key) => key.split('.')[0]))
  const usage = new RegExp(`['"]((?:${[...namespaces].join('|')})\\.[\\w.]+)['"]`, 'g')
  for (const file of sourceFiles) {
    const code = readFileSync(file, 'utf8')
    for (const match of code.matchAll(usage)) {
      const key = match[1]
      if (!base.plain.has(key) && !base.plural.has(key)) {
        problems.push(`${relative(ROOT, file)}: key "${key}" is not in ${BASE}.json`)
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`i18n check failed, ${problems.length} problem(s):`)
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

const counts = LANGUAGES.map((language) => {
  const { plain, plural } = locales[language]
  return `${language}: ${plain.size} keys + ${plural.size} plural`
})
console.log(`i18n check passed (${counts.join('; ')})`)
