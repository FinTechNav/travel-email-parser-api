// debug-dates.js - Run this to isolate the date-fns issue
const { format, parseISO, isValid, differenceInDays } = require('date-fns');

console.log('Testing date-fns functions...');

try {
  // Test basic functionality
  const now = new Date();
  console.log('Current date:', now);
  
  // Test format function
  const formatted = format(now, 'yyyy-MM-dd HH:mm:ss:SSS');
  console.log('Formatted:', formatted);
  
  // Test parseISO
  const parsed = parseISO('2025-06-11T20:00:00');
  console.log('Parsed:', parsed);
  
  // Test isValid
  const valid = isValid(now);
  console.log('Is valid:', valid);
  
  // Test differenceInDays
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const diff = differenceInDays(tomorrow, now);
  console.log('Days difference:', diff);
  
  console.log('All date-fns functions working correctly!');
} catch (error) {
  console.error('Date-fns error found:', error);
  console.error('Stack:', error.stack);
}