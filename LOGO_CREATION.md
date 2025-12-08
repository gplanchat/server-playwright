# 🎨 Création de Logos Composites

Ce module permet de créer des logos composites en combinant deux logos existants.

## ✨ Fonctionnalités

- **Création de logos composites** : Combine deux logos avec un espacement personnalisable
- **Haute qualité** : Utilise Sharp pour maintenir la qualité maximale des images
- **Téléchargement automatique** : Télécharge les logos depuis des URLs
- **Extraction de logos** : Peut extraire un logo depuis un logo composite existant
- **Personnalisation** : Contrôle total sur les dimensions, espacements, et padding

## 📦 Installation

Les dépendances sont déjà installées. Le module utilise `sharp` pour la manipulation d'images haute qualité.

## 🚀 Utilisation

### Via le CLI

#### Créer un logo composite simple

```bash
node src/logo.js <url-logo-principal> <url-logo-secondaire> [nom-fichier-sortie]
```

Exemple :
```bash
node src/logo.js https://example.com/logo1.png https://example.com/logo2.png composite-logo.png
```

### Via le code JavaScript

#### Créer un logo composite

```javascript
import { createLogoComposite } from './src/logo.js';

const result = await createLogoComposite(
  'https://example.com/logo1.png',  // Logo principal
  'https://example.com/logo2.png',  // Logo secondaire
  {
    outputName: 'composite-logo.png',
    spacing: 20,                    // Espacement entre les logos (px)
    primaryLogoHeight: 60,          // Hauteur du logo principal (px)
    secondaryLogoHeight: 40,        // Hauteur du logo secondaire (px)
    padding: {                      // Padding autour du logo
      top: 20,
      right: 20,
      bottom: 20,
      left: 20,
    },
    quality: 100,                   // Qualité PNG (1-100)
  }
);

console.log('Logo créé:', result.outputPath);
```

#### Créer un logo depuis des instructions

```javascript
import { createLogoFromInstructions } from './src/logo.js';

const result = await createLogoFromInstructions(
  'NomEntreprise',                  // Nom de l'entreprise
  'https://example.com/logo2.png',  // Logo secondaire
  {
    primaryLogoUrl: 'https://example.com/logo1.png',
    outputName: 'composite-logo.png',
    spacing: 20,
    primaryLogoHeight: 60,
    secondaryLogoHeight: 40,
  }
);
```

#### Extraire un logo depuis un logo composite

```javascript
import { extractSecondaryLogo } from './src/logo.js';
import fs from 'fs-extra';

// Extraire le logo secondaire depuis un logo composite
const secondaryLogoBuffer = await extractSecondaryLogo(
  'https://example.com/composite-logo.png',
  {
    cropFromRight: true,            // Extraire depuis la droite
    estimatedPrimaryWidthRatio: 0.65, // Le logo principal prend 65% de la largeur
    margin: 5,                      // Marge de sécurité (px)
  }
);

await fs.writeFile('secondary-logo-extracted.png', secondaryLogoBuffer);
```

### Via le serveur MCP

Le serveur MCP expose deux outils pour créer des logos :

#### 1. `create_logo_composite`

Crée un logo composite en combinant deux logos.

**Paramètres :**
- `primaryLogoUrl` (requis) : URL ou chemin vers le logo principal
- `secondaryLogoUrl` (requis) : URL ou chemin vers le logo secondaire
- `outputName` (optionnel) : Nom du fichier de sortie
- `spacing` (optionnel, défaut: 20) : Espacement entre les logos en pixels
- `primaryLogoHeight` (optionnel) : Hauteur du logo principal en pixels
- `secondaryLogoHeight` (optionnel, défaut: 40) : Hauteur du logo secondaire en pixels
- `padding` (optionnel) : Padding autour du logo
- `quality` (optionnel, défaut: 100) : Qualité PNG (1-100)

**Exemple :**
```json
{
  "name": "create_logo_composite",
  "arguments": {
    "primaryLogoUrl": "https://example.com/logo1.png",
    "secondaryLogoUrl": "https://example.com/logo2.png",
    "outputName": "composite-logo.png",
    "spacing": 20,
    "primaryLogoHeight": 60,
    "secondaryLogoHeight": 40
  }
}
```

#### 2. `create_logo_from_instructions`

Crée un logo composite à partir du nom d'une entreprise.

**Paramètres :**
- `companyName` (requis) : Nom de l'entreprise
- `secondaryLogoUrl` (requis) : URL ou chemin vers le logo secondaire
- `primaryLogoUrl` (requis) : URL ou chemin vers le logo de l'entreprise
- `outputName` (optionnel) : Nom du fichier de sortie
- `spacing` (optionnel, défaut: 20) : Espacement entre les logos
- `primaryLogoHeight` (optionnel) : Hauteur du logo principal
- `secondaryLogoHeight` (optionnel, défaut: 40) : Hauteur du logo secondaire

**Exemple :**
```json
{
  "name": "create_logo_from_instructions",
  "arguments": {
    "companyName": "NomEntreprise",
    "secondaryLogoUrl": "https://example.com/logo2.png",
    "primaryLogoUrl": "https://example.com/logo1.png",
    "outputName": "composite-logo.png"
  }
}
```

## 📝 Exemples

### Exemple 1 : Créer un logo composite simple

```bash
node src/logo.js \
  https://example.com/logo1.png \
  https://example.com/logo2.png \
  composite-logo.png
```

### Exemple 2 : Personnaliser les dimensions

```javascript
const result = await createLogoComposite(
  'https://example.com/logo1.png',
  'https://example.com/logo2.png',
  {
    primaryLogoHeight: 80,      // Logo principal plus grand
    secondaryLogoHeight: 50,    // Logo secondaire plus grand
    spacing: 30,                // Plus d'espace entre les logos
    padding: {
      top: 30,
      right: 30,
      bottom: 30,
      left: 30,
    },
  }
);
```

## 🔧 Options avancées

### Qualité et format

- `quality` : Contrôle la qualité PNG (1-100, 100 = meilleure qualité)
- Le format de sortie est toujours PNG pour maintenir la transparence

### Dimensions

- `primaryLogoHeight` : Si non spécifié, conserve les proportions originales
- `secondaryLogoHeight` : Par défaut 40px, ajustez selon vos besoins
- Les largeurs sont calculées automatiquement pour conserver les proportions

### Espacement et padding

- `spacing` : Espacement horizontal entre les deux logos
- `padding` : Espace autour de tout le logo composite
- Les valeurs sont en pixels

## 📁 Fichiers générés

Les logos créés sont sauvegardés dans le dossier `output/` avec :
- Le nom de fichier spécifié, ou
- Un nom généré automatiquement avec timestamp : `logo-composite-<timestamp>.png`

## ⚠️ Notes importantes

1. **Qualité des images** : Pour maintenir la meilleure qualité, utilisez des logos en haute résolution
2. **Transparence** : Le fond est transparent par défaut (alpha = 0)
3. **Proportions** : Les logos sont redimensionnés en conservant leurs proportions originales
4. **URLs** : Les URLs doivent être accessibles publiquement ou utiliser des chemins de fichiers locaux

## 🐛 Dépannage

### Erreur de téléchargement

Si une URL ne peut pas être téléchargée :
- Vérifiez que l'URL est accessible
- Vérifiez les permissions réseau
- Essayez d'utiliser un chemin de fichier local à la place

### Logo mal aligné

Ajustez les paramètres :
- `spacing` : Pour l'espacement horizontal
- `padding` : Pour l'espace autour
- `primaryLogoHeight` et `secondaryLogoHeight` : Pour l'alignement vertical

### Qualité dégradée

- Utilisez des logos source en haute résolution
- Augmentez `quality` à 100
- Vérifiez que les dimensions finales ne sont pas trop petites

## 📚 Références

- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [MCP Server Documentation](./README.md)
