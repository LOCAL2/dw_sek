import { useState } from 'react'
import Groq from 'groq-sdk'
import case01Ocr from '../public/cases/case-01/ocr/all.json'
import case02Ocr from '../public/cases/case-02/ocr/all.json'

const client = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true })

const ocrByCase: Record<string, Record<string, string>> = {
  'case-01': case01Ocr as Record<string, string>,
  'case-02': case02Ocr as Record<string, string>,
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

function buildSystemPrompt(caseId: string) {
  const ocrData = ocrByCase[caseId] ?? {}
  const ocrText = Object.entries(ocrData)
    .map(([file, text]) => `[${file}]\n${cleanOcrText(text)}`)
    .join('\n\n---\n\n')

  return `à¸„à¸¸à¸“à¸„à¸·à¸­ AI à¸œà¸¹à¹‰à¸Šà¹ˆà¸§à¸¢à¸§à¸´à¹€à¸„à¸£à¸²à¸°à¸«à¹Œà¸‚à¹‰à¸­à¸¡à¸¹à¸¥ à¸”à¹‰à¸²à¸™à¸¥à¹ˆà¸²à¸‡à¸„à¸·à¸­à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¸—à¸µà¹ˆà¹„à¸”à¹‰à¸ˆà¸²à¸à¸à¸²à¸£ OCR à¸ à¸²à¸ž screenshot à¸à¸²à¸£à¸ªà¸™à¸—à¸™à¸² Facebook Messenger à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”

à¸šà¸£à¸´à¸šà¸—à¸ªà¸³à¸„à¸±à¸: à¸à¸²à¸£à¸ªà¸™à¸—à¸™à¸²à¹€à¸«à¸¥à¹ˆà¸²à¸™à¸µà¹‰à¹€à¸à¸µà¹ˆà¸¢à¸§à¸à¸±à¸šà¸à¸²à¸£à¹€à¸ªà¸à¸‚à¸­à¸‡à¹ƒà¸™à¹€à¸à¸¡à¸­à¸­à¸™à¹„à¸¥à¸™à¹Œ à¹‚à¸”à¸¢à¸œà¸¹à¹‰à¹€à¸¥à¹ˆà¸™à¸•à¹‰à¸­à¸‡à¹‚à¸­à¸™à¹€à¸‡à¸´à¸™à¸ˆà¸£à¸´à¸‡à¹ƒà¸«à¹‰ admin à¹€à¸žà¸·à¹ˆà¸­à¹à¸¥à¸à¸à¸±à¸šà¹„à¸­à¹€à¸—à¸¡à¸«à¸£à¸·à¸­à¹€à¸‡à¸´à¸™à¹ƒà¸™à¹€à¸à¸¡ à¸‹à¸¶à¹ˆà¸‡à¹€à¸›à¹‡à¸™à¸à¸²à¸£à¸à¸£à¸°à¸—à¸³à¸—à¸µà¹ˆà¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡ à¹€à¸­à¸²à¹€à¸›à¸£à¸µà¸¢à¸šà¸œà¸¹à¹‰à¹€à¸¥à¹ˆà¸™ à¹à¸¥à¸°à¸œà¸´à¸”à¸à¸Žà¸‚à¸­à¸‡à¹€à¸à¸¡ à¸–à¹‰à¸² admin à¹„à¸¡à¹ˆà¹€à¸ªà¸à¸•à¸²à¸¡à¸—à¸µà¹ˆà¸‚à¸­à¸«à¸£à¸·à¸­à¹€à¸ªà¸à¹„à¸¡à¹ˆà¸„à¸£à¸šà¹ƒà¸«à¹‰à¸–à¸·à¸­à¸§à¹ˆà¸²à¹€à¸›à¹‡à¸™à¸à¸²à¸£à¹‚à¸à¸‡

à¸«à¸™à¹ˆà¸§à¸¢à¹€à¸‡à¸´à¸™à¹à¸¥à¸°à¸•à¸±à¸§à¹€à¸¥à¸‚à¹ƒà¸™à¸šà¸£à¸´à¸šà¸—à¸™à¸µà¹‰:
- k = à¸žà¸±à¸™ (1k = 1,000 à¸šà¸²à¸—, 200k = 200,000 à¸šà¸²à¸—, 300k = 300,000 à¸šà¸²à¸—)
- à¹à¸ªà¸™ = 100,000 à¸šà¸²à¸— (3à¹à¸ªà¸™ = 300,000 à¸šà¸²à¸—)
- à¸•à¸±à¸§à¹€à¸¥à¸‚à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”à¹€à¸›à¹‡à¸™à¸«à¸™à¹ˆà¸§à¸¢à¹€à¸‡à¸´à¸™à¸šà¸²à¸—à¸«à¸£à¸·à¸­à¸‚à¸­à¸‡à¹ƒà¸™à¹€à¸à¸¡ à¹„à¸¡à¹ˆà¹ƒà¸Šà¹ˆà¸«à¸™à¹ˆà¸§à¸¢à¸­à¸·à¹ˆà¸™

à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ OCR:
${ocrText}

à¸à¸Žà¸ªà¸³à¸„à¸±à¸:
- à¸•à¸­à¸šà¹€à¸›à¹‡à¸™à¸ à¸²à¸©à¸²à¹„à¸—à¸¢à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™ à¸«à¹‰à¸²à¸¡à¹ƒà¸Šà¹‰à¸ à¸²à¸©à¸²à¸­à¸·à¹ˆà¸™à¹‚à¸”à¸¢à¹€à¸”à¹‡à¸”à¸‚à¸²à¸”
- à¸–à¹‰à¸²à¸¡à¸µà¸„à¸³à¸¨à¸±à¸žà¸—à¹Œà¹€à¸—à¸„à¸™à¸´à¸„à¸«à¸£à¸·à¸­à¸Šà¸·à¹ˆà¸­à¹€à¸‰à¸žà¸²à¸°à¸—à¸µà¹ˆà¹€à¸›à¹‡à¸™à¸ à¸²à¸©à¸²à¸­à¸±à¸‡à¸à¸¤à¸© à¹ƒà¸«à¹‰à¸—à¸±à¸šà¸¨à¸±à¸žà¸—à¹Œà¸«à¸£à¸·à¸­à¸­à¸˜à¸´à¸šà¸²à¸¢à¹€à¸›à¹‡à¸™à¸ à¸²à¸©à¸²à¹„à¸—à¸¢à¹à¸—à¸™
- à¸•à¸­à¸šà¸à¸£à¸°à¸Šà¸±à¸š à¸•à¸£à¸‡à¸›à¸£à¸°à¹€à¸”à¹‡à¸™`
}

export type Message = { role: 'user' | 'assistant'; content: string }

export function useChat(caseId: string) {
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
          { role: 'system', content: buildSystemPrompt(caseId) },
          ...newMessages,
        ],
      })
      const reply = res.choices[0].message.content ?? ''
      setMessages([...newMessages, { role: 'assistant', content: reply }])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”'
      setMessages([...newMessages, { role: 'assistant', content: `âŒ ${msg}` }])
    } finally {
      setLoading(false)
    }
  }

  return { messages, loading, send, clear }
}





