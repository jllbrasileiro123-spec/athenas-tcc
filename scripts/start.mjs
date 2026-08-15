import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const port = process.env.PORT ?? '3000'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const child = spawn(
  'npx',
  ['serve', 'dist', '-s', '-l', `tcp://0.0.0.0:${port}`],
  { cwd: root, stdio: 'inherit', shell: true, env: process.env }
)

child.on('exit', (code) => process.exit(code ?? 0))
