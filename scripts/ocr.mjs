import Groq from 'groq-sdk'
import { readdirSync, writeFileSync, mkdirSync, readFileSync } from 'fs'
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

console.log(`Found ${files.length} images, starting OCR with Groq Vision...\n`)

const PROMPT = `อ่านและคัดลอกข้อความทั้งหมดในภาพนี้ให้ครบถ้วนและแม่นยำที่สุด

กฎสำคัญ:
- คัดลอกเฉพาะข้อความที่เห็นในภาพ ทั้งภาษาไทยและภาษาอังกฤษ
- ห้ามใช้ภาษาจีนหรือภาษาอื่นใดในการอธิบาย แม้แต่ใน tag หรือ label
- ห้ามอธิบาย UI เช่น ห้ามเขียน <หัวโปรไฟล์> หรือ <ฟองสนทนา> หรือ tag ใดๆ
- ถ้าเป็นแชท ให้คัดลอกเฉพาะข้อความในฟองสนทนา แยกแต่ละข้อความเป็นบรรทัด
- รักษาโครงสร้างบรรทัดตามต้นฉบับ
- ห้ามแปล ห้ามสรุป ห้ามเพิ่มเติม ให้คัดลอกเท่านั้น
- ถ้าอ่านไม่ออกให้ใส่ [?]`

const results = {}
const existing = (() => {
  try { return JSON.parse(readFileSync(join(OUTPUT_DIR, 'all.json'), 'utf8')) } catch { return {} }
})()

for (let i = 0; i < files.length; i++) {
  const file = files[i]
  const imgPath = join(IMAGE_DIR, file)
  const name = basename(file, extname(file))

  // skip if already done
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

    const res = await client.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
        ]
      }],
      max_tokens: 2048,
    })

    const text = res.choices[0].message.content?.trim() ?? ''
    results[file] = text
    writeFileSync(join(OUTPUT_DIR, `${name}.txt`), text, 'utf8')
    console.log(`✓ (${text.split('\n').length} lines)`)
  } catch (e) {
    console.log(`✗ ERROR: ${e.message}`)
    results[file] = existing[file] ?? ''
  }

  // rate limit: 30 req/min on free tier
  if (i < files.length - 1) await new Promise(r => setTimeout(r, 2100))
}

writeFileSync(join(OUTPUT_DIR, 'all.json'), JSON.stringify(results, null, 2), 'utf8')
console.log(`\nDone! Saved to ${OUTPUT_DIR}/all.json`)
