/**
 * Передача фото состава между страницами без перезагрузки.
 * Форма на главной/лендингах кладёт выбранный файл сюда и делает router.push("/analyze?photo=1"),
 * страница разбора забирает его и сразу запускает распознавание.
 * Живёт в памяти клиентского бандла: переживает клиентский переход Next.js,
 * но не перезагрузку страницы — тогда /analyze?photo=1 просто подсвечивает кнопку загрузки.
 */

let pendingPhoto: File | null = null;

export function setPendingPhoto(file: File): void {
  pendingPhoto = file;
}

/** Забрать файл (одноразово): повторный вызов вернёт null. */
export function takePendingPhoto(): File | null {
  const file = pendingPhoto;
  pendingPhoto = null;
  return file;
}
