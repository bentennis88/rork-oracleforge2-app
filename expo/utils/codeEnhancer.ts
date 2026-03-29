export function enhanceGeneratedCode(code: string, prompt: string): string {
  let enhanced = code;
  const promptLower = prompt.toLowerCase();
  
  if ((promptLower.includes('track') || 
       promptLower.includes('log') || 
       promptLower.includes('record')) &&
      !code.includes('AsyncStorage')) {
    enhanced = addPersistencePattern(enhanced);
  }
  
  if ((promptLower.includes('remind') || 
       promptLower.includes('notification') || 
       promptLower.includes('alert')) &&
      !code.includes('expo-notifications')) {
    enhanced = addNotificationPattern(enhanced);
  }
  
  if ((promptLower.includes('chart') || 
       promptLower.includes('graph') || 
       promptLower.includes('visualize')) &&
      !code.includes('react-native-chart-kit')) {
    enhanced = addChartPattern(enhanced);
  }
  
  return enhanced;
}

function addPersistencePattern(code: string): string {
  if (!code.includes('useEffect') || !code.includes('AsyncStorage.getItem')) {
    const loadPattern = `
  useEffect(() => {
    const loadData = async () => {
      try {
        const saved = await AsyncStorage.getItem(\`oracle_\${props.oracleId}_data\`);
        if (saved) {
          const data = JSON.parse(saved);
        }
      } catch (error) {
        console.error('Load error:', error);
      }
    };
    loadData();
  }, []);
`;
    code = code.replace('export default function', loadPattern + '\nexport default function');
  }
  
  return code;
}

function addNotificationPattern(code: string): string {
  if (!code.includes('Notifications.requestPermissionsAsync')) {
    const notificationPattern = `
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Enable notifications for reminders');
      }
    })();
  }, []);
`;
    code = code.replace('export default function', notificationPattern + '\nexport default function');
  }
  
  return code;
}

function addChartPattern(code: string): string {
  if (!code.includes('Dimensions.get')) {
    code = code.replace(
      'import {',
      'import { Dimensions,'
    );
  }
  
  return code;
}
