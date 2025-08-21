import { toByteArray, fromByteArray } from "base64-js";

/**
 * Decode base64 string from an array
 * @param {BufferSource} bufferSource
 * @returns {string}
 */
function arrayToBase64(bufferSource: ArrayBuffer | Uint8Array): string {
  return fromByteArray(new Uint8Array(bufferSource));
}

/**
 * Encode base64 string into an array
 * @param {String} base64String
 * @returns {Uint8Array}
 */
function base64ToArray(base64String: string): Uint8Array {
  return toByteArray(base64String);
}

/**
 * Decode string from an array
 * @param {BufferSource} bufferSource
 * @returns {string}
 */
function arrayToString(bufferSource: ArrayBuffer | Uint8Array): string {
  const utf8Decoder = new TextDecoder();
  return utf8Decoder.decode(bufferSource);
}

/**
 * Encode string into an array
 * @param {String} string
 * @returns {Uint8Array}
 */
function stringToArray(string: string): Uint8Array {
  const utf8Encoder = new TextEncoder();
  return utf8Encoder.encode(string);
}

/**
 * Encode string into base64 string
 * @param {string} string
 * @returns {string}
 */
function stringToBase64(string: string): string {
  const byteArray = stringToArray(string);
  return arrayToBase64(byteArray);
}

/**
 * Encode JSON object into base64 string
 * @param {Object} json
 * @returns {string}
 */
function jsonToBase64(json: object): string {
  const jsonString = JSON.stringify(json);
  return fromByteArray(stringToArray(jsonString));
}

/**
 * Decode JSON object from base64 string
 * @param {string} b64string
 * @returns {Object}
 */
function base64ToJson(b64string: string): object {
  const byteArray = toByteArray(b64string);
  return JSON.parse(arrayToString(byteArray));
}

/**
 * Decode string from base64 string
 * @param {string} b64string
 * @returns {Object}
 */
function base64ToString(b64string: string): string {
  const byteArray = toByteArray(b64string);
  return arrayToString(byteArray);
}

/**
 * Transform an array into data URL
 * @param {BufferSource} bufferSource
 * @returns {string}
 */
function arrayToDataUrl(bufferSource: ArrayBuffer): string {
  const blob = new Blob([bufferSource]);
  return URL.createObjectURL(blob);
}

/**
 * Transform data URL into an array
 * @param {string} dataUrl
 * @returns {Promise.<Uint8Array>}
 */
async function dataUrlToArray(dataUrl: string): Promise<Uint8Array> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return blobToArray(blob);
}

/**
 * Transform file blob into an array
 * @param {Blob} blob
 * @returns {Promise.<Uint8Array>}
 */
async function blobToArray(blob: Blob): Promise<Uint8Array> {
  const fileBuffer = await new Response(blob).arrayBuffer();
  return new Uint8Array(fileBuffer);
}

function arrayBufferToArray(arrayBuffer: ArrayBuffer): Uint8Array {
  const buffer = Buffer.alloc(arrayBuffer.byteLength);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) {
    buffer[i] = view[i];
  }
  return new Uint8Array(buffer);
}

function mergeBuffers(buffer1: ArrayBuffer, buffer2: ArrayBuffer) {
  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
}

export {
  arrayToBase64,
  base64ToArray,
  base64ToString,
  stringToBase64,
  arrayToString,
  stringToArray,
  jsonToBase64,
  base64ToJson,
  arrayToDataUrl,
  dataUrlToArray,
  blobToArray,
  arrayBufferToArray,
  mergeBuffers,
};
