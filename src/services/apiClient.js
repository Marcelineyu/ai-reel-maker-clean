async function parseApiResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = payload?.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return payload;
}

export async function postJson(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseApiResponse(res);
}

export async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function serializeAnchorImages(anchorImages = []) {
  const serialized = [];
  for (let i = 0; i < 3; i++) {
    const img = anchorImages[i];
    if (!img) {
      serialized.push(null);
      continue;
    }
    serialized.push({
      data: await blobToBase64(img),
      mimeType: img.type || 'image/png',
    });
  }
  return serialized;
}

export function base64ToBlob(base64, mimeType = 'application/octet-stream') {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}
