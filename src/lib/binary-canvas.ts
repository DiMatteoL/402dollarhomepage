/**
 * Binary Canvas Format v2
 *
 * Efficient binary encoding for sparse pixel data.
 * ~19x smaller than JSON for large canvases.
 *
 * Format:
 * ┌─────────────────────────────────────────────────┐
 * │ Header                                          │
 * │   [pixelCount: uint32]           4 bytes        │
 * ├─────────────────────────────────────────────────┤
 * │ Pixel Data (repeated pixelCount times)          │
 * │   [x: uint16]                    2 bytes        │
 * │   [y: uint16]                    2 bytes        │
 * │   [r: uint8]                     1 byte         │
 * │   [g: uint8]                     1 byte         │
 * │   [b: uint8]                     1 byte         │
 * │   [updateCount: uint8]           1 byte         │
 * │                                  = 8 bytes each │
 * └─────────────────────────────────────────────────┘
 *
 * Total size: 4 + (pixelCount × 8) bytes
 *
 * Note: owner is stored in DB but not transmitted for efficiency.
 * Price is derived client-side: price = 0.01 * (updateCount + 1)
 */

/** Size constants */
export const BINARY_HEADER_SIZE = 4;
export const BINARY_PIXEL_SIZE = 8;

/** Decoded pixel from binary format */
export interface BinaryPixel {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  updateCount: number;
}

/**
 * Parse hex color string to RGB components
 * @param hex - Color in "#rrggbb" format
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.startsWith("#") ? hex.slice(1) : hex;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

/**
 * Convert RGB components to hex color string
 * @returns Color in "#rrggbb" format
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Encode pixels to binary format
 * Used server-side to create the binary response
 *
 * @param pixels - Array of pixels with x, y, color (hex string), and updateCount
 * @returns ArrayBuffer containing encoded pixel data
 */
export function encodeCanvas(
  pixels: Array<{ x: number; y: number; color: string; updateCount: number }>
): ArrayBuffer {
  const pixelCount = pixels.length;
  const bufferSize = BINARY_HEADER_SIZE + pixelCount * BINARY_PIXEL_SIZE;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // Write header: pixel count
  view.setUint32(0, pixelCount, true); // little-endian

  // Write each pixel
  let offset = BINARY_HEADER_SIZE;
  for (const pixel of pixels) {
    const { r, g, b } = hexToRgb(pixel.color);

    view.setUint16(offset, pixel.x, true);
    view.setUint16(offset + 2, pixel.y, true);
    view.setUint8(offset + 4, r);
    view.setUint8(offset + 5, g);
    view.setUint8(offset + 6, b);
    view.setUint8(offset + 7, pixel.updateCount);

    offset += BINARY_PIXEL_SIZE;
  }

  return buffer;
}

/**
 * Decode binary format to pixel array
 * Used client-side to parse the binary response
 *
 * @param buffer - ArrayBuffer containing encoded pixel data
 * @returns Array of decoded pixels
 */
export function decodeCanvas(buffer: ArrayBuffer): BinaryPixel[] {
  const view = new DataView(buffer);

  // Read header
  const pixelCount = view.getUint32(0, true);

  // Validate buffer size
  const expectedSize = BINARY_HEADER_SIZE + pixelCount * BINARY_PIXEL_SIZE;
  if (buffer.byteLength < expectedSize) {
    throw new Error(
      `Invalid buffer size: expected ${expectedSize}, got ${buffer.byteLength}`
    );
  }

  // Read pixels
  const pixels: BinaryPixel[] = new Array(pixelCount);
  let offset = BINARY_HEADER_SIZE;

  for (let i = 0; i < pixelCount; i++) {
    pixels[i] = {
      x: view.getUint16(offset, true),
      y: view.getUint16(offset + 2, true),
      r: view.getUint8(offset + 4),
      g: view.getUint8(offset + 5),
      b: view.getUint8(offset + 6),
      updateCount: view.getUint8(offset + 7),
    };
    offset += BINARY_PIXEL_SIZE;
  }

  return pixels;
}

/**
 * Decode binary format directly into a Map for efficient rendering
 * Avoids intermediate array allocation
 *
 * @param buffer - ArrayBuffer containing encoded pixel data
 * @returns Map keyed by "x-y" with color and updateCount
 */
export function decodeCanvasToMap(
  buffer: ArrayBuffer
): Map<string, { x: number; y: number; color: string; updateCount: number }> {
  const view = new DataView(buffer);
  const pixelCount = view.getUint32(0, true);
  const map = new Map<
    string,
    { x: number; y: number; color: string; updateCount: number }
  >();

  let offset = BINARY_HEADER_SIZE;

  for (let i = 0; i < pixelCount; i++) {
    const x = view.getUint16(offset, true);
    const y = view.getUint16(offset + 2, true);
    const r = view.getUint8(offset + 4);
    const g = view.getUint8(offset + 5);
    const b = view.getUint8(offset + 6);
    const updateCount = view.getUint8(offset + 7);

    map.set(`${x}-${y}`, { x, y, color: rgbToHex(r, g, b), updateCount });
    offset += BINARY_PIXEL_SIZE;
  }

  return map;
}
