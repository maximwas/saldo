// lefthook commit-msg: commit messages are English (Conventional Commits); `#` comment lines of the template are skipped
import { readFileSync } from 'node:fs'

const CYRILLIC = /\p{Script=Cyrillic}/u

const findings = readFileSync(process.argv[2], 'utf8')
  .split('\n')
  .filter((line) => !line.startsWith('#') && CYRILLIC.test(line))

if (findings.length > 0) {
  console.error(`Commit messages must be English (no Cyrillic):\n${findings.join('\n')}`)
  process.exit(1)
}
