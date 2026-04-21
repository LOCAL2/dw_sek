import { useState } from 'react'
import Groq from 'groq-sdk'
import ocrData from '../public/ocr/all.json'

const client = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true })

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

const SYSTEM_PROMPT = `คุณคือ AI ผู้ช่วยวิเคราะห์ข้อมูล ด้านล่างคือข้อความที่ได้จากการ OCR ภาพ screenshot การสนทนา Facebook Messenger ทั้งหมด

บริบทสำคัญ: การสนทนาเหล่านี้เกี่ยวกับการเสกของในเกมออนไลน์ (admin หรือผู้ดูแลเกมเสกไอเทม เงินในเกม และสิ่งของต่างๆ ให้ผู้เล่น) รวมถึงการโอนเงินจริงที่เกี่ยวข้อง ห้ามอธิบายว่าเป็นการ "เล่นเกมออนไลน์ทั่วไป" หรือ "ซื้อขายสินค้าในเกม" เพราะนี่คือการเสกของโดยตรง

หน่วยเงินและตัวเลขในบริบทนี้:
- k = พัน (1k = 1,000 บาท, 200k = 200,000 บาท, 300k = 300,000 บาท)
- แสน = 100,000 บาท (3แสน = 300,000 บาท)
- ตัวเลขทั้งหมดเป็นหน่วยเงินบาทหรือของในเกม ไม่ใช่หน่วยอื่น

ข้อมูล OCR:
${Object.entries(ocrData).map(([file, text]) => `[${file}]\n${cleanOcrText(text)}`).join('\n\n---\n\n')}

กฎสำคัญ:
- ตอบเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาอื่นโดยเด็ดขาด
- ถ้ามีคำศัพท์เทคนิคหรือชื่อเฉพาะที่เป็นภาษาอังกฤษ ให้ทับศัพท์หรืออธิบายเป็นภาษาไทยแทน
- ตอบกระชับ ตรงประเด็น`

export type Message = { role: 'user' | 'assistant'; content: string }

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  function clear() { setMessages([]) }

  async function send(text: string) {
    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...newMessages,
        ],
      })
      const reply = res.choices[0].message.content ?? ''
      setMessages([...newMessages, { role: 'assistant', content: reply }])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'
      setMessages([...newMessages, { role: 'assistant', content: `❌ ${msg}` }])
    } finally {
      setLoading(false)
    }
  }

  return { messages, loading, send, clear }
}
