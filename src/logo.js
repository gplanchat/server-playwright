#!/usr/bin/env node

/**
 * Système de création de logos composites
 * Crée des logos combinés en associant deux logos existants
 */

import sharp from 'sharp';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Télécharge une image depuis une URL
 * @param {string} url - URL de l'image
 * @returns {Promise<Buffer>} Buffer de l'image
 */
async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Erreur HTTP ${response.statusCode} lors du téléchargement de ${url}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Obtient les métadonnées d'une image
 * @param {Buffer} imageBuffer - Buffer de l'image
 * @returns {Promise<Object>} Métadonnées de l'image
 */
async function getImageMetadata(imageBuffer) {
  const metadata = await sharp(imageBuffer).metadata();
  return metadata;
}

/**
 * Crée un logo composite en combinant deux logos
 * @param {string|Buffer} primaryLogoUrl - URL ou buffer du logo principal
 * @param {string|Buffer} secondaryLogoUrl - URL ou buffer du logo secondaire
 * @param {Object} options - Options de création
 * @returns {Promise<Object>} Résultat avec le chemin du logo créé
 */
export async function createLogoComposite(primaryLogoUrl, secondaryLogoUrl, options = {}) {
  const {
    outputDir = path.join(__dirname, '../output'),
    outputName = null,
    spacing = 20, // Espacement entre les logos en pixels
    primaryLogoHeight = null, // Hauteur du logo principal (null = auto)
    secondaryLogoHeight = 40, // Hauteur du logo secondaire
    backgroundColor = { r: 255, g: 255, b: 255, alpha: 0 }, // Fond transparent par défaut
    padding = { top: 20, right: 20, bottom: 20, left: 20 },
    quality = 100, // Qualité PNG (1-100)
  } = options;

  await fs.ensureDir(outputDir);

  console.log(chalk.blue('🎨 Création du logo composite...'));

  // Télécharger ou utiliser les images
  let primaryLogoBuffer, secondaryLogoBuffer;

  if (Buffer.isBuffer(primaryLogoUrl)) {
    primaryLogoBuffer = primaryLogoUrl;
  } else if (typeof primaryLogoUrl === 'string') {
    if (primaryLogoUrl.startsWith('http://') || primaryLogoUrl.startsWith('https://')) {
      console.log(chalk.cyan(`📥 Téléchargement du logo principal depuis ${primaryLogoUrl}...`));
      primaryLogoBuffer = await downloadImage(primaryLogoUrl);
    } else {
      // C'est un chemin de fichier local
      primaryLogoBuffer = await fs.readFile(primaryLogoUrl);
    }
  } else {
    throw new Error('primaryLogoUrl doit être une URL, un chemin de fichier ou un Buffer');
  }

  if (Buffer.isBuffer(secondaryLogoUrl)) {
    secondaryLogoBuffer = secondaryLogoUrl;
  } else if (typeof secondaryLogoUrl === 'string') {
    if (secondaryLogoUrl.startsWith('http://') || secondaryLogoUrl.startsWith('https://')) {
      console.log(chalk.cyan(`📥 Téléchargement du logo secondaire depuis ${secondaryLogoUrl}...`));
      secondaryLogoBuffer = await downloadImage(secondaryLogoUrl);
    } else {
      // C'est un chemin de fichier local
      secondaryLogoBuffer = await fs.readFile(secondaryLogoUrl);
    }
  } else {
    throw new Error('secondaryLogoUrl doit être une URL, un chemin de fichier ou un Buffer');
  }

  // Obtenir les métadonnées des images
  const primaryMetadata = await getImageMetadata(primaryLogoBuffer);
  const secondaryMetadata = await getImageMetadata(secondaryLogoBuffer);

  console.log(chalk.gray(`   Logo principal: ${primaryMetadata.width}x${primaryMetadata.height}px`));
  console.log(chalk.gray(`   Logo secondaire: ${secondaryMetadata.width}x${secondaryMetadata.height}px`));

  // Calculer les dimensions finales
  const finalPrimaryHeight = primaryLogoHeight || primaryMetadata.height;
  const finalPrimaryWidth = Math.round(
    (finalPrimaryHeight / primaryMetadata.height) * primaryMetadata.width
  );
  const finalSecondaryWidth = Math.round(
    (secondaryLogoHeight / secondaryMetadata.height) * secondaryMetadata.width
  );

  // Redimensionner les logos
  const primaryResized = await sharp(primaryLogoBuffer)
    .resize(finalPrimaryWidth, finalPrimaryHeight, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  const secondaryResized = await sharp(secondaryLogoBuffer)
    .resize(finalSecondaryWidth, secondaryLogoHeight, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  // Créer le texte "by" si nécessaire (optionnel, peut être ajouté plus tard)
  // Pour l'instant, on combine juste les deux logos avec un espacement

  // Calculer les dimensions du canvas final
  const canvasWidth = padding.left + finalPrimaryWidth + spacing + finalSecondaryWidth + padding.right;
  const canvasHeight = padding.top + Math.max(finalPrimaryHeight, secondaryLogoHeight) + padding.bottom;

  // Créer le logo composite
  const composite = sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: backgroundColor,
    },
  });

  // Positionner les logos
  const primaryX = padding.left;
  const primaryY = padding.top + Math.max(0, Math.floor((canvasHeight - padding.top - padding.bottom - finalPrimaryHeight) / 2));

  const secondaryX = padding.left + finalPrimaryWidth + spacing;
  const secondaryY = padding.top + Math.max(0, Math.floor((canvasHeight - padding.top - padding.bottom - secondaryLogoHeight) / 2));

  const finalImage = await composite
    .composite([
      {
        input: primaryResized,
        left: primaryX,
        top: primaryY,
      },
      {
        input: secondaryResized,
        left: secondaryX,
        top: secondaryY,
      },
    ])
    .png({ quality, compressionLevel: 9 })
    .toBuffer();

  // Sauvegarder le logo
  const timestamp = Date.now();
  const filename = outputName || `logo-composite-${timestamp}.png`;
  const outputPath = path.join(outputDir, filename);

  await fs.writeFile(outputPath, finalImage);

  console.log(chalk.green('✅ Logo composite créé avec succès'));
  console.log(chalk.yellow(`   📁 Fichier: ${outputPath}`));
  console.log(chalk.gray(`   📐 Dimensions: ${canvasWidth}x${canvasHeight}px`));

  return {
    success: true,
    outputPath,
    filename,
    dimensions: {
      width: canvasWidth,
      height: canvasHeight,
    },
    metadata: {
      primaryLogo: {
        original: { width: primaryMetadata.width, height: primaryMetadata.height },
        final: { width: finalPrimaryWidth, height: finalPrimaryHeight },
      },
      secondaryLogo: {
        original: { width: secondaryMetadata.width, height: secondaryMetadata.height },
        final: { width: finalSecondaryWidth, height: secondaryLogoHeight },
      },
    },
  };
}

/**
 * Extrait le logo secondaire depuis un logo composite existant
 * @param {string|Buffer} compositeLogoUrl - URL ou buffer du logo composite
 * @param {Object} options - Options d'extraction
 * @returns {Promise<Buffer>} Buffer du logo secondaire extrait
 */
export async function extractSecondaryLogo(compositeLogoUrl, options = {}) {
  const {
    cropFromRight = true, // Extraire depuis la droite
    estimatedPrimaryWidthRatio = 0.6, // Ratio estimé de la largeur du logo principal (60% de l'image)
    margin = 10, // Marge de sécurité en pixels
  } = options;

  // Charger l'image composite
  let compositeBuffer;
  if (Buffer.isBuffer(compositeLogoUrl)) {
    compositeBuffer = compositeLogoUrl;
  } else if (typeof compositeLogoUrl === 'string') {
    if (compositeLogoUrl.startsWith('http://') || compositeLogoUrl.startsWith('https://')) {
      compositeBuffer = await downloadImage(compositeLogoUrl);
    } else {
      compositeBuffer = await fs.readFile(compositeLogoUrl);
    }
  } else {
    throw new Error('compositeLogoUrl doit être une URL, un chemin de fichier ou un Buffer');
  }

  const metadata = await getImageMetadata(compositeBuffer);

  if (cropFromRight) {
    // Extraire la partie droite (logo secondaire)
    const cropLeft = Math.floor(metadata.width * estimatedPrimaryWidthRatio) + margin;
    const cropWidth = metadata.width - cropLeft - margin;
    const cropHeight = metadata.height;

    const extracted = await sharp(compositeBuffer)
      .extract({
        left: cropLeft,
        top: 0,
        width: cropWidth,
        height: cropHeight,
      })
      .png()
      .toBuffer();

    return extracted;
  } else {
    // Extraire la partie gauche (logo principal)
    const cropWidth = Math.floor(metadata.width * estimatedPrimaryWidthRatio) - margin;
    const cropHeight = metadata.height;

    const extracted = await sharp(compositeBuffer)
      .extract({
        left: 0,
        top: 0,
        width: cropWidth,
        height: cropHeight,
      })
      .png()
      .toBuffer();

    return extracted;
  }
}

/**
 * Crée un logo composite à partir d'instructions textuelles
 * Utilise l'IA pour générer ou trouver le logo si nécessaire
 * @param {string} companyName - Nom de l'entreprise
 * @param {string} secondaryLogoUrl - URL du logo secondaire
 * @param {Object} options - Options de création
 * @returns {Promise<Object>} Résultat avec le chemin du logo créé
 */
export async function createLogoFromInstructions(companyName, secondaryLogoUrl, options = {}) {
  const {
    primaryLogoUrl = null, // Si fourni, utilise ce logo, sinon essaie de le trouver
    searchForLogo = true, // Essayer de trouver le logo automatiquement
    ...logoOptions
  } = options;

  console.log(chalk.blue(`🎨 Création du logo composite pour "${companyName}"...`));

  let primaryLogo = primaryLogoUrl;

  // Si aucun logo n'est fourni et que la recherche est activée, essayer de trouver le logo
  if (!primaryLogo && searchForLogo) {
    // Pour l'instant, on demande à l'utilisateur de fournir l'URL
    // Dans le futur, on pourrait utiliser une API de recherche d'images ou l'IA
    throw new Error(
      `Veuillez fournir l'URL du logo ${companyName} via l'option primaryLogoUrl. ` +
      `Exemple: createLogoFromInstructions("${companyName}", "${secondaryLogoUrl}", { primaryLogoUrl: "https://..." })`
    );
  }

  if (!primaryLogo) {
    throw new Error('primaryLogoUrl est requis pour créer le logo composite');
  }

  return await createLogoComposite(primaryLogo, secondaryLogoUrl, {
    ...logoOptions,
    outputName: options.outputName || `${companyName.toLowerCase()}-composite.png`,
  });
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const primaryLogoUrl = process.argv[2];
  const secondaryLogoUrl = process.argv[3];
  const outputName = process.argv[4];

  if (!primaryLogoUrl || !secondaryLogoUrl) {
    console.error('Usage: node logo.js <primary-logo-url> <secondary-logo-url> [output-name]');
    console.error('\nExemple:');
    console.error('  node logo.js https://example.com/logo1.png https://example.com/logo2.png composite-logo.png');
    process.exit(1);
  }

  createLogoComposite(primaryLogoUrl, secondaryLogoUrl, { outputName })
    .then((result) => {
      console.log('\n📋 Résumé:');
      console.log(`   Fichier créé: ${result.outputPath}`);
      console.log(`   Dimensions: ${result.dimensions.width}x${result.dimensions.height}px`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur lors de la création du logo:', error);
      process.exit(1);
    });
}

