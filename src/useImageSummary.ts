import summaries from '../public/ocr/summaries.json'

export function useImageSummary(filename: string | null) {
  if (!filename) return { summary: null, loading: false }

  const summary = (summaries as Record<string, string>)[filename] ?? null
  return { summary: summary || 'ไม่พบข้อความในภาพนี้', loading: false }
}