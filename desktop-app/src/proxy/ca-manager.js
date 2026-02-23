/**
 * CA Certificate Manager — generates and installs a self-signed root CA
 * for HTTPS MITM proxy. The CA cert signs per-domain certs so browsers
 * trust intercepted connections.
 *
 * Uses node-forge for certificate generation, certutil for Windows trust store.
 */

import forge from 'node-forge';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  CA_DIR_NAME,
  CA_CERT_FILE,
  CA_KEY_FILE,
  CA_COMMON_NAME,
  CA_VALIDITY_YEARS,
} from '../shared/constants.js';
import { getStorageDir } from '../storage.js';

const execFileAsync = promisify(execFile);

/**
 * Get the directory where CA files are stored.
 * @returns {string}
 */
function getCaDir() {
  return join(getStorageDir(), CA_DIR_NAME);
}

/**
 * Get full path to the CA certificate file.
 * @returns {string}
 */
export function getCaCertPath() {
  return join(getCaDir(), CA_CERT_FILE);
}

/**
 * Get full path to the CA private key file.
 * @returns {string}
 */
export function getCaKeyPath() {
  return join(getCaDir(), CA_KEY_FILE);
}

/**
 * Generate a self-signed root CA certificate and private key.
 * Writes both to the CA directory. Overwrites if they already exist.
 *
 * @returns {Promise<{ certPem: string, keyPem: string }>}
 */
export async function generateCA() {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = generateSerial();
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(
    cert.validity.notBefore.getFullYear() + CA_VALIDITY_YEARS
  );

  const attrs = [{ name: 'commonName', value: CA_COMMON_NAME }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  cert.setExtensions([
    { name: 'basicConstraints', cA: true, critical: true },
    {
      name: 'keyUsage',
      keyCertSign: true,
      cRLSign: true,
      critical: true,
    },
    {
      name: 'subjectKeyIdentifier',
    },
  ]);

  // Self-sign with the CA's own private key
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const certPem = forge.pki.certificateToPem(cert);
  const keyPem = forge.pki.privateKeyToPem(keys.privateKey);

  // Write to disk
  const caDir = getCaDir();
  if (!existsSync(caDir)) {
    await mkdir(caDir, { recursive: true });
  }
  await writeFile(getCaCertPath(), certPem, 'utf-8');
  await writeFile(getCaKeyPath(), keyPem, 'utf-8');

  return { certPem, keyPem };
}

/**
 * Check if our CA certificate is already installed in the Windows
 * trusted root certificate store.
 *
 * @returns {Promise<boolean>}
 */
export async function isCAInstalled() {
  try {
    const { stdout } = await execFileAsync('certutil', [
      '-store', 'Root', CA_COMMON_NAME,
    ]);
    return stdout.includes(CA_COMMON_NAME);
  } catch {
    // certutil returns non-zero if cert not found
    return false;
  }
}

/**
 * Install the CA certificate into the Windows trusted root store.
 * Requires admin elevation — will prompt UAC if not elevated.
 *
 * @returns {Promise<void>}
 */
export async function installCA() {
  const certPath = getCaCertPath();
  if (!existsSync(certPath)) {
    throw new Error('CA certificate not found. Run generateCA() first.');
  }
  await execFileAsync('certutil', ['-addstore', 'Root', certPath]);
}

/**
 * Remove the CA certificate from the Windows trusted root store.
 *
 * @returns {Promise<void>}
 */
export async function uninstallCA() {
  try {
    await execFileAsync('certutil', [
      '-delstore', 'Root', CA_COMMON_NAME,
    ]);
  } catch {
    // Ignore errors if cert wasn't installed
  }
}

/**
 * Load the CA cert and key from disk as PEM strings.
 * @returns {Promise<{ certPem: string, keyPem: string }>}
 */
export async function loadCA() {
  const certPem = await readFile(getCaCertPath(), 'utf-8');
  const keyPem = await readFile(getCaKeyPath(), 'utf-8');
  return { certPem, keyPem };
}

/**
 * Ensure CA exists (generate if missing).
 * @returns {Promise<{ certPem: string, keyPem: string }>}
 */
export async function ensureCA() {
  if (existsSync(getCaCertPath()) && existsSync(getCaKeyPath())) {
    return loadCA();
  }
  return generateCA();
}

/**
 * Generate a random hex serial number for certificates.
 * @returns {string} 16-character hex string
 */
function generateSerial() {
  const bytes = forge.random.getBytesSync(8);
  return forge.util.bytesToHex(bytes);
}
