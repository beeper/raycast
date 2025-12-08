#!/usr/bin/env node

/**
 * Script to generate network icons from simple-icons
 * Run: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');
const simpleIcons = require('simple-icons');

// Get icons from simple-icons
const icons = {
  slack: simpleIcons.siSlack,
  whatsapp: simpleIcons.siWhatsapp,
  telegram: simpleIcons.siTelegram,
  discord: simpleIcons.siDiscord,
  instagram: simpleIcons.siInstagram,
  facebook: simpleIcons.siFacebook,
  messenger: simpleIcons.siMessenger,
  signal: simpleIcons.siSignal,
  linkedin: simpleIcons.siLinkedin,
  twitter: simpleIcons.siX,
  imessage: simpleIcons.siImessage,
  sms: simpleIcons.siAndroidmessages,
  email: simpleIcons.siGmail,
};

const outputDir = path.join(__dirname, '..', 'assets', 'icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate SVG files with proper styling for Raycast
// Use a dark color that Raycast can tint for light/dark mode
Object.entries(icons).forEach(([name, icon]) => {
  if (!icon) {
    console.log(`Skipping ${name} - icon not found`);
    return;
  }
  
  const svg = `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <title>${icon.title}</title>
  <path d="${icon.path}" fill="#${icon.hex}"/>
</svg>`;
  
  const filename = `${name}.png`;
  fs.writeFileSync(path.join(outputDir, filename.replace('.png', '.svg')), svg);
  console.log(`Generated ${filename.replace('.png', '.svg')}`);
});

console.log('\nAll icons generated successfully!');
