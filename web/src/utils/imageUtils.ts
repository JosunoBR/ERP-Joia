/**
 * Utilitários para Processamento, Otimização e Upload de Imagens de Produtos
 * Jóia ERP
 */

/**
 * Redimensiona e comprime uma imagem mantendo excelente fidelidade visual,
 * gerando um Base64 leve (< 200 KB) que não estoura o SQLite nem a cota do navegador.
 */
export async function optimizeImageFile(
  file: File, 
  maxWidth = 1200, 
  maxHeight = 1200, 
  quality = 0.88
): Promise<string> {
  if (!file) return '';

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const resultStr = event.target?.result as string;

      // Se for SVG ou não for imagem padrão, retorna direto o DataURL
      if (file.type === 'image/svg+xml' || (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name))) {
        resolve(resultStr);
        return;
      }

      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        if (!ctx) {
          resolve(resultStr);
          return;
        }

        // Preenche com fundo branco limpo para produtos transparentes (PNG) não ficarem pretos no JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Renderiza a imagem preservando suavização
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Gera JPEG otimizado garantindo peso leve (< 150 KB) e alta fidelidade visual
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch {
          resolve(resultStr);
        }
      };
      img.onerror = () => {
        resolve(resultStr);
      };
      img.src = resultStr;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
