import { services } from '../src/lib/services';

async function deleteWeekByNumber(weekNumber: number) {
  try {
    // You need to be authenticated as an admin for this to work.
    // This script assumes you have logged in as 'شوكا' in the browser
    // from which you run this script.
    const result = await services.invokeRpc('deleteWeek', { weekNumber });
    console.log(`Successfully deleted week ${weekNumber}.`);
    console.log('Result:', result);
  } catch (error) {
    console.error(`Failed to delete week ${weekNumber}:`, error);
  }
}

const weekNumberToDelete = 17;
deleteWeekByNumber(weekNumberToDelete);
