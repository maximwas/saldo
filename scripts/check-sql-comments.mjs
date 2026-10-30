// SQL has no ESLint: fail when a `--` or `/* */` comment in supabase/**/*.sql holds Cyrillic (comments are English)
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const CYRILLIC_COMMENT = /(--|\/\*|^\s*\*).*\p{Script=Cyrillic}/u

function sqlFiles(directory) {
  if (!existsSync(directory)) {
    return []
  }

  return readdirSync(directory, { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith('.sql'))
    .map((name) => join(directory, name))
}

const findings = sqlFiles('supabase').flatMap((file) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line, index) => (CYRILLIC_COMMENT.test(line) ? [`${file}:${index + 1}: ${line.trim()}`] : [])),
)

if (findings.length > 0) {
  console.error(`Comments must be English:\n${findings.join('\n')}`)
  process.exit(1)
}
