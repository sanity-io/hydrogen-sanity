// Spec 12.2: documentation contract. Reads the emitted `.d.ts` of every public entry with the
// TypeScript compiler API and checks:
// - coverage: every export, and every member of an exported interface or class, has a TSDoc comment;
// - STE heuristics (D12 option a): the summary starts with a third-person verb, a sentence has at
//   most 25 words, no banned filler words. Passive voice is reported as a warning.
// It also prints the number of value exports per entry (spec 12.1.1).
import {readFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

const entries = Object.entries(pkg.exports)
  .filter(([, target]) => typeof target === 'object' && target.types)
  .map(([subpath, target]) => ({subpath, file: resolve(root, target.types)}))

const program = ts.createProgram(
  entries.map((entry) => entry.file),
  {module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, skipLibCheck: true},
)
const checker = program.getTypeChecker()
const dist = resolve(root, 'dist')

const BANNED = /\b(simply|just|easily|basically|please|utilize|obviously|very|really)\b/i
const PASSIVE = /\b(is|are|was|were|be|been|being)\s+(\w+ed|set|sent|built|written|given|shown|read|run|kept|done)\b/i
/** Summaries may start with these words, which are not verbs in the third person. */
const SUMMARY_EXCEPTIONS = new Set(['See'])

const errors = []
const warnings = []
const checked = new Set()
let memberCount = 0

function ours(declaration) {
  return declaration.getSourceFile().fileName.startsWith(dist)
}

function lintText(where, text) {
  const summary = text.split(/\n\s*\n/)[0].replace(/\s+/g, ' ').trim()
  const firstWord = summary.split(' ')[0] ?? ''
  if (!/^[A-Z][a-z]+s$/.test(firstWord) && !SUMMARY_EXCEPTIONS.has(firstWord)) {
    errors.push(`${where}: the summary must start with a verb in the third person ("Returns", "Sets"). Found "${firstWord}".`)
  }
  const prose = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, 'CODE')
  for (const sentence of prose.split(/(?<=[.!?])\s+/)) {
    const words = sentence.trim().split(/\s+/).filter(Boolean)
    if (words.length > 25) errors.push(`${where}: a sentence has ${words.length} words (max 25): "${sentence.trim().slice(0, 80)}..."`)
  }
  if (BANNED.test(prose)) errors.push(`${where}: banned word "${prose.match(BANNED)[0]}".`)
  if (PASSIVE.test(prose)) warnings.push(`${where}: possible passive voice: "${prose.match(PASSIVE)[0]}".`)
}

function checkSymbol(where, symbol) {
  const docs = ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim()
  if (!docs) {
    errors.push(`${where}: missing TSDoc comment.`)
    return
  }
  lintText(where, docs)
}

function checkMembers(where, symbol) {
  for (const declaration of symbol.declarations ?? []) {
    if (!ts.isInterfaceDeclaration(declaration) && !ts.isClassDeclaration(declaration)) continue
    for (const member of declaration.members) {
      if (!member.name || ts.isConstructorDeclaration(member)) continue
      if (member.modifiers?.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword)) continue
      if (ts.isPrivateIdentifier(member.name)) continue
      const memberSymbol = checker.getSymbolAtLocation(member.name)
      if (!memberSymbol) continue
      memberCount++
      checkSymbol(`${where}.${member.name.getText()}`, memberSymbol)
    }
  }
}

const exportCounts = []
for (const {subpath, file} of entries) {
  const source = program.getSourceFile(file)
  const moduleSymbol = source && checker.getSymbolAtLocation(source)
  if (!moduleSymbol) {
    errors.push(`${subpath}: cannot read ${file}`)
    continue
  }
  let values = 0
  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported
    if (symbol.flags & ts.SymbolFlags.Value) values++
    const declarations = (symbol.declarations ?? []).filter(ours)
    // Re-exports from upstream packages keep upstream docs.
    if (declarations.length === 0) continue
    const where = `${subpath} ${exported.name}`
    if (checked.has(symbol)) continue
    checked.add(symbol)
    checkSymbol(where, symbol)
    checkMembers(where, symbol)
  }
  exportCounts.push({subpath, values})
}

console.log('Value exports per entry:')
for (const {subpath, values} of exportCounts) console.log(`  ${subpath.padEnd(18)} ${values}`)
console.log(`\nChecked ${checked.size} exports and ${memberCount} members.`)
for (const warning of warnings) console.warn(`warn  ${warning}`)
for (const error of errors) console.error(`FAIL  ${error}`)
if (errors.length > 0) {
  console.error(`\n${errors.length} documentation error(s).`)
  process.exit(1)
}
console.log('Documentation contract green.')
