type SignalingMessage = {
  from: string;
  to: string;
  type: 'offer' | 'answer';
  data: string;
  timestamp: number;
};

// Store the callback functions for different user IDs
const listeners: Record<string, ((message: SignalingMessage) => void)[]> = {};

// Check for new messages every second (polling)
const checkInterval = 1000;
const intervals: Record<string, number> = {};

// Create a unique key for storing messages for a specific user
const getStorageKey = (userId: string) => `signaling:${userId}`;

// Send a signal to another user
export function sendSignal(
  fromUserId: string,
  toUserId: string,
  type: 'offer' | 'answer',
  data: string
): void {
  console.log(`Sending ${type} signal from ${fromUserId} to ${toUserId}`);

  const message: SignalingMessage = {
    from: fromUserId,
    to: toUserId,
    type,
    data,
    timestamp: Date.now(),
  };

  // Get existing messages for the recipient
  const storageKey = getStorageKey(toUserId);
  const existingMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
  
  // Add new message
  existingMessages.push(message);
  
  // Save back to localStorage
  localStorage.setItem(storageKey, JSON.stringify(existingMessages));
}

// Start listening for signals
export function startListening(
  userId: string,
  callback: (message: SignalingMessage) => void
): void {
  console.log(`Starting signal listener for user ${userId}`);
  
  // Add the callback to our listeners
  if (!listeners[userId]) {
    listeners[userId] = [];
  }
  listeners[userId].push(callback);
  
  // If this is the first listener for this user, start polling
  if (listeners[userId].length === 1) {
    intervals[userId] = window.setInterval(() => {
      pollMessages(userId);
    }, checkInterval);
  }
}

// Stop listening for signals
export function stopListening(userId: string): void {
  console.log(`Stopping signal listener for user ${userId}`);
  
  // Clear the interval if it exists
  if (intervals[userId]) {
    clearInterval(intervals[userId]);
    delete intervals[userId];
  }
  
  // Remove all listeners for this user
  delete listeners[userId];
}

// Poll for new messages
function pollMessages(userId: string): void {
  const storageKey = getStorageKey(userId);
  const messagesString = localStorage.getItem(storageKey);
  
  if (!messagesString) return;
  
  try {
    const messages: SignalingMessage[] = JSON.parse(messagesString);
    
    if (messages.length > 0) {
      // Process each message
      messages.forEach(message => {
        // Notify all listeners
        if (listeners[userId]) {
          listeners[userId].forEach(callback => {
            try {
              callback(message);
            } catch (error) {
              console.error('Error in signaling callback:', error);
            }
          });
        }
      });
      
      // Clear the messages after processing
      localStorage.setItem(storageKey, '[]');
    }
  } catch (error) {
    console.error('Error parsing signaling messages:', error);
  }
}
