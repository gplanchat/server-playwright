#!/usr/bin/env node

/**
 * Script de capture du rendu HTML
 * Capture le screenshot, le DOM, et les métadonnées d'une page HTML
 */

import { chromium } from 'playwright';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Capture le rendu d'une page HTML
 * @param {string} htmlPath - Chemin vers le fichier HTML ou URL
 * @param {Object} options - Options de capture
 * @returns {Promise<Object>} Données capturées
 */
export async function captureRender(htmlPath, options = {}) {
  const {
    viewport = { width: 1920, height: 1080 },
    waitUntil = 'networkidle0',
    timeout = 30000,
    outputDir = path.join(__dirname, '../output'),
    fullPage = false,
  } = options;

  // Créer le dossier de sortie
  await fs.ensureDir(outputDir);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Générer un nom de fichier unique
  const timestamp = Date.now();
  const baseName = path.basename(htmlPath, path.extname(htmlPath));
  const screenshotPath = path.join(outputDir, `${baseName}-${timestamp}.png`);
  const domPath = path.join(outputDir, `${baseName}-${timestamp}.html`);
  const metadataPath = path.join(outputDir, `${baseName}-${timestamp}.json`);

  // Capturer les métadonnées
  const metadata = {
    timestamp: new Date().toISOString(),
    url: htmlPath,
    viewport,
    console_messages: [],
    errors: [],
  };

  // Configurer les listeners AVANT de charger la page
  page.on('console', (msg) => {
    metadata.console_messages.push({
      type: msg.type(),
      text: msg.text(),
    });
  });

  page.on('pageerror', (error) => {
    metadata.errors.push({
      message: error.message,
      stack: error.stack,
    });
  });

  try {
    // Configurer la vue
    await page.setViewportSize(viewport);

    // Charger la page
    const isUrl = htmlPath.startsWith('http://') || htmlPath.startsWith('https://');
    const url = isUrl ? htmlPath : `file://${path.resolve(htmlPath)}`;
    
    console.log(`📸 Capture de ${url}...`);
    await page.goto(url, { waitUntil, timeout });

    // Attendre que le rendu soit stable
    await page.waitForTimeout(1000);

    // Capturer le screenshot
    await page.screenshot({
      path: screenshotPath,
      fullPage,
      type: 'png',
    });

    // Capturer le DOM
    const html = await page.content();
    await fs.writeFile(domPath, html, 'utf-8');

    // Compléter les métadonnées
    metadata.title = await page.title();
    metadata.url_final = page.url();
    metadata.viewport_size = viewport;
    
    // Capturer des informations d'accessibilité basiques via évaluation
    try {
      metadata.accessibility = await page.evaluate(() => {
        const issues = [];
        // Vérifier les images sans alt
        document.querySelectorAll('img:not([alt])').forEach(img => {
          issues.push({ type: 'missing_alt', element: 'img', count: 1 });
        });
        // Vérifier les boutons sans texte
        document.querySelectorAll('button:not(:has(*))').forEach(btn => {
          if (!btn.textContent.trim()) {
            issues.push({ type: 'empty_button', element: 'button' });
          }
        });
        // Vérifier les liens sans texte
        document.querySelectorAll('a:not(:has(*))').forEach(link => {
          if (!link.textContent.trim() && !link.getAttribute('aria-label')) {
            issues.push({ type: 'empty_link', element: 'a' });
          }
        });
        return {
          issues,
          totalImages: document.querySelectorAll('img').length,
          totalLinks: document.querySelectorAll('a').length,
          totalButtons: document.querySelectorAll('button').length,
        };
      });
    } catch (error) {
      metadata.accessibility = { error: 'Impossible de capturer les données d\'accessibilité', message: error.message };
    }
    
    // Capturer les métriques de performance
    try {
      metadata.performance = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0];
        if (perf) {
          return {
            domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
            loadComplete: perf.loadEventEnd - perf.loadEventStart,
            domInteractive: perf.domInteractive - perf.fetchStart,
          };
        }
        return null;
      });
    } catch (error) {
      metadata.performance = { error: 'Impossible de capturer les métriques de performance', message: error.message };
    }

    // Attendre un peu pour capturer les erreurs
    await page.waitForTimeout(500);

    // Sauvegarder les métadonnées
    await fs.writeJSON(metadataPath, metadata, { spaces: 2 });

    console.log(`✅ Capture terminée:`);
    console.log(`   📷 Screenshot: ${screenshotPath}`);
    console.log(`   📄 DOM: ${domPath}`);
    console.log(`   📊 Métadonnées: ${metadataPath}`);

    return {
      screenshot: screenshotPath,
      dom: domPath,
      metadata: metadataPath,
      data: metadata,
    };
  } finally {
    await browser.close();
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const htmlPath = process.argv[2];
  if (!htmlPath) {
    console.error('Usage: node capture.js <html-path-or-url>');
    process.exit(1);
  }

  captureRender(htmlPath)
    .then(() => {
      console.log('✅ Capture terminée avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur lors de la capture:', error);
      process.exit(1);
    });
}

