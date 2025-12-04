#!/usr/bin/env node

/**
 * Système d'analyse du rendu HTML avec vision IA
 * Analyse un screenshot et le DOM pour détecter les problèmes
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
 * Analyse un rendu HTML avec vision IA
 * @param {string} screenshotPath - Chemin vers le screenshot
 * @param {string} domPath - Chemin vers le fichier DOM
 * @param {string} metadataPath - Chemin vers les métadonnées
 * @param {Object} options - Options d'analyse
 * @returns {Promise<Object>} Résultats de l'analyse
 */
export async function analyzeRender(screenshotPath, domPath, metadataPath, options = {}) {
  const {
    apiKey = process.env.MISTRAL_API_KEY,
    model = 'pixtral-large-latest',
    outputDir = path.join(__dirname, '../output'),
    criteria = 'default',
  } = options;

  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY est requis. Définissez-la dans les variables d\'environnement.');
  }

  const client = new Mistral({ apiKey });

  // Lire les fichiers
  const screenshot = await fs.readFile(screenshotPath);
  const dom = await fs.readFile(domPath, 'utf-8');
  const metadata = await fs.readJSON(metadataPath);

  console.log(chalk.blue('🔍 Analyse du rendu avec IA...'));

  // Construire le prompt d'analyse
  const analysisPrompt = buildAnalysisPrompt(criteria, metadata);
  const fullPrompt = `${analysisPrompt}\n\nVoici le code HTML/DOM de la page:\n\n\`\`\`html\n${dom.substring(0, 10000)}\n\`\`\`\n\n${dom.length > 10000 ? '(DOM tronqué pour la lisibilité)' : ''}`;

  // Convertir l'image en base64
  const imageBase64 = screenshot.toString('base64');

  // Appeler l'API Mistral avec vision
  // Note: Mistral utilise un format spécifique pour les images
  // Le format peut varier selon la version du SDK, essayons les deux formats possibles
  let response;
  try {
    // Format 1: images dans le message (format le plus courant)
    response = await client.chat.complete({
      model,
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en développement web et design UI/UX. 
Tu analyses des captures d'écran de pages web et identifies les problèmes de rendu, 
d'accessibilité, de design, et de code. Tu fournis des analyses détaillées et des 
recommandations de correction précises.`,
        },
        {
          role: 'user',
          content: fullPrompt,
          images: [`data:image/png;base64,${imageBase64}`],
        },
      ],
      maxTokens: 2000,
    });
  } catch (error) {
    // Format 2: content avec array (format alternatif)
    console.warn(chalk.yellow('⚠️  Tentative avec format alternatif pour les images...'));
    response = await client.chat.complete({
      model,
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en développement web et design UI/UX. 
Tu analyses des captures d'écran de pages web et identifies les problèmes de rendu, 
d'accessibilité, de design, et de code. Tu fournis des analyses détaillées et des 
recommandations de correction précises.`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: fullPrompt },
            { type: 'image_url', imageUrl: `data:image/png;base64,${imageBase64}` },
          ],
        },
      ],
      maxTokens: 2000,
    });
  }

  const analysis = response.choices[0].message.content;

  // Sauvegarder l'analyse
  const timestamp = Date.now();
  const analysisPath = path.join(outputDir, `analysis-${timestamp}.md`);
  await fs.writeFile(analysisPath, analysis, 'utf-8');

  // Parser l'analyse pour extraire les problèmes
  const problems = parseAnalysis(analysis);

  // Sauvegarder le résultat structuré
  const resultPath = path.join(outputDir, `analysis-${timestamp}.json`);
  
  const result = {
    analysis,
    problems,
    analysisPath,
    resultPath, // Chemin vers le fichier JSON
    timestamp: new Date().toISOString(),
  };

  await fs.writeJSON(resultPath, result, { spaces: 2 });

  console.log(chalk.green('✅ Analyse terminée'));
  console.log(chalk.yellow(`   📝 Analyse: ${analysisPath}`));
  console.log(chalk.yellow(`   📊 Résultats: ${resultPath}`));
  console.log(chalk.red(`   ⚠️  Problèmes détectés: ${problems.length}`));

  return result;
}

/**
 * Construit le prompt d'analyse selon les critères
 */
function buildAnalysisPrompt(criteria, metadata) {
  const basePrompt = `Analyse cette capture d'écran d'une page web et identifie tous les problèmes de rendu.

Critères d'analyse:
- Problèmes visuels (alignement, espacement, couleurs, typographie)
- Problèmes de layout (responsive, overflow, éléments coupés)
- Problèmes d'accessibilité (contraste, taille des textes, labels)
- Problèmes de code (erreurs JavaScript, CSS manquant, éléments non chargés)
- Problèmes de performance (éléments lourds, ressources non optimisées)

Métadonnées de la page:
- Titre: ${metadata.title}
- URL: ${metadata.url_final}
- Viewport: ${metadata.viewport.width}x${metadata.viewport.height}
- Erreurs JavaScript: ${metadata.errors.length}
- Messages console: ${metadata.console_messages.length}

Fournis une analyse structurée avec:
1. Liste des problèmes identifiés (avec niveau de sévérité: critique, majeur, mineur)
2. Description détaillée de chaque problème
3. Localisation dans le code (sélecteurs CSS, lignes si possible)
4. Recommandations de correction spécifiques

Format de réponse (JSON si possible, sinon markdown structuré):
{
  "problems": [
    {
      "severity": "critique|majeur|mineur",
      "category": "visuel|layout|accessibilité|code|performance",
      "description": "...",
      "location": "...",
      "suggested_fix": "..."
    }
  ],
  "summary": "...",
  "score": 0-100
}`;

  return basePrompt;
}

/**
 * Parse l'analyse pour extraire les problèmes
 */
function parseAnalysis(analysis) {
  const problems = [];
  
  // Essayer de parser du JSON
  try {
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.problems) {
        return parsed.problems;
      }
    }
  } catch (e) {
    // Continuer avec le parsing manuel
  }

  // Parser manuel du markdown
  const lines = analysis.split('\n');
  let currentProblem = null;

  for (const line of lines) {
    if (line.match(/^#+\s+(Problème|Issue|Bug)/i)) {
      if (currentProblem) problems.push(currentProblem);
      currentProblem = { severity: 'majeur', category: 'général' };
    } else if (line.match(/Sévérité|Severity/i)) {
      const match = line.match(/(critique|majeur|mineur|critical|major|minor)/i);
      if (match && currentProblem) {
        currentProblem.severity = match[1].toLowerCase();
      }
    } else if (line.match(/Catégorie|Category/i)) {
      const match = line.match(/(visuel|layout|accessibilité|code|performance|visual|accessibility)/i);
      if (match && currentProblem) {
        currentProblem.category = match[1].toLowerCase();
      }
    } else if (line.trim() && currentProblem) {
      if (!currentProblem.description) {
        currentProblem.description = line.trim();
      } else {
        currentProblem.description += ' ' + line.trim();
      }
    }
  }

  if (currentProblem) problems.push(currentProblem);

  return problems;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const screenshotPath = process.argv[2];
  const domPath = process.argv[3];
  const metadataPath = process.argv[4];

  if (!screenshotPath || !domPath || !metadataPath) {
    console.error('Usage: node analyze.js <screenshot-path> <dom-path> <metadata-path>');
    process.exit(1);
  }

  analyzeRender(screenshotPath, domPath, metadataPath)
    .then((result) => {
      console.log('\n📋 Résumé de l\'analyse:');
      result.problems.forEach((p, i) => {
        console.log(`   ${i + 1}. [${p.severity}] ${p.description}`);
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur lors de l\'analyse:', error);
      process.exit(1);
    });
}

