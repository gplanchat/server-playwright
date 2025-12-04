#!/usr/bin/env node

/**
 * Système de vérification de conformité du rendu HTML
 * Vérifie qu'un rendu HTML correspond à une description attendue ou à du CSS
 */

import { Mistral } from '@mistralai/mistralai';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { captureRender } from './capture.js';
import './config.js'; // Charger les variables d'environnement

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Vérifie qu'un rendu HTML correspond à une description attendue ou à du CSS
 * @param {string} htmlPath - Chemin vers le fichier HTML ou URL
 * @param {string} expectedDescription - Description détaillée du rendu attendu ou CSS attendu
 * @param {Object} options - Options de vérification
 * @returns {Promise<Object>} Résultats de la vérification
 */
export async function verifyRender(htmlPath, expectedDescription, options = {}) {
  const {
    apiKey = process.env.MISTRAL_API_KEY,
    model = 'pixtral-large-latest',
    outputDir = path.join(__dirname, '../output'),
    viewport = { width: 1920, height: 1080 },
    fullPage = false,
    verificationType = 'auto', // 'auto', 'description', 'css'
  } = options;

  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY est requis. Définissez-la dans les variables d\'environnement.');
  }

  const client = new Mistral({ apiKey });

  console.log(chalk.blue('📸 Étape 1/2: Capture du rendu...'));
  
  // Étape 1: Capturer le rendu
  const capture = await captureRender(htmlPath, {
    viewport,
    outputDir,
    fullPage,
  });

  console.log(chalk.blue('🔍 Étape 2/2: Vérification de conformité avec IA...'));

  // Lire les fichiers capturés
  const screenshot = await fs.readFile(capture.screenshot);
  const dom = await fs.readFile(capture.dom, 'utf-8');
  const metadata = await fs.readJSON(capture.metadata);

  // Détecter automatiquement le type de vérification
  let actualVerificationType = verificationType;
  if (verificationType === 'auto') {
    // Si la description contient des sélecteurs CSS ou des propriétés CSS, c'est probablement du CSS
    if (expectedDescription.match(/\{[^}]*:[^}]*\}/) || 
        expectedDescription.match(/@media|@keyframes|@import/) ||
        expectedDescription.match(/\.\w+|#\w+|\w+\s*\{/)) {
      actualVerificationType = 'css';
    } else {
      actualVerificationType = 'description';
    }
  }

  // Construire le prompt de vérification
  const verificationPrompt = buildVerificationPrompt(
    expectedDescription,
    actualVerificationType,
    metadata
  );
  
  const fullPrompt = `${verificationPrompt}\n\nVoici le code HTML/DOM de la page:\n\n\`\`\`html\n${dom.substring(0, 10000)}\n\`\`\`\n\n${dom.length > 10000 ? '(DOM tronqué pour la lisibilité)' : ''}`;

  // Convertir l'image en base64
  const imageBase64 = screenshot.toString('base64');

  // Appeler l'API Mistral avec vision
  let response;
  try {
    response = await client.chat.complete({
      model,
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en développement web et design UI/UX. 
Tu vérifies que le rendu d'une page web correspond exactement à une description attendue ou à des spécifications CSS.
Tu fournis une analyse détaillée de la conformité avec des écarts précis et des recommandations de correction.`,
        },
        {
          role: 'user',
          content: fullPrompt,
          images: [`data:image/png;base64,${imageBase64}`],
        },
      ],
      maxTokens: 3000,
    });
  } catch (error) {
    // Format alternatif
    console.warn(chalk.yellow('⚠️  Tentative avec format alternatif pour les images...'));
    response = await client.chat.complete({
      model,
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en développement web et design UI/UX. 
Tu vérifies que le rendu d'une page web correspond exactement à une description attendue ou à des spécifications CSS.
Tu fournis une analyse détaillée de la conformité avec des écarts précis et des recommandations de correction.`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: fullPrompt },
            { type: 'image_url', imageUrl: `data:image/png;base64,${imageBase64}` },
          ],
        },
      ],
      maxTokens: 3000,
    });
  }

  const verification = response.choices[0].message.content;

  // Sauvegarder la vérification
  const timestamp = Date.now();
  const verificationPath = path.join(outputDir, `verification-${timestamp}.md`);
  await fs.writeFile(verificationPath, verification, 'utf-8');

  // Parser la vérification pour extraire les résultats
  const verificationResult = parseVerification(verification);

  // Sauvegarder le résultat structuré
  const resultPath = path.join(outputDir, `verification-${timestamp}.json`);
  
  const result = {
    conform: verificationResult.conform,
    score: verificationResult.score,
    verification,
    discrepancies: verificationResult.discrepancies,
    verificationPath,
    resultPath,
    capture: {
      screenshot: capture.screenshot,
      dom: capture.dom,
      metadata: capture.metadata,
    },
    expectedDescription,
    verificationType: actualVerificationType,
    timestamp: new Date().toISOString(),
  };

  await fs.writeJSON(resultPath, result, { spaces: 2 });

  console.log(chalk.green('✅ Vérification terminée'));
  console.log(chalk.yellow(`   📝 Rapport: ${verificationPath}`));
  console.log(chalk.yellow(`   📊 Résultats: ${resultPath}`));
  console.log(chalk[verificationResult.conform ? 'green' : 'red'](
    `   ${verificationResult.conform ? '✅' : '❌'} Conformité: ${verificationResult.conform ? 'OUI' : 'NON'} (Score: ${verificationResult.score}/100)`
  ));
  if (verificationResult.discrepancies.length > 0) {
    console.log(chalk.red(`   ⚠️  Écarts détectés: ${verificationResult.discrepancies.length}`));
  }

  return result;
}

/**
 * Construit le prompt de vérification selon le type
 */
function buildVerificationPrompt(expectedDescription, verificationType, metadata) {
  if (verificationType === 'css') {
    return `Vérifie que le rendu de cette page web correspond EXACTEMENT aux spécifications CSS suivantes.

SPÉCIFICATIONS CSS ATTENDUES:
\`\`\`css
${expectedDescription}
\`\`\`

Métadonnées de la page:
- Titre: ${metadata.title}
- URL: ${metadata.url_final}
- Viewport: ${metadata.viewport.width}x${metadata.viewport.height}
- Erreurs JavaScript: ${metadata.errors.length}
- Messages console: ${metadata.console_messages.length}

INSTRUCTIONS:
1. Analyse la capture d'écran et compare-la avec les spécifications CSS fournies
2. Identifie TOUS les écarts entre le rendu actuel et les spécifications attendues
3. Pour chaque écart, indique:
   - La propriété CSS concernée
   - La valeur attendue vs la valeur observée
   - Le sélecteur CSS ou l'élément concerné
   - Le niveau de sévérité (critique, majeur, mineur)
4. Calcule un score de conformité de 0 à 100
5. Fournis des recommandations précises pour corriger chaque écart

Format de réponse (JSON si possible, sinon markdown structuré):
{
  "conform": true|false,
  "score": 0-100,
  "discrepancies": [
    {
      "severity": "critique|majeur|mineur",
      "property": "propriété CSS concernée",
      "expected": "valeur attendue",
      "actual": "valeur observée",
      "selector": "sélecteur CSS ou élément",
      "description": "description détaillée de l'écart",
      "suggested_fix": "correction suggérée"
    }
  ],
  "summary": "résumé de la conformité globale"
}`;
  } else {
    return `Vérifie que le rendu de cette page web correspond EXACTEMENT à la description suivante.

DESCRIPTION ATTENDUE DU RENDU:
${expectedDescription}

Métadonnées de la page:
- Titre: ${metadata.title}
- URL: ${metadata.url_final}
- Viewport: ${metadata.viewport.width}x${metadata.viewport.height}
- Erreurs JavaScript: ${metadata.errors.length}
- Messages console: ${metadata.console_messages.length}

INSTRUCTIONS:
1. Analyse la capture d'écran et compare-la avec la description attendue
2. Identifie TOUS les écarts entre le rendu actuel et la description
3. Pour chaque écart, indique:
   - L'élément ou la section concernée
   - Ce qui est attendu vs ce qui est observé
   - Le niveau de sévérité (critique, majeur, mineur)
   - La localisation dans le code (sélecteur CSS si possible)
4. Calcule un score de conformité de 0 à 100
5. Fournis des recommandations précises pour corriger chaque écart

Format de réponse (JSON si possible, sinon markdown structuré):
{
  "conform": true|false,
  "score": 0-100,
  "discrepancies": [
    {
      "severity": "critique|majeur|mineur",
      "element": "élément ou section concernée",
      "expected": "ce qui est attendu",
      "actual": "ce qui est observé",
      "location": "localisation dans le code",
      "description": "description détaillée de l'écart",
      "suggested_fix": "correction suggérée"
    }
  ],
  "summary": "résumé de la conformité globale"
}`;
  }
}

/**
 * Parse la vérification pour extraire les résultats structurés
 */
function parseVerification(verification) {
  const result = {
    conform: false,
    score: 0,
    discrepancies: [],
  };

  // Essayer de parser du JSON
  try {
    const jsonMatch = verification.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.conform !== undefined) {
        result.conform = parsed.conform;
      }
      if (parsed.score !== undefined) {
        result.score = parsed.score;
      }
      if (parsed.discrepancies && Array.isArray(parsed.discrepancies)) {
        result.discrepancies = parsed.discrepancies;
      }
      return result;
    }
  } catch (e) {
    // Continuer avec le parsing manuel
  }

  // Parser manuel du markdown
  const lines = verification.split('\n');
  let currentDiscrepancy = null;
  let inDiscrepanciesSection = false;

  for (const line of lines) {
    // Détecter la conformité
    if (line.match(/conform|conforme|conformité/i)) {
      const conformMatch = line.match(/(true|false|oui|non|yes|no)/i);
      if (conformMatch) {
        result.conform = ['true', 'oui', 'yes'].includes(conformMatch[1].toLowerCase());
      }
    }

    // Détecter le score
    const scoreMatch = line.match(/score[:\s]+(\d+)/i);
    if (scoreMatch) {
      result.score = parseInt(scoreMatch[1], 10);
    }

    // Détecter les écarts
    if (line.match(/écart|discrepancy|différence|problème/i)) {
      inDiscrepanciesSection = true;
      if (currentDiscrepancy) {
        result.discrepancies.push(currentDiscrepancy);
      }
      currentDiscrepancy = { severity: 'majeur' };
    }

    if (inDiscrepanciesSection && currentDiscrepancy) {
      if (line.match(/sévérité|severity/i)) {
        const match = line.match(/(critique|majeur|mineur|critical|major|minor)/i);
        if (match) {
          currentDiscrepancy.severity = match[1].toLowerCase();
        }
      } else if (line.match(/attendu|expected/i)) {
        const match = line.match(/[:]\s*(.+)/);
        if (match) {
          currentDiscrepancy.expected = match[1].trim();
        }
      } else if (line.match(/observé|actual|actuel/i)) {
        const match = line.match(/[:]\s*(.+)/);
        if (match) {
          currentDiscrepancy.actual = match[1].trim();
        }
      } else if (line.trim() && !line.match(/^#|^[-*]/)) {
        if (!currentDiscrepancy.description) {
          currentDiscrepancy.description = line.trim();
        } else {
          currentDiscrepancy.description += ' ' + line.trim();
        }
      }
    }
  }

  if (currentDiscrepancy) {
    result.discrepancies.push(currentDiscrepancy);
  }

  // Déterminer la conformité basée sur le score si non défini
  if (result.conform === false && result.score === 0 && result.discrepancies.length === 0) {
    // Si aucun écart n'est détecté, considérer comme conforme
    result.conform = true;
    result.score = 100;
  } else if (result.score >= 90) {
    result.conform = true;
  }

  return result;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const htmlPath = process.argv[2];
  const expectedDescription = process.argv[3];
  const verificationType = process.argv[4] || 'auto';

  if (!htmlPath || !expectedDescription) {
    console.error('Usage: node verify.js <html-path-or-url> <expected-description-or-css> [verification-type]');
    console.error('\nTypes de vérification:');
    console.error('  auto        - Détection automatique (défaut)');
    console.error('  description - Description textuelle du rendu attendu');
    console.error('  css         - Spécifications CSS attendues');
    process.exit(1);
  }

  verifyRender(htmlPath, expectedDescription, { verificationType })
    .then((result) => {
      console.log('\n📋 Résumé de la vérification:');
      console.log(`   Conformité: ${result.conform ? '✅ OUI' : '❌ NON'}`);
      console.log(`   Score: ${result.score}/100`);
      console.log(`   Écarts: ${result.discrepancies.length}`);
      if (result.discrepancies.length > 0) {
        console.log('\n   Écarts détectés:');
        result.discrepancies.slice(0, 5).forEach((d, i) => {
          const severityColor = d.severity === 'critique' ? chalk.red : 
                               d.severity === 'majeur' ? chalk.yellow : chalk.gray;
          console.log(severityColor(`      ${i + 1}. [${d.severity}] ${d.description || d.element || 'Écart non détaillé'}`));
        });
        if (result.discrepancies.length > 5) {
          console.log(chalk.gray(`      ... et ${result.discrepancies.length - 5} autres`));
        }
      }
      process.exit(result.conform ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Erreur lors de la vérification:', error);
      process.exit(1);
    });
}


