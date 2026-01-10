export function enhancePrompt(userPrompt: string): string {
  let enhanced = userPrompt;
  
  enhanced += '\n\nUI Requirements: Use modern design with gradients, shadows, and smooth animations. Include proper loading states and error handling.';
  
  if (containsIntent(userPrompt, 'reminder')) {
    enhanced += '\n\nReminder Features: Use expo-notifications for scheduling. Include toggle for enabling/disabling reminders. Show notification status.';
  }
  
  if (containsIntent(userPrompt, 'chart', 'graph', 'visualize', 'trend')) {
    enhanced += '\n\nVisualization: Use react-native-chart-kit with appropriate chart type (LineChart for trends, BarChart for comparisons, PieChart for distributions). Show last 7 days of data.';
  }
  
  if (containsIntent(userPrompt, 'track', 'log', 'record')) {
    enhanced += '\n\nData Persistence: Use AsyncStorage for local data and Firebase for cloud sync. Include streak counter if applicable. Show history of entries.';
  }
  
  if (containsIntent(userPrompt, 'list', 'todo', 'task')) {
    enhanced += '\n\nList Features: Include add, edit, delete, and mark complete. Add swipe gestures. Support categories or tags.';
  }
  
  return enhanced;
}

function containsIntent(text: string, ...keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(keyword => lower.includes(keyword));
}
