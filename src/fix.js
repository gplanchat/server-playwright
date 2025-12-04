#!/usr/bin/env node

/**
 * Système de correction automatique du rendu HTML
 * Utilise l'analyse pour générer des corrections
 */

import { Mistral } from '@mistralai/mistralai';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import './config.js'; // Charger les variables d'environnement

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Corrige un fichier HTML basé sur l'analyse
 * @param {string} originalHtmlPath - Chemin vers le fichier HTML original
 * @param {string} analysisPath - Chemin vers le fichier d'analyse JSON
 * @param {Object} options - Options de correction
 * @returns {Promise<Object>} Résultats de la correction
 */
export async function fixRender(originalHtmlPath, analysisPath, options = {}) {
  const {
    apiKey = process.env.MISTRAL_API_KEY,
    model = 'mistral-large-latest',
    outputDir = path.join(__dirname, '../output'),
    autoApply = false,
  } = options;

  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY est requis. Définissez-la dans les variables d\'environnement.');
  }

  const client = new Mistral({ apiKey });

  // Lire les fichiers
  const originalHtml = await fs.readFile(originalHtmlPath, 'utf-8');
  const analysis = await fs.readJSON(analysisPath);

  console.log(chalk.blue('🔧 Génération des corrections...'));

  // Construire le prompt de correction
  const fixPrompt = buildFixPrompt(originalHtml, analysis);

  // Appeler l'API Mistral
  const response = await client.chat.complete({
    model,
    messages: [
      {
        role: 'system',
        content: `Tu es un expert en développement web. Tu corriges du code HTML/CSS/JavaScript 
pour résoudre des problèmes de rendu identifiés par une analyse. Tu fournis du code corrigé 
qui résout les problèmes tout en préservant la fonctionnalité existante.`,
      },
      {
        role: 'user',
        content: fixPrompt,
      },
    ],
    maxTokens: 4000,
    temperature: 0.3, // Plus déterministe pour les corrections de code
  });

  const correctedCode = response.choices[0].message.content;

  // Extraire le code corrigé
  const extractedCode = extractCodeFromResponse(correctedCode, originalHtml);

  // Sauvegarder la correction
  const timestamp = Date.now();
  const baseName = path.basename(originalHtmlPath, path.extname(originalHtmlPath));
  const correctedPath = path.join(outputDir, `${baseName}-corrected-${timestamp}.html`);
  const diffPath = path.join(outputDir, `${baseName}-diff-${timestamp}.md`);

  await fs.writeFile(correctedPath, extractedCode, 'utf-8');

  // Générer un diff
  const diff = generateDiff(originalHtml, extractedCode);
  await fs.writeFile(diffPath, diff, 'utf-8');

  const result = {
    original: originalHtmlPath,
    corrected: correctedPath,
    diff: diffPath,
    timestamp: new Date().toISOString(),
    problemsFixed: analysis.problems?.length || 0,
  };

  // Sauvegarder le résultat
  const resultPath = path.join(outputDir, `fix-${timestamp}.json`);
  await fs.writeJSON(resultPath, result, { spaces: 2 });

  console.log(chalk.green('✅ Corrections générées'));
  console.log(chalk.yellow(`   📝 HTML corrigé: ${correctedPath}`));
  console.log(chalk.yellow(`   📊 Diff: ${diffPath}`));
  console.log(chalk.yellow(`   📋 Résultats: ${resultPath}`));

  // Appliquer automatiquement si demandé
  if (autoApply) {
    await fs.copy(correctedPath, originalHtmlPath);
    console.log(chalk.green(`   ✅ Fichier original mis à jour: ${originalHtmlPath}`));
  }

  return result;
}

/**
 * Construit le prompt de correction
 */
function buildFixPrompt(originalHtml, analysis) {
  const problemsList = analysis.problems
    ?.map((p, i) => `${i + 1}. [${p.severity}] ${p.category}: ${p.description}\n   Localisation: ${p.location || 'N/A'}\n   Correction suggérée: ${p.suggested_fix || 'À déterminer'}`)
    .join('\n\n') || analysis.analysis;

  return `Corrige le code HTML suivant en résolvant les problèmes identifiés dans l'analyse.

PROBLÈMES IDENTIFIÉS:
${problemsList}

CODE HTML ORIGINAL:
\`\`\`html
${originalHtml}
\`\`\`

INSTRUCTIONS:
1. Corrige tous les problèmes identifiés dans l'analyse
2. Préserve toute la fonctionnalité existante
3. Améliore le code si nécessaire (accessibilité, performance, maintenabilité)
4. Assure-toi que le code corrigé est valide et bien formaté
5. Si des ressources externes (CSS, JS) sont nécessaires, inclut-les dans le HTML

Fournis le code HTML corrigé complet dans un bloc de code markdown.`;
}

/**
 * Extrait le code corrigé de la réponse de l'IA
 */
function extractCodeFromResponse(response, originalHtml) {
  // Chercher un bloc de code HTML
  const codeBlockMatch = response.match(/```(?:html)?\n([\s\S]*?)\n```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1];
  }

  // Chercher du HTML entre balises
  const htmlMatch = response.match(/<html[\s\S]*<\/html>/i);
  if (htmlMatch) {
    return htmlMatch[0];
  }

  // Si rien n'est trouvé, retourner l'original avec un avertissement
  console.warn(chalk.yellow('⚠️  Impossible d\'extraire le code corrigé, utilisation de l\'original'));
  return originalHtml;
}

/**
 * Génère un diff simple entre deux fichiers
 */
function generateDiff(original, corrected) {
  const originalLines = original.split('\n');
  const correctedLines = corrected.split('\n');
  
  let diff = '# Diff des corrections\n\n';
  diff += '## Résumé\n\n';
  diff += `- Lignes originales: ${originalLines.length}\n`;
  diff += `- Lignes corrigées: ${correctedLines.length}\n\n`;
  diff += '## Modifications principales\n\n';

  // Comparaison simple ligne par ligne
  const maxLines = Math.max(originalLines.length, correctedLines.length);
  let changes = 0;

  for (let i = 0; i < maxLines; i++) {
    const originalLine = originalLines[i] || '';
    const correctedLine = correctedLines[i] || '';

    if (originalLine !== correctedLine) {
      changes++;
      if (changes <= 20) { // Limiter à 20 changements pour la lisibilité
        diff += `### Ligne ${i + 1}\n\n`;
        diff += `**Avant:**\n\`\`\`html\n${originalLine}\n\`\`\`\n\n`;
        diff += `**Après:**\n\`\`\`html\n${correctedLine}\n\`\`\`\n\n`;
      }
    }
  }

  if (changes > 20) {
    diff += `\n... et ${changes - 20} autres modifications\n`;
  }

  diff += `\n## Total des modifications: ${changes} lignes\n`;

  return diff;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const originalHtmlPath = process.argv[2];
  const analysisPath = process.argv[3];
  const autoApply = process.argv.includes('--apply');

  if (!originalHtmlPath || !analysisPath) {
    console.error('Usage: node fix.js <original-html-path> <analysis-json-path> [--apply]');
    process.exit(1);
  }

  fixRender(originalHtmlPath, analysisPath, { autoApply })
    .then(() => {
      console.log(chalk.green('\n✅ Correction terminée avec succès'));
      process.exit(0);
    })
    .catch((error) => {
      console.error(chalk.red('❌ Erreur lors de la correction:'), error);
      process.exit(1);
    });
}

