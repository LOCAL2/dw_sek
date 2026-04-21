import { readFileSync, writeFileSync } from 'fs'

const path = './public/ocr/all.json'
// strip BOM if present
const raw = readFileSync(path, 'utf8').replace(/^\uFEFF/, '')
const data = JSON.parse(raw)

const dirty = []
for (const [k, v] of Object.entries(data)) {
  if (/[\u4e00-\u9fff]/.test(v)) {
    dirty.push(k)
    data[k] = ''
  }
}

writeFileSync(path, JSON.stringify(data, null, 2), 'utf8')
console.log(`Cleared ${dirty.length} entries:`)
dirty.forEach(k => console.log(' -', k))
