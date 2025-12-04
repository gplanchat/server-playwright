#!/usr/bin/env node

/**
 * Configuration et chargement des variables d'environnement
 * Charge le fichier .env si présent
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers le fichier .env à la racine du projet
const envPath = path.join(__dirname, '../.env');

// Charger le fichier .env s'il existe
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Exporter les variables d'environnement pour utilisation
export const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

