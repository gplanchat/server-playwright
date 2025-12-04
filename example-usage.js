#!/usr/bin/env node

/**
 * Exemple d'utilisation du système avec un agent IA simulé
 * 
 * Cet exemple montre comment un agent IA pourrait utiliser
 * le système de test et correction HTML
 */

import { testAndFix } from './src/test.js';
import './src/config.js'; // Charger les variables d'environnement
import chalk from 'chalk';

/**
 * Agent IA simulé qui peut tester et corriger du HTML
 */
class HTMLFixAgent {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.MISTRAL_API_KEY;
    this.autoFix = options.autoFix || false;
  }

  /**
   * Traite une demande de l'utilisateur concernant un fichier HTML
   */
  async processRequest(userRequest, htmlPath) {
    console.log(chalk.blue.bold('\n🤖 Agent IA: Traitement de la demande\n'));
    console.log(chalk.white(`   Demande: "${userRequest}"`));
    console.log(chalk.white(`   Fichier: ${htmlPath}\n`));

    // Analyser l'intention
    const intent = this.analyzeIntent(userRequest);
    console.log(chalk.cyan(`   Intention détectée: ${intent}\n`));

    // Exécuter le test
    const result = await testAndFix(htmlPath, {
      autoFix: intent === 'fix',
      apiKey: this.apiKey,
    });

    // Générer la réponse
    return this.generateResponse(intent, result);
  }

  /**
   * Analyse l'intention de l'utilisateur
   */
  analyzeIntent(userRequest) {
    const lower = userRequest.toLowerCase();
    
    if (lower.includes('corriger') || lower.includes('fix') || lower.includes('réparer')) {
      return 'fix';
    }
    if (lower.includes('vérifier') || lower.includes('tester') || lower.includes('analyser')) {
      return 'analyze';
    }
    if (lower.includes('problème') || lower.includes('bug') || lower.includes('erreur')) {
      return 'analyze';
    }
    
    return 'analyze'; // Par défaut, analyser
  }

  /**
   * Génère une réponse basée sur les résultats
   */
  generateResponse(intent, result) {
    const response = {
      intent,
      success: true,
      message: '',
      details: {},
    };

    if (!result.analysis) {
      response.message = '⚠️  Impossible d\'analyser le fichier (clé API manquante ?)';
      response.success = false;
      return response;
    }

    const problems = result.analysis.problems || [];
    
    if (problems.length === 0) {
      response.message = '✅ Aucun problème détecté dans le rendu HTML !';
      response.details = {
        screenshot: result.capture.screenshot,
        analysis: result.analysis.analysisPath,
      };
      return response;
    }

    // Catégoriser les problèmes
    const critical = problems.filter(p => p.severity === 'critique');
    const major = problems.filter(p => p.severity === 'majeur');
    const minor = problems.filter(p => p.severity === 'mineur');

    if (intent === 'fix' && result.fix) {
      response.message = `✅ J'ai corrigé ${problems.length} problèmes détectés dans le rendu HTML.\n\n` +
                        `📊 Détails:\n` +
                        `   - Problèmes critiques: ${critical.length}\n` +
                        `   - Problèmes majeurs: ${major.length}\n` +
                        `   - Problèmes mineurs: ${minor.length}\n\n` +
                        `📁 Fichiers générés:\n` +
                        `   - HTML corrigé: ${result.fix.corrected}\n` +
                        `   - Diff: ${result.fix.diff}`;
      
      response.details = {
        problemsFixed: problems.length,
        correctedFile: result.fix.corrected,
        diffFile: result.fix.diff,
        problems: problems,
      };
    } else {
      response.message = `⚠️  J'ai détecté ${problems.length} problèmes dans le rendu HTML:\n\n`;
      
      if (critical.length > 0) {
        response.message += chalk.red(`   🔴 Critiques (${critical.length}):\n`);
        critical.slice(0, 3).forEach((p, i) => {
          response.message += `      ${i + 1}. ${p.description.substring(0, 60)}...\n`;
        });
        response.message += '\n';
      }
      
      if (major.length > 0) {
        response.message += chalk.yellow(`   🟡 Majeurs (${major.length}):\n`);
        major.slice(0, 3).forEach((p, i) => {
          response.message += `      ${i + 1}. ${p.description.substring(0, 60)}...\n`;
        });
        response.message += '\n';
      }
      
      if (minor.length > 0) {
        response.message += chalk.gray(`   ⚪ Mineurs (${minor.length}):\n`);
        response.message += `      ...\n\n`;
      }
      
      response.message += `📁 Analyse complète: ${result.analysis.analysisPath}\n\n`;
      response.message += `💡 Pour corriger automatiquement, demandez: "corrige ce fichier HTML"`;
      
      response.details = {
        problems: problems,
        analysis: result.analysis.analysisPath,
        screenshot: result.capture.screenshot,
        canFix: true,
      };
    }

    return response;
  }
}

// Exemple d'utilisation
async function main() {
  const htmlPath = process.argv[2] || './example.html';
  const userRequest = process.argv[3] || 'Vérifie ce fichier HTML';

  if (!process.env.MISTRAL_API_KEY) {
    console.error(chalk.red('❌ MISTRAL_API_KEY non définie'));
    console.log(chalk.yellow('   Définissez-la avec: export MISTRAL_API_KEY="votre-clé"'));
    process.exit(1);
  }

  const agent = new HTMLFixAgent({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const response = await agent.processRequest(userRequest, htmlPath);
    
    console.log(chalk.blue.bold('\n📋 Réponse de l\'agent:\n'));
    console.log(response.message);
    
    if (response.details.problems && response.details.problems.length > 0) {
      console.log(chalk.blue.bold('\n📊 Détails techniques:\n'));
      console.log(JSON.stringify(response.details, null, 2));
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Erreur:'), error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { HTMLFixAgent };

