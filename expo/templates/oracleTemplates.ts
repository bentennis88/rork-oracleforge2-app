export interface OracleTemplate {
  name: string;
  features: string[];
  basePrompt: string;
}

export const ORACLE_TEMPLATES: Record<string, OracleTemplate> = {
  tracker: {
    name: 'Basic Tracker Template',
    features: ['persistence', 'logs', 'streak', 'chart'],
    basePrompt: 'Create a tracker that logs entries with timestamps, maintains a streak counter, and shows a weekly chart',
  },
  reminder: {
    name: 'Reminder Template',
    features: ['notifications', 'scheduling', 'persistence'],
    basePrompt: 'Create a reminder system with customizable notifications and saved preferences',
  },
  list: {
    name: 'List Manager Template',
    features: ['crud', 'categories', 'persistence', 'search'],
    basePrompt: 'Create a list manager with add/edit/delete, categories, and search functionality',
  },
  journal: {
    name: 'Journal Template',
    features: ['rich-text', 'persistence', 'search', 'tags'],
    basePrompt: 'Create a journal with dated entries, tags, and full-text search',
  },
};

export function getTemplatePrompt(templateKey: string, customization: string): string {
  const template = ORACLE_TEMPLATES[templateKey];
  if (!template) return customization;
  
  return `${template.basePrompt}. ${customization}. Include these features: ${template.features.join(', ')}.`;
}
