export interface GarmentPalette {
  readonly fill: string;
  readonly stroke: string;
  readonly collar: string;
}

export function isImageUrl(val?: string | null): boolean {
  if (!val) {
    return false;
  }
  const trimmed = val.trim();
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:')
  );
}

export function resolveGarmentPalette(colorRef?: string | null): GarmentPalette {
  const lower = (colorRef ?? '').toLowerCase();
  if (lower.includes('blanc') || lower.includes('white') || lower.includes('écru')) {
    return { fill: '#FFFFFF', stroke: '#94A3B8', collar: '#1E3A8A' };
  }
  if (lower.includes('marine') || lower.includes('navy')) {
    return { fill: '#172554', stroke: '#0F172A', collar: '#F8FAFC' };
  }
  if (lower.includes('ciel') || lower.includes('azur') || lower.includes('clair')) {
    return { fill: '#93C5FD', stroke: '#2563EB', collar: '#1E3A8A' };
  }
  if (lower.includes('bleu') || lower.includes('blue') || lower.includes('roi')) {
    return { fill: '#1D4ED8', stroke: '#1E3A8A', collar: '#FFFFFF' };
  }
  if (lower.includes('bordeaux') || lower.includes('grenat') || lower.includes('rouge')) {
    return { fill: '#991B1B', stroke: '#7F1D1D', collar: '#FEF2F2' };
  }
  if (lower.includes('vert') || lower.includes('green') || lower.includes('sapin')) {
    return { fill: '#166534', stroke: '#14532D', collar: '#F0FDF4' };
  }
  if (lower.includes('gris') || lower.includes('chiné') || lower.includes('anthracite')) {
    return { fill: '#64748B', stroke: '#334155', collar: '#F8FAFC' };
  }
  if (lower.includes('noir') || lower.includes('black')) {
    return { fill: '#1E293B', stroke: '#0F172A', collar: '#CBD5E1' };
  }
  if (lower.includes('beige') || lower.includes('kaki') || lower.includes('sable')) {
    return { fill: '#C2B280', stroke: '#85754E', collar: '#FEFCE8' };
  }
  if (lower.includes('jaune') || lower.includes('or') || lower.includes('moutarde')) {
    return { fill: '#D97706', stroke: '#92400E', collar: '#FFFBEB' };
  }
  return { fill: '#1E3A8A', stroke: '#172554', collar: '#FFFFFF' };
}

export function getGarmentSvgDataUrl(
  productType?: string | null,
  colorRef?: string | null
): string {
  const palette = resolveGarmentPalette(colorRef);
  const type = (productType ?? 'POLO').trim().toUpperCase();

  let bodyPath = '';
  let detailMarkup = '';

  if (type === 'TROUSERS_SKIRT') {
    bodyPath = 'M 38 20 L 82 20 L 90 102 L 66 102 L 60 54 L 54 102 L 30 102 Z';
    detailMarkup = `<line x1="38" y1="28" x2="82" y2="28" stroke="${palette.collar}" stroke-width="2" opacity="0.7"/>`;
  } else if (
    type === 'SWEATSHIRT' ||
    type === 'CARDIGAN' ||
    type === 'JACKET' ||
    type === 'TRACKSUIT'
  ) {
    bodyPath =
      'M 42 22 L 78 22 L 104 46 L 94 88 L 80 84 L 80 48 L 80 100 L 40 100 L 40 48 L 40 84 L 26 88 L 16 46 Z';
    detailMarkup = `
      <path d="M 48 22 Q 60 34 72 22" fill="none" stroke="${palette.collar}" stroke-width="3"/>
      <circle cx="70" cy="44" r="5" fill="#F59E0B" stroke="#FEF3C7" stroke-width="1.2"/>
    `;
  } else {
    bodyPath =
      'M 42 22 L 78 22 L 102 42 L 90 60 L 78 52 L 78 100 L 42 100 L 42 52 L 30 60 L 18 42 Z';
    detailMarkup = `
      <path d="M 47 22 Q 60 33 73 22" fill="none" stroke="${palette.collar}" stroke-width="3"/>
      <line x1="60" y1="28" x2="60" y2="42" stroke="${palette.collar}" stroke-width="2"/>
      <circle cx="70" cy="44" r="4.5" fill="#F59E0B" stroke="#FEF3C7" stroke-width="1.2"/>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="240" height="240">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#F8FAFC"/>
        <stop offset="100%" stop-color="#EEF2F6"/>
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="16" fill="url(#bg)"/>
    <path d="${bodyPath}" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="2.5" stroke-linejoin="round"/>
    ${detailMarkup}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function compressImageFileToDataUrl(
  file: File,
  maxDim = 640,
  preferPng = false
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire le fichier image.'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Format de fichier non supporté.'));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error('Image invalide ou corrompue.'));
      img.onload = () => {
        let width = img.naturalWidth || img.width || 300;
        let height = img.naturalHeight || img.height || 300;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }
        if (!preferPng) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        } else {
          ctx.clearRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = preferPng ? 'image/png' : 'image/jpeg';
        const dataUrl = preferPng
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL(mimeType, 0.85);
        resolve(dataUrl);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

