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

async function generateWidget() {
  console.log('🎯 Widget Generator');
  console.log('==================\n');

  // Collect information
  const widgetName = await question('Widget name (e.g., "Balance Trend"): ');
  const widgetType = toKebabCase(widgetName);
  const isSimple = (await question('Is this a simple metric widget? (y/n): ')).toLowerCase() === 'y';
  
  let templateFile, additionalConfig = {};
  
  if (isSimple) {
    templateFile = 'simple-widget-template.svelte';
    const iconName = await question('Icon component name (e.g., "DollarSign"): ');
    const metricKey = await question('Data key for metric (e.g., "balance"): ');
    const isPositiveGood = (await question('Is positive change good for this metric? (y/n): ')).toLowerCase() === 'y';
    
    additionalConfig = {
      iconName,
      metricKey,
      previousMetricKey: `previous${metricKey.charAt(0).toUpperCase() + metricKey.slice(1)}`,
      isPositiveGood,
      additionalInfo: `Current ${widgetName.toLowerCase()}`
    };
  } else {
    templateFile = 'widget-template.svelte';
    const dataKey = await question('Data key for widget data (e.g., "categoryBreakdown"): ');
    const defaultChartType = await question('Default chart type (pie/bar/line): ');
    
    additionalConfig = {
      dataKey,
      defaultChartType
    };
  }

  console.log('\n📝 Generating widget...');

  // Read template
  const templatePath = path.join(projectRoot, 'templates', 'widgets', templateFile);
  let template = fs.readFileSync(templatePath, 'utf8');

  // Replace placeholders
  const replacements = {
    '{{WIDGET_NAME}}': toPascalCase(widgetName),
    '{{WIDGET_TYPE}}': widgetType,
    '{{DATA_KEY}}': additionalConfig.dataKey || additionalConfig.metricKey,
    '{{DEFAULT_CHART_TYPE}}': additionalConfig.defaultChartType || 'bar',
    '{{ICON_NAME}}': additionalConfig.iconName || 'BarChart',
    '{{METRIC_KEY}}': additionalConfig.metricKey || 'value',
    '{{PREVIOUS_METRIC_KEY}}': additionalConfig.previousMetricKey || 'previousValue',
    '{{IS_POSITIVE_GOOD}}': additionalConfig.isPositiveGood || true,
    '{{ADDITIONAL_INFO}}': additionalConfig.additionalInfo || 'Additional context'
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    template = template.replace(new RegExp(placeholder, 'g'), value);
  }

  // Write widget file
  const widgetFileName = `${widgetType}-widget.svelte`;
  const widgetPath = path.join(projectRoot, 'src', 'lib', 'components', 'widgets', widgetFileName);
  
  fs.writeFileSync(widgetPath, template);
  console.log(`✅ Widget created: ${widgetPath}`);

  // Update widget registry
  const registryPath = path.join(projectRoot, 'src', 'lib', 'components', 'widgets', 'widget-registry.ts');
  let registry = fs.readFileSync(registryPath, 'utf8');
  
  const importStatement = `import ${toPascalCase(widgetName)}Widget from './${widgetFileName}';`;
  const componentEntry = `  "${widgetType}": ${toPascalCase(widgetName)}Widget,`;
  
  // Add import
  const importIndex = registry.lastIndexOf('import ');
  const importEndIndex = registry.indexOf('\n', importIndex);
  registry = registry.slice(0, importEndIndex + 1) + importStatement + '\n' + registry.slice(importEndIndex + 1);
  
  // Add component
  const componentIndex = registry.lastIndexOf('};');
  registry = registry.slice(0, componentIndex) + componentEntry + '\n' + registry.slice(componentIndex);
  
  fs.writeFileSync(registryPath, registry);
  console.log(`✅ Registry updated: ${registryPath}`);

  // Update types
  const typesPath = path.join(projectRoot, 'src', 'lib', 'types', 'widgets.ts');
  let types = fs.readFileSync(typesPath, 'utf8');
  
  // Add to WidgetType union
  const widgetTypeMatch = types.match(/(export type WidgetType =[\s\S]*?);/);
  if (widgetTypeMatch) {
    const updatedType = widgetTypeMatch[1].replace(/;$/, ` | "${widgetType}";`);
    types = types.replace(widgetTypeMatch[0], updatedType);
  }
  
  // Add to WIDGET_DEFINITIONS
  const widgetDefinition = `  "${widgetType}": {
    type: "${widgetType}",
    name: "${widgetName}",
    description: "${widgetName} widget",
    icon: ${additionalConfig.iconName || 'BarChart'},
    defaultSize: "${isSimple ? 'small' : 'medium'}",
    availableSizes: ["small", "medium"${isSimple ? '' : ', "large"'}],
    defaultSettings: {${additionalConfig.defaultChartType ? `chartType: "${additionalConfig.defaultChartType}"` : ''}},
    configurable: ${!isSimple},
  },`;
  
  const definitionsIndex = types.lastIndexOf('};');
  types = types.slice(0, definitionsIndex) + widgetDefinition + '\n' + types.slice(definitionsIndex);
  
  fs.writeFileSync(typesPath, types);
  console.log(`✅ Types updated: ${typesPath}`);

  console.log('\n🎉 Widget generation complete!');
  console.log('\nNext steps:');
  console.log('1. Add the widget to DEFAULT_WIDGETS in widgets.ts if needed');
  console.log('2. Update the widget store calculateWidgetData() method');
  console.log('3. Test your new widget in the dashboard');
  
  rl.close();
}

generateWidget().catch(console.error);