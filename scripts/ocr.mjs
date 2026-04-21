import Groq from 'groq-sdk'
import { readdirSync, writeFileSync, mkdirSync, readFileSync, renameSync } from 'fs'
import { join, basename, extname } from 'path'

const IMAGE_DIR = './public/image'
const OUTPUT_DIR = './public/ocr'
const API_KEY = process.env.VITE_GROQ_API_KEY || readFileSync('.env', 'utf8').match(/VITE_GROQ_API_KEY=(.+)/)?.[1]?.trim()

if (!API_KEY) { console.error('No GROQ API key found'); process.exit(1) }

const client = new Groq({ apiKey: API_KEY })

mkdirSync(OUTPUT_DIR, { recursive: true })

const files = readdirSync(IMAGE_DIR).filter(f =>
  ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(f).toLowerCase())
).sort()

const needsRename = files.some(f => !f.startsWith('evidence-'))
if (needsRename) {
  console.log('Renaming images to evidence-XX format...')
  files.forEach((file, i) => {
    const newName = `evidence-${String(i + 1).padStart(2, '0')}${extname(file)}`
    if (file !== newName) {
      renameSync(join(IMAGE_DIR, file), join(IMAGE_DIR, newName))
      console.log(` ${file} → ${newName}`)
      files[i] = newName
    }
  })
  console.log()
}

console.log(`Found ${files.length} images, starting OCR with Groq Vision...\n`)

const PROMPT = `คุณคือผู้เชี่ยวชาญด้านการอ่านข้อความจากภาพ screenshot แชท Facebook Messenger ภาษาไทย

งาน: คัดลอกข้อความทุกคำในภาพนี้ให้ครบถ้วนและแม่นยำ 100%

กฎเคร่งครัด:
1. คัดลอกข้อความตามที่เห็นในภาพทุกตัวอักษร ทั้งภาษาไทยและอังกฤษ
2. แต่ละข้อความในฟองสนทนาให้ขึ้นบรรทัดใหม่
3. ถ้ามีวันที่/เวลา ให้คัดลอกด้วย
4. ถ้ามีข้อมูลการโอนเงิน (ชื่อ เลขบัญชี จำนวนเงิน) ให้คัดลอกทุกตัวอักษร
5. ห้ามใช้ภาษาจีน ญี่ปุ่น หรือภาษาอื่นนอกจากไทยและอังกฤษ
6. ห้ามอธิบาย UI ห้ามใส่ tag ห้ามเพิ่มเติมสิ่งที่ไม่มีในภาพ
7. ห้ามแปล ห้ามสรุป ให้คัดลอกเท่านั้น
8. ถ้าอ่านไม่ออกจริงๆ ให้ใส่ [?] แทน
9. รักษาลำดับข้อความตามที่ปรากฏในภาพจากบนลงล่าง`

const results = {}
const existing = (() => {
  try { return JSON.parse(readFileSync(join(OUTPUT_DIR, 'all.json'), 'utf8')) } catch { return {} }
})()

for (let i = 0; i < files.length; i++) {
  const file = files[i]
  const imgPath = join(IMAGE_DIR, file)
  const name = basename(file, extname(file))

  if (existing[file]) {
    console.log(`[${i + 1}/${files.length}] SKIP (cached): ${file}`)
    results[file] = existing[file]
    continue
  }

  process.stdout.write(`[${i + 1}/${files.length}] ${file} ... `)

  try {
    const imageData = readFileSync(imgPath)
    const base64 = imageData.toString('base64')
    const mimeType = extname(file).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg'

    let text = ''
    let attempts = 0
    while (attempts < 3) {
      try {
        const res = await client.chat.completions.create({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
            ]
          }],
          max_tokens: 4096,
          temperature: 0,
        })
        text = res.choices[0].message.content?.trim() ?? ''
        break
      } catch (err) {
        attempts++
        if (attempts >= 3) throw err
        process.stdout.write(` retry(${attempts})...`)
        await new Promise(r => setTimeout(r, 3000 * attempts))
      }
    }

    results[file] = text
    writeFileSync(join(OUTPUT_DIR, `${name}.txt`), text, 'utf8')
    console.log(`✓ (${text.split('\n').length} lines)`)
  } catch (e) {
    console.log(`✗ ERROR: ${e.message}`)
    results[file] = existing[file] ?? ''
  }

  if (i < files.length - 1) await new Promise(r => setTimeout(r, 2500))
}

writeFileSync(join(OUTPUT_DIR, 'all.json'), JSON.stringify(results, null, 2), 'utf8')
console.log(`\nDone! Saved to ${OUTPUT_DIR}/all.json`)
