/** Evento que abre o chat flutuante da Athena (FloatingAthenaDock) de qualquer tela. */
export const OPEN_ATHENA_EVENT = 'athenas:open-assistant'

export function openAthenaAssistant() {
  window.dispatchEvent(new Event(OPEN_ATHENA_EVENT))
}
