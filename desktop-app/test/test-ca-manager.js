/**
 * Tests for src/proxy/ca-manager.js — CA certificate generation.
 *
 * Note: installCA/uninstallCA/isCAInstalled tests require admin elevation.
 * They are skipped in non-elevated environments to avoid UAC prompts.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import forge from 'node-forge';
import {
  generateCA,
  getCaCertPath,
  getCaKeyPath,
  loadCA,
  ensureCA,
} from '../src/proxy/ca-manager.js';
import { CA_COMMON_NAME, CA_VALIDITY_YEARS } from '../src/shared/constants.js';

beforeEach(async () => {
  // Clean up CA files before each test
  await rm(getCaCertPath(), { force: true });
  await rm(getCaKeyPath(), { force: true });
});

describe('ca-manager', () => {
  it('generateCA() creates cert and key files on disk', async () => {
    const { certPem, keyPem } = await generateCA();

    expect(existsSync(getCaCertPath())).toBe(true);
    expect(existsSync(getCaKeyPath())).toBe(true);
    expect(certPem).toContain('-----BEGIN CERTIFICATE-----');
    expect(keyPem).toContain('-----BEGIN RSA PRIVATE KEY-----');
  });

  it('generated cert has correct CN', async () => {
    const { certPem } = await generateCA();
    const cert = forge.pki.certificateFromPem(certPem);
    const cn = cert.subject.getField('CN').value;

    expect(cn).toBe(CA_COMMON_NAME);
  });

  it('generated cert has CA:TRUE basicConstraints', async () => {
    const { certPem } = await generateCA();
    const cert = forge.pki.certificateFromPem(certPem);
    const bc = cert.getExtension('basicConstraints');

    expect(bc).toBeTruthy();
    expect(bc.cA).toBe(true);
  });

  it('generated cert has correct validity period', async () => {
    const { certPem } = await generateCA();
    const cert = forge.pki.certificateFromPem(certPem);

    const notBefore = cert.validity.notBefore;
    const notAfter = cert.validity.notAfter;
    const yearDiff = notAfter.getFullYear() - notBefore.getFullYear();

    expect(yearDiff).toBe(CA_VALIDITY_YEARS);
  });

  it('loadCA() reads back the generated cert and key', async () => {
    const original = await generateCA();
    const loaded = await loadCA();

    expect(loaded.certPem).toBe(original.certPem);
    expect(loaded.keyPem).toBe(original.keyPem);
  });

  it('ensureCA() generates on first call, loads on second', async () => {
    // First call — no files exist, should generate
    const first = await ensureCA();
    expect(first.certPem).toContain('-----BEGIN CERTIFICATE-----');

    // Second call — files exist, should load same cert
    const second = await ensureCA();
    expect(second.certPem).toBe(first.certPem);
    expect(second.keyPem).toBe(first.keyPem);
  });

  it('generated key is 2048-bit RSA', async () => {
    const { keyPem } = await generateCA();
    const key = forge.pki.privateKeyFromPem(keyPem);

    // 2048 bits = 256 bytes
    expect(key.n.bitLength()).toBe(2048);
  });
});
