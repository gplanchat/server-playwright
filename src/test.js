#!/usr/bin/env node

/**
 * Script de test complet : capture -> analyse -> correction
 * Orchestre tout le processus de test et correction
 */

import { captureRender } from './capture.js';
import { analyzeRender } from './analyze.js';
import { fixRender } from './fix.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import './config.js'; // Charger les variables d'environnement

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Teste et corrige un rendu HTML complet
 * @param {string} htmlPath - Chemin vers le fichier HTML ou URL
 * @param {Object} options - Options de test
 * @returns {Promise<Object>} Résultats complets
 */
export async function testAndFix(htmlPath, options = {}) {
  const {
    viewport = { width: 1920, height: 1080 },
    outputDir = path.join(__dirname, '../output'),
    autoFix = false,
    criteria = 'default',
    apiKey = process.env.MISTRAL_API_KEY,
  } = options;

  console.log(chalk.blue.bold('\n🚀 Démarrage du test et correction HTML\n'));

  // Étape 1: Capture
  console.log(chalk.cyan('📸 Étape 1/3: Capture du rendu...'));
  const capture = await captureRender(htmlPath, { viewport, outputDir });
  console.log(chalk.green('✅ Capture terminée\n'));

  // Étape 2: Analyse
  console.log(chalk.cyan('🔍 Étape 2/3: Analyse avec IA...'));
  if (!apiKey) {
    console.warn(chalk.yellow('⚠️  MISTRAL_API_KEY non définie, analyse ignorée'));
    return { capture, analysis: null, fix: null };
  }

  const analysis = await analyzeRender(
    capture.screenshot,
    capture.dom,
    capture.metadata,
    { apiKey, outputDir, criteria }
  );
  console.log(chalk.green('✅ Analyse terminée\n'));

  // Étape 3: Correction (si demandée)
  let fix = null;
  if (autoFix && analysis.problems && analysis.problems.length > 0) {
    console.log(chalk.cyan('🔧 Étape 3/3: Génération des corrections...'));
    
    // Utiliser le chemin du résultat JSON retourné par analyzeRender
    const analysisJsonPath = analysis.resultPath;
    
    if (analysisJsonPath && await fs.pathExists(analysisJsonPath)) {
      fix = await fixRender(htmlPath, analysisJsonPath, {
        apiKey,
        outputDir,
        autoApply: false,
      });
      console.log(chalk.green('✅ Corrections générées\n'));
    } else {
      console.warn(chalk.yellow(`⚠️  Fichier d'analyse JSON non trouvé: ${analysisJsonPath}`));
    }
  } else if (autoFix) {
    console.log(chalk.green('✅ Aucun problème détecté, pas de correction nécessaire\n'));
  }

  // Résumé
  console.log(chalk.blue.bold('\n📊 Résumé du test\n'));
  console.log(chalk.white(`   📷 Screenshot: ${capture.screenshot}`));
  console.log(chalk.white(`   📄 DOM: ${capture.dom}`));
  console.log(chalk.white(`   📊 Métadonnées: ${capture.metadata}`));
  
  if (analysis) {
    console.log(chalk.white(`   🔍 Analyse: ${analysis.analysisPath}`));
    console.log(chalk.red(`   ⚠️  Problèmes: ${analysis.problems.length}`));
    
    if (analysis.problems.length > 0) {
      console.log(chalk.yellow('\n   Problèmes détectés:'));
      analysis.problems.slice(0, 5).forEach((p, i) => {
        const severityColor = p.severity === 'critique' ? chalk.red : 
                             p.severity === 'majeur' ? chalk.yellow : chalk.gray;
        console.log(severityColor(`      ${i + 1}. [${p.severity}] ${p.description.substring(0, 60)}...`));
      });
      if (analysis.problems.length > 5) {
        console.log(chalk.gray(`      ... et ${analysis.problems.length - 5} autres`));
      }
    }
  }
  
  if (fix) {
    console.log(chalk.white(`   🔧 HTML corrigé: ${fix.corrected}`));
    console.log(chalk.white(`   📋 Diff: ${fix.diff}`));
  }

  return { capture, analysis, fix };
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const htmlPath = process.argv[2];
  const autoFix = process.argv.includes('--fix');

  if (!htmlPath) {
    console.error('Usage: node test.js <html-path-or-url> [--fix]');
    console.error('\nOptions:');
    console.error('  --fix    Génère automatiquement les corrections');
    process.exit(1);
  }

  testAndFix(htmlPath, { autoFix })
    .then(() => {
      console.log(chalk.green.bold('\n✅ Test terminé avec succès\n'));
      process.exit(0);
    })
    .catch((error) => {
      console.error(chalk.red.bold('\n❌ Erreur lors du test:'), error);
      process.exit(1);
    });
}

