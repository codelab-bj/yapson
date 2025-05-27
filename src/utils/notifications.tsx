export const markNotificationAsRead = (notificationId: string): boolean => {
  try {
    // Get current marked read notifications from localStorage
    const cachedReadIds = localStorage.getItem('markedAsReadNotifications');
    let readIdsSet: Set<string> = new Set();

    if (cachedReadIds) {
      try {
        const readIdsArray = JSON.parse(cachedReadIds);
        readIdsSet = new Set(readIdsArray);
      } catch (err) {
        console.error('Failed to parse cached read notifications', err);
        // Reset if corrupted
        localStorage.removeItem('markedAsReadNotifications');
        readIdsSet = new Set();
      }
    }

    // Add this notification ID to the set
    readIdsSet.add(notificationId);

    // Save back to localStorage
    localStorage.setItem(
      'markedAsReadNotifications',
      JSON.stringify(Array.from(readIdsSet))
    );

    return true;
  } catch (err) {
    console.error(`Failed to mark notification ${notificationId} as read:`, err);
    return false;
  }
};