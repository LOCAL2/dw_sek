import { useState, useEffect } from 'react'
import Groq from 'groq-sdk'
import ocrData from '../public/ocr/all.json'

const client = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true })

// กรองเฉพาะอักขระไทย อังกฤษ ตัวเลข และเครื่องหมายทั่วไป
function cleanOcrText(text: string): string {
  return text
    .split('\n')
    .map(line =>
      line
        .replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s.,!?:;()\-+%/\\'"@#]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
    )
    .filter(line => line.length > 1)
    .join('\n')
}

const cache: Record<string, string> = {}

export function useImageSummary(filename: string | null) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!filename) { setSummary(null); return }

    const raw = (ocrData as Record<string, string>)[filename]
    const text = cleanOcrText(raw ?? '')
    if (!text.trim()) { setSummary('ไม่พบข้อความในภาพนี้'); return }

    if (cache[filename]) { setSummary(cache[filename]); return }

    setLoading(true)
    setSummary(null)

    client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'สรุปเนื้อหาการสนทนาในภาพนี้แบบกระชับ 1-2 ประโยค ตอบเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาอื่นโดยเด็ดขาด ไม่ต้องมีคำนำ บริบท: การสนทนาเกี่ยวกับการเสกของในเกม (admin เสกไอเทมและเงินในเกมให้ผู้เล่น) และการโอนเงินจริง ห้ามเรียกว่าการซื้อขายสินค้าในเกมหรือการเล่นเกมทั่วไป หน่วย k = พัน เช่น 200k = 200,000 บาท, แสน = 100,000 บาท'
        },
        { role: 'user', content: text }
      ],
      max_tokens: 200,
    }).then(res => {
      const result = res.choices[0].message.content ?? ''
      cache[filename] = result
      setSummary(result)
    }).catch(() => {
      setSummary('ไม่สามารถสรุปได้')
    }).finally(() => setLoading(false))
  }, [filename])

  return { summary, loading }
}
