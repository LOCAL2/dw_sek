import Groq from 'groq-sdk'
import { readdirSync, writeFileSync, mkdirSync, readFileSync, renameSync } from 'fs'
import { join, basename, extname } from 'path'

const IMAGE_DIR = './public/cases/case-02/images'
const OUTPUT_DIR = './public/cases/case-02/ocr'
const API_KEY = process.env.VITE_GROQ_API_KEY || readFileSync('.env', 'utf8').match(/VITE_GROQ_API_KEY=(.+)/)?.[1]?.trim()

if (!API_KEY) { console.error('No GROQ API key found'); process.exit(1) }

const client = new Groq({ apiKey: API_KEY })

mkdirSync(OUTPUT_DIR, { recursive: true })

const files = readdirSync(IMAGE_DIR).filter(f =>
  ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(f).toLowerCase())
).sort()

// rename ถ้ายังไม่เป็น evidence-XX
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

console.log(`Found ${files.length} images, starting OCR + Analysis with Groq Vision...\n`)

const OCR_PROMPT = `คุณคือผู้เชี่ยวชาญด้านการอ่านข้อความจากภาพ screenshot แชท Facebook Messenger ภาษาไทย

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

const existing = (() => {
  try { return JSON.parse(readFileSync(join(OUTPUT_DIR, 'all.json'), 'utf8').replace(/^\uFEFF/, '')) } catch { return {} }
})()

const results = {}

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
    const imageUrl = { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }

    let text = ''
    let attempts = 0
    while (attempts < 3) {
      try {
        const res = await client.chat.completions.create({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [{ role: 'user', content: [{ type: 'text', text: OCR_PROMPT }, imageUrl] }],
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
console.log(`\nOCR done! Saved to ${OUTPUT_DIR}/all.json`)

// ── วิเคราะห์ภาพรวมทั้งหมด ──────────────────────────────
console.log('\nAnalyzing all evidence with AI...\n')

const allText = Object.entries(results)
  .map(([file, text]) => `[${file}]\n${text}`)
  .join('\n\n---\n\n')

try {
  const analysis = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `คุณคือผู้เชี่ยวชาญด้านการวิเคราะห์หลักฐานดิจิทัล ตอบเป็นภาษาไทยเท่านั้น
หน่วยเงิน: k = พัน, แสน = 100,000 บาท`
      },
      {
        role: 'user',
        content: `ต่อไปนี้คือข้อความที่ได้จากการ OCR ภาพ screenshot การสนทนา Facebook Messenger ทั้งหมด ${files.length} ภาพ

${allText}

กรุณาวิเคราะห์และสรุปดังนี้:
1. สรุปภาพรวมเหตุการณ์ที่เกิดขึ้น
2. บุคคลที่เกี่ยวข้องและบทบาท
3. การโอนเงินหรือธุรกรรมที่พบ (ระบุจำนวนเงินให้ชัดเจน)
4. พฤติกรรมที่น่าสงสัยหรือผิดปกติ
5. สรุปข้อสรุปโดยรวม`
      }
    ],
    max_tokens: 2000,
  })

  const analysisText = analysis.choices[0].message.content ?? ''
  writeFileSync(join(OUTPUT_DIR, 'analysis.txt'), analysisText, 'utf8')
  console.log('\n═══════════════════════════════════════')
  console.log('AI ANALYSIS RESULT:')
  console.log('═══════════════════════════════════════')
  console.log(analysisText)
  console.log('═══════════════════════════════════════')
  console.log(`\nSaved to ${OUTPUT_DIR}/analysis.txt`)
} catch (e) {
  console.log(`Analysis ERROR: ${e.message}`)
}
