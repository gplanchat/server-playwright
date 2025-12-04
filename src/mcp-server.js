#!/usr/bin/env node

/**
 * Serveur MCP (Model Context Protocol) pour l'analyse et correction HTML
 * Expose les fonctionnalités de capture, analyse et correction comme outils MCP
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { captureRender } from './capture.js';
import { analyzeRender } from './analyze.js';
import { fixRender } from './fix.js';
import { testAndFix } from './test.js';
import { verifyRender } from './verify.js';
import './config.js'; // Charger les variables d'environnement

class PlaywrightMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'playwright-html-render',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  setupHandlers() {
    // Liste des outils disponibles
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'capture_html_render',
          description: 'Capture le rendu d\'une page HTML (screenshot, DOM, métadonnées)',
          inputSchema: {
            type: 'object',
            properties: {
              htmlPath: {
                type: 'string',
                description: 'Chemin vers le fichier HTML ou URL à capturer',
              },
              viewport: {
                type: 'object',
                properties: {
                  width: { type: 'number', default: 1920 },
                  height: { type: 'number', default: 1080 },
                },
                description: 'Taille du viewport pour la capture',
              },
              fullPage: {
                type: 'boolean',
                default: false,
                description: 'Capturer toute la page (scroll)',
              },
            },
            required: ['htmlPath'],
          },
        },
        {
          name: 'analyze_html_render',
          description: 'Analyse un rendu HTML avec vision IA pour détecter les problèmes',
          inputSchema: {
            type: 'object',
            properties: {
              screenshotPath: {
                type: 'string',
                description: 'Chemin vers le fichier screenshot PNG',
              },
              domPath: {
                type: 'string',
                description: 'Chemin vers le fichier DOM HTML',
              },
              metadataPath: {
                type: 'string',
                description: 'Chemin vers le fichier de métadonnées JSON',
              },
              criteria: {
                type: 'string',
                default: 'default',
                description: 'Critères d\'analyse (default, strict, accessibility)',
              },
            },
            required: ['screenshotPath', 'domPath', 'metadataPath'],
          },
        },
        {
          name: 'fix_html_render',
          description: 'Corrige un fichier HTML basé sur une analyse',
          inputSchema: {
            type: 'object',
            properties: {
              originalHtmlPath: {
                type: 'string',
                description: 'Chemin vers le fichier HTML original',
              },
              analysisPath: {
                type: 'string',
                description: 'Chemin vers le fichier d\'analyse JSON',
              },
              autoApply: {
                type: 'boolean',
                default: false,
                description: 'Appliquer automatiquement les corrections au fichier original',
              },
            },
            required: ['originalHtmlPath', 'analysisPath'],
          },
        },
        {
          name: 'test_and_fix_html',
          description: 'Teste et corrige un rendu HTML complet (capture + analyse + correction)',
          inputSchema: {
            type: 'object',
            properties: {
              htmlPath: {
                type: 'string',
                description: 'Chemin vers le fichier HTML ou URL à tester',
              },
              viewport: {
                type: 'object',
                properties: {
                  width: { type: 'number', default: 1920 },
                  height: { type: 'number', default: 1080 },
                },
                description: 'Taille du viewport pour la capture',
              },
              autoFix: {
                type: 'boolean',
                default: false,
                description: 'Générer automatiquement les corrections',
              },
              criteria: {
                type: 'string',
                default: 'default',
                description: 'Critères d\'analyse',
              },
            },
            required: ['htmlPath'],
          },
        },
        {
          name: 'verify_html_render',
          description: 'Vérifie qu\'un rendu HTML correspond à une description détaillée attendue ou à des spécifications CSS',
          inputSchema: {
            type: 'object',
            properties: {
              htmlPath: {
                type: 'string',
                description: 'Chemin vers le fichier HTML ou URL à vérifier',
              },
              expectedDescription: {
                type: 'string',
                description: 'Description détaillée du rendu attendu ou spécifications CSS',
              },
              viewport: {
                type: 'object',
                properties: {
                  width: { type: 'number', default: 1920 },
                  height: { type: 'number', default: 1080 },
                },
                description: 'Taille du viewport pour la capture',
              },
              fullPage: {
                type: 'boolean',
                default: false,
                description: 'Capturer toute la page (scroll)',
              },
              verificationType: {
                type: 'string',
                enum: ['auto', 'description', 'css'],
                default: 'auto',
                description: 'Type de vérification: auto (détection automatique), description (description textuelle), css (spécifications CSS)',
              },
            },
            required: ['htmlPath', 'expectedDescription'],
          },
        },
      ],
    }));

    // Gestion des appels d'outils
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'capture_html_render': {
            const result = await captureRender(args.htmlPath, {
              viewport: args.viewport || { width: 1920, height: 1080 },
              fullPage: args.fullPage || false,
            });

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    message: 'Capture terminée avec succès',
                    screenshot: result.screenshot,
                    dom: result.dom,
                    metadata: result.metadata,
                    data: result.data,
                  }, null, 2),
                },
              ],
            };
          }

          case 'analyze_html_render': {
            const result = await analyzeRender(
              args.screenshotPath,
              args.domPath,
              args.metadataPath,
              {
                criteria: args.criteria || 'default',
              }
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    message: 'Analyse terminée',
                    analysis: result.analysis,
                    problems: result.problems,
                    analysisPath: result.analysisPath,
                    resultPath: result.resultPath,
                    problemsCount: result.problems.length,
                  }, null, 2),
                },
              ],
            };
          }

          case 'fix_html_render': {
            const result = await fixRender(
              args.originalHtmlPath,
              args.analysisPath,
              {
                autoApply: args.autoApply || false,
              }
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    message: 'Correction générée',
                    original: result.original,
                    corrected: result.corrected,
                    diff: result.diff,
                    problemsFixed: result.problemsFixed,
                  }, null, 2),
                },
              ],
            };
          }

          case 'test_and_fix_html': {
            const result = await testAndFix(args.htmlPath, {
              viewport: args.viewport || { width: 1920, height: 1080 },
              autoFix: args.autoFix || false,
              criteria: args.criteria || 'default',
            });

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    message: 'Test et correction terminés',
                    capture: {
                      screenshot: result.capture?.screenshot,
                      dom: result.capture?.dom,
                      metadata: result.capture?.metadata,
                    },
                    analysis: result.analysis ? {
                      problemsCount: result.analysis.problems?.length || 0,
                      analysisPath: result.analysis.analysisPath,
                      resultPath: result.analysis.resultPath,
                      problems: result.analysis.problems,
                    } : null,
                    fix: result.fix ? {
                      corrected: result.fix.corrected,
                      diff: result.fix.diff,
                      problemsFixed: result.fix.problemsFixed,
                    } : null,
                  }, null, 2),
                },
              ],
            };
          }

          case 'verify_html_render': {
            const result = await verifyRender(
              args.htmlPath,
              args.expectedDescription,
              {
                viewport: args.viewport || { width: 1920, height: 1080 },
                fullPage: args.fullPage || false,
                verificationType: args.verificationType || 'auto',
              }
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    message: 'Vérification terminée',
                    conform: result.conform,
                    score: result.score,
                    discrepanciesCount: result.discrepancies?.length || 0,
                    discrepancies: result.discrepancies,
                    verificationPath: result.verificationPath,
                    resultPath: result.resultPath,
                    capture: {
                      screenshot: result.capture?.screenshot,
                      dom: result.capture?.dom,
                      metadata: result.capture?.metadata,
                    },
                    expectedDescription: result.expectedDescription,
                    verificationType: result.verificationType,
                  }, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Outil inconnu: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error.message,
                stack: error.stack,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Serveur MCP Playwright HTML Render démarré');
  }
}

// Démarrer le serveur
const server = new PlaywrightMCPServer();
server.run().catch(console.error);

