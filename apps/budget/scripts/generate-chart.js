#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function toPascalCase(str) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
    .replace(/\s+/g, '');
}

function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

async function generateChart() {
  console.log('📊 Chart Component Generator');
  console.log('============================\n');

  // Collect information
  const chartName = await question('Chart component name (e.g., "Monthly Spending Chart"): ');
  const chartType = toKebabCase(chartName);
  const template = await question('Chart template (bar/pie/line): ');
  
  // Validate template
  const validTemplates = ['bar', 'pie', 'line'];
  if (!validTemplates.includes(template)) {
    console.log(`❌ Invalid template. Choose from: ${validTemplates.join(', ')}`);
    rl.close();
    return;
  }

  const title = await question(`Chart title (default: "${chartName}"): `) || chartName;
  
  let additionalConfig = {};
  
  if (template === 'bar') {
    const isGrouped = (await question('Support grouped data (income vs expenses)? (y/n): ')).toLowerCase() === 'y';
    const primaryLabel = await question('Primary series label (e.g., "Expenses"): ');
    const secondaryLabel = isGrouped ? await question('Secondary series label (e.g., "Income"): ') : '';
    
    additionalConfig = {
      isGrouped,
      primaryLabel,
      secondaryLabel
    };
  } else if (template === 'pie') {
    const showLegend = (await question('Show legend by default? (y/n): ')).toLowerCase() === 'y';
    additionalConfig = { showLegend };
  } else if (template === 'line') {
    const period = await question('Default period (month/week/day): ') || 'month';
    additionalConfig = { period };
  }

  console.log('\n📝 Generating chart component...');

  // Read template
  const templateFile = `${template}-chart-template.svelte`;
  const templatePath = path.join(projectRoot, 'templates', 'charts', templateFile);
  let templateContent = fs.readFileSync(templatePath, 'utf8');

  // Replace placeholders
  const replacements = {
    '{{CHART_TITLE}}': title,
    '{{PRIMARY_SERIES_LABEL}}': additionalConfig.primaryLabel || 'Primary',
    '{{SECONDARY_SERIES_LABEL}}': additionalConfig.secondaryLabel || 'Secondary'
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    templateContent = templateContent.replace(new RegExp(placeholder, 'g'), value);
  }

  // Write chart file
  const chartFileName = `${chartType}.svelte`;
  const chartPath = path.join(projectRoot, 'src', 'lib', 'components', 'charts', chartFileName);
  
  fs.writeFileSync(chartPath, templateContent);
  console.log(`✅ Chart component created: ${chartPath}`);

  // Update chart components index
  const indexPath = path.join(projectRoot, 'src', 'lib', 'components', 'charts', 'index.ts');
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  const exportStatement = `export { default as ${toPascalCase(chartName)} } from './${chartFileName}';`;
  
  // Add export if not already present
  if (!indexContent.includes(exportStatement)) {
    indexContent += `\n${exportStatement}`;
    fs.writeFileSync(indexPath, indexContent);
    console.log(`✅ Chart index updated: ${indexPath}`);
  }

  console.log('\n🎉 Chart component generation complete!');
  console.log('\nNext steps:');
  console.log(`1. Import the chart: import { ${toPascalCase(chartName)} } from '$lib/components/charts';`);
  console.log('2. Use in your components with appropriate data props');
  console.log('3. Customize the chart styling and behavior as needed');
  console.log('4. Add TypeScript interfaces for your specific data structure');
  
  rl.close();
}

generateChart().catch(console.error);