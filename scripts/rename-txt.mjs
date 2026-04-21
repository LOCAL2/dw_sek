import { readdirSync, renameSync } from 'fs'
import { join, extname, basename } from 'path'

const OCR_DIR = './public/ocr'

const files = readdirSync(OCR_DIR)
  .filter(f => f.startsWith('Screenshot_') && extname(f) === '.txt')
  .sort()

files.forEach((file, i) => {
  const newName = `evidence-${String(i + 1).padStart(2, '0')}.txt`
  renameSync(join(OCR_DIR, file), join(OCR_DIR, newName))
  console.log(`${file} → ${newName}`)
})

console.log(`\nDone! Renamed ${files.length} .txt files.`)