import { readdirSync, renameSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { join, extname } from 'path'

const IMAGE_DIR = './public/image'
const OCR_PATH = './public/ocr/all.json'

const files = readdirSync(IMAGE_DIR)
  .filter(f => ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(f).toLowerCase()))
  .sort()

const renameMap = {}
files.forEach((file, i) => {
  const ext = extname(file)
  const newName = `evidence-${String(i + 1).padStart(2, '0')}${ext}`
  renameMap[file] = newName
})

for (const [oldName, newName] of Object.entries(renameMap)) {
  renameSync(join(IMAGE_DIR, oldName), join(IMAGE_DIR, newName))
  console.log(`${oldName} → ${newName}`)
}

if (existsSync(OCR_PATH)) {
  const raw = readFileSync(OCR_PATH, 'utf8').replace(/^\uFEFF/, '')
  const data = JSON.parse(raw)
  const updated = {}
  for (const [oldKey, value] of Object.entries(data)) {
    const newKey = renameMap[oldKey] ?? oldKey
    updated[newKey] = value
  }
  writeFileSync(OCR_PATH, JSON.stringify(updated, null, 2), 'utf8')
  console.log('\nUpdated all.json keys')
}

const OCR_DIR = './public/ocr'
for (const [oldName, newName] of Object.entries(renameMap)) {
  const oldTxt = join(OCR_DIR, oldName.replace(/\.[^.]+$/, '.txt'))
  const newTxt = join(OCR_DIR, newName.replace(/\.[^.]+$/, '.txt'))
  if (existsSync(oldTxt)) {
    renameSync(oldTxt, newTxt)
    console.log(`${oldTxt} → ${newTxt}`)
  }
}

console.log(`\nDone! Renamed ${files.length} files.`)