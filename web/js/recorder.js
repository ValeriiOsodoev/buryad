const DB_NAME = 'buryad-audio';
const STORE_NAME = 'recordings';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {keyPath: 'phraseId'});
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putRecording(record) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => {
      db.close();
      resolve(record);
    };
    tx.onerror = () => {
      const error = tx.error;
      db.close();
      reject(error);
    };
  });
}

async function getRecording(phraseId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(phraseId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function deleteRecording(phraseId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(phraseId);
    tx.oncomplete = () => {
      db.close();
      resolve(true);
    };
    tx.onerror = () => {
      const error = tx.error;
      db.close();
      reject(error);
    };
  });
}

export function createRecorderStore() {
  const supported = Boolean(
    globalThis.MediaRecorder &&
    globalThis.navigator?.mediaDevices?.getUserMedia &&
    globalThis.indexedDB,
  );
  let mediaRecorder = null;
  let stream = null;
  let chunks = [];
  let activePhraseId = null;

  async function cleanupStream() {
    stream?.getTracks?.().forEach((track) => track.stop());
    stream = null;
  }

  return {
    isSupported: supported,
    get activePhraseId() {
      return activePhraseId;
    },
    async start(phraseId) {
      if (!supported) throw new Error('recording-not-supported');
      if (mediaRecorder?.state === 'recording') throw new Error('recording-in-progress');
      stream = await navigator.mediaDevices.getUserMedia({audio: true});
      const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
      const mimeType = preferred.find((type) => MediaRecorder.isTypeSupported?.(type)) || '';
      mediaRecorder = mimeType ? new MediaRecorder(stream, {mimeType}) : new MediaRecorder(stream);
      chunks = [];
      activePhraseId = phraseId;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
      };
      mediaRecorder.start();
      return true;
    },
    async stop() {
      if (!mediaRecorder || mediaRecorder.state !== 'recording' || !activePhraseId) {
        throw new Error('recording-not-active');
      }
      const recorder = mediaRecorder;
      const phraseId = activePhraseId;
      const mimeType = recorder.mimeType || 'audio/webm';
      return new Promise((resolve, reject) => {
        recorder.onerror = (event) => reject(event.error || new Error('recording-failed'));
        recorder.onstop = async () => {
          try {
            const blob = new Blob(chunks, {type: mimeType});
            const record = {
              phraseId,
              blob,
              mimeType,
              updatedAt: new Date().toISOString(),
            };
            await putRecording(record);
            await cleanupStream();
            mediaRecorder = null;
            activePhraseId = null;
            chunks = [];
            resolve(record);
          } catch (error) {
            await cleanupStream();
            mediaRecorder = null;
            activePhraseId = null;
            chunks = [];
            reject(error);
          }
        };
        recorder.stop();
      });
    },
    async get(phraseId) {
      if (!supported) return null;
      return getRecording(phraseId);
    },
    async remove(phraseId) {
      if (!supported) return false;
      return deleteRecording(phraseId);
    },
    async cancel() {
      if (mediaRecorder?.state === 'recording') mediaRecorder.stop();
      await cleanupStream();
      mediaRecorder = null;
      activePhraseId = null;
      chunks = [];
    },
  };
}
