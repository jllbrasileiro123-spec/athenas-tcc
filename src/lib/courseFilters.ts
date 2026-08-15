export const courseFilterKeys = [
  'filter.all',
  'filter.genai',
  'filter.ml',
  'filter.automation',
  'filter.data',
  'filter.productivity',
] as const

export type CourseFilterKey = (typeof courseFilterKeys)[number]

/** Palavras-chave fixas (PT/EN) para filtrar cursos — não depende do idioma da UI */
export const filterKeywords: Record<CourseFilterKey, string[]> = {
  'filter.all': [],
  'filter.genai': ['generativa', 'generative', 'chatgpt', 'gpt', 'prompt', 'llm', 'ia gener'],
  'filter.ml': ['machine learning', 'machine', 'ml', 'modelo', 'model', 'deep learning'],
  'filter.automation': ['automação', 'automation', 'bot', 'api', 'integração', 'integration', 'n8n'],
  'filter.data': ['dados', 'data', 'sql', 'analytics', 'pandas', 'dataset'],
  'filter.productivity': ['produtividade', 'productivity', 'notion', 'ferramenta', 'tool'],
}

export function courseMatchesFilter(
  course: { title: string; description?: string | null },
  filterKey: CourseFilterKey
): boolean {
  if (filterKey === 'filter.all') return true
  const keywords = filterKeywords[filterKey]
  const haystack = `${course.title} ${course.description ?? ''}`.toLowerCase()
  return keywords.some((kw) => haystack.includes(kw))
}
