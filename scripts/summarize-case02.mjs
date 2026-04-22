import Groq from 'groq-sdk'
import { readFileSync, writeFileSync } from 'fs'

const API_KEY = process.env.VITE_GROQ_API_KEY || readFileSync('.env', 'utf8').match(/VITE_GROQ_API_KEY=(.+)/)?.[1]?.trim()
if (!API_KEY) { console.error('No GROQ API key found'); process.exit(1) }

const client = new Groq({ apiKey: API_KEY })

const OCR_PATH = './public/cases/case-02/ocr/all.json'
const OUT_PATH = './public/cases/case-02/ocr/summaries.json'

const ocrData = JSON.parse(readFileSync(OCR_PATH, 'utf8').replace(/^\uFEFF/, ''))

const existing = (() => {
  try { return JSON.parse(readFileSync(OUT_PATH, 'utf8').replace(/^\uFEFF/, '')) } catch { return {} }
})()

function cleanText(text) {
  return text.split('\n')
    .map(l => l.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s.,!?:;()\-+%/\\'"@#]/g, ' ').replace(/\s{2,}/g, ' ').trim())
    .filter(l => l.length > 1).join('\n')
}

const SYSTEM = 'สรุปเนื้อหาการสนทนาในภาพนี้แบบกระชับ 1-2 ประโยค ตอบเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาอื่นโดยเด็ดขาด ไม่ต้องมีคำนำ บริบท: การสนทนาเกี่ยวกับการซื้อขายไอดีเกมออนไลน์ โดยมีการโอนเงินจริงเพื่อแลกกับไอดีเกม หน่วย k = พัน เช่น 3k = 3,000 บาท'

const results = { ...existing }
const keys = Object.keys(ocrData)

console.log(`Found ${keys.length} entries, ${Object.keys(existing).length} already cached\n`)

for (let i = 0; i < keys.length; i++) {
  const key = keys[i]

  if (existing[key]) {
    console.log(`[${i+1}/${keys.length}] SKIP: ${key}`)
    continue
  }

  const text = cleanText(ocrData[key] ?? '')
  if (!text.trim()) {
    results[key] = 'ไม่พบข้อความในภาพนี้'
    console.log(`[${i+1}/${keys.length}] EMPTY: ${key}`)
    continue
  }

  process.stdout.write(`[${i+1}/${keys.length}] ${key} ... `)

  try {
    const res = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: text }
      ],
      max_tokens: 200,
      temperature: 0.2,
    })
    results[key] = res.choices[0].message.content?.trim() ?? ''
    console.log('✓')
  } catch (e) {
    console.log(`✗ ${e.message}`)
    results[key] = ''
  }

  writeFileSync(OUT_PATH, JSON.stringify(results, null, 2), 'utf8')
  if (i < keys.length - 1) await new Promise(r => setTimeout(r, 1200))
}

writeFileSync(OUT_PATH, JSON.stringify(results, null, 2), 'utf8')
console.log(`\nDone! Saved to ${OUT_PATH}`)
