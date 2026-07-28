export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers: init?.body instanceof FormData ? init.headers : {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });
  const payload = await response.json().catch(() => ({ message: response.statusText }));
  if (!response.ok) throw Object.assign(new Error(payload.message ?? "Request failed"), payload);
  return payload;
}

export function post<T>(path: string, body: unknown) {
  return api<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function connectEvents(refresh: () => void) {
  const source = new EventSource("/api/stream");
  const handle = () => refresh();
  [
    "snapshot.required", "phase.changed", "team.progress", "participant.checked_in",
    "meme.photo_added", "qa.pair_matched", "team.theory_submitted", "participant.updated",
    "reveal.changed"
  ].forEach(event => source.addEventListener(event, handle));
  source.onerror = () => {
    // EventSource retries automatically; a successful event always triggers an authoritative snapshot.
  };
  return () => source.close();
}

export async function compressPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const max = 1800;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error("Could not compress photo")),
    "image/jpeg", 0.82
  ));
}

const DB_NAME = "orientation-pending-uploads";
function uploadDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("uploads", { keyPath: "assignmentId" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePending(assignmentId: string, blob: Blob) {
  const db = await uploadDb();
  const transaction = db.transaction("uploads", "readwrite");
  transaction.objectStore("uploads").put({ assignmentId, blob, savedAt: Date.now() });
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

export async function deletePending(assignmentId: string) {
  const db = await uploadDb();
  const transaction = db.transaction("uploads", "readwrite");
  transaction.objectStore("uploads").delete(assignmentId);
  await new Promise<void>(resolve => { transaction.oncomplete = () => resolve(); });
  db.close();
}

export async function listPending(): Promise<Array<{ assignmentId: string; blob: Blob }>> {
  const db = await uploadDb();
  const transaction = db.transaction("uploads", "readonly");
  const request = transaction.objectStore("uploads").getAll();
  const rows = await new Promise<Array<{ assignmentId: string; blob: Blob }>>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return rows;
}

export async function uploadPending(assignmentId: string, blob: Blob) {
  const form = new FormData();
  form.append("photo", blob, "capture.jpg");
  await api(`/api/volunteer/meme/${assignmentId}/upload`, { method: "POST", body: form });
  await deletePending(assignmentId);
}
