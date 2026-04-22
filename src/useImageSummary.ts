import { useState, useEffect } from 'react'
import Groq from 'groq-sdk'
import case01Ocr from '../public/cases/case-01/ocr/all.json'
import case02Ocr from '../public/cases/case-02/ocr/all.json'
import case01Summaries from '../public/cases/case-01/ocr/summaries.json'
import case02Summaries from '../public/cases/case-02/ocr/summaries.json'

const client = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true })

const ocrByCase: Record<string, Record<string, string>> = {
  'case-01': case01Ocr as Record<string, string>,
  'case-02': case02Ocr as Record<string, string>,
}

const prebuiltSummaries: Record<string, Record<string, string>> = {
  'case-01': case01Summaries as Record<string, string>,
  'case-02': case02Summaries as Record<string, string>,
}

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

const runtimeCache: Record<string, string> = {}

export function useImageSummary(caseId: string, filename: string | null) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!filename) { setSummary(null); return }

    // 1. ใช้ pre-built summaries ก่อนเลย ไม่ต้องเรียก API
    const prebuilt = prebuiltSummaries[caseId]?.[filename]
    if (prebuilt) { setSummary(prebuilt); return }

    // 2. runtime cache
    const cacheKey = `${caseId}:${filename}`
    if (runtimeCache[cacheKey]) { setSummary(runtimeCache[cacheKey]); return }

    // 3. fallback เรียก API ถ้าไม่มี pre-built
    const raw = ocrByCase[caseId]?.[filename]
    const text = cleanOcrText(raw ?? '')
    if (!text.trim()) { setSummary('ไม่พบข้อความในภาพนี้'); return }

    setLoading(true)
    setSummary(null)

    client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'สรุปเนื้อหาการสนทนาในภาพนี้แบบกระชับ 1-2 ประโยค ตอบเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาอื่นโดยเด็ดขาด ไม่ต้องมีคำนำ หน่วย k = พัน เช่น 200k = 200,000 บาท'
        },
        { role: 'user', content: text }
      ],
      max_tokens: 200,
    }).then(res => {
      const result = res.choices[0].message.content ?? ''
      runtimeCache[cacheKey] = result
      setSummary(result)
    }).catch(() => {
      setSummary('ไม่สามารถสรุปได้')
    }).finally(() => setLoading(false))
  }, [caseId, filename])

  return { summary, loading }
}
