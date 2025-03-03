var createdWindowIds = [];
var timerInterval;
var remainingTime = 0;
var isRunning = false;
var elapsedTime = 0;

// Function to create a new window
function createNewWindow() {
  chrome.system.display.getInfo((displays) => {
    if (chrome.runtime.lastError) {
      console.error('Error accessing display information:', chrome.runtime.lastError);
      return;
    }

    const primaryDisplay = displays.find(display => display.isPrimary);
    if (!primaryDisplay) {
      console.error('No primary display found.');
      return;
    }

    const screenWidth = primaryDisplay.workArea.width;
    const screenHeight = primaryDisplay.workArea.height;

    const randomLeft = Math.floor(Math.random() * (screenWidth - 600));
    const randomTop = Math.floor(Math.random() * (screenHeight - 600));

    chrome.windows.create({
      url: 'popup.html',
      type: 'popup',
      width: 630,
      height: 720,
      left: randomLeft,
      top: randomTop,
      focused: false // Open the window without focusing it
    }, (newWindow) => {
      if (chrome.runtime.lastError) {
        console.error('Error creating window:', chrome.runtime.lastError);
      } else {
        createdWindowIds.push(newWindow.id);
        console.log('New window created with ID:', newWindow.id);
        bringWindowsToFront();
      }
    });
  });
}

// Function to bring all created windows to the front
function bringWindowsToFront() {
  createdWindowIds.forEach(windowId => {
    chrome.windows.update(windowId, { focused: true }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error focusing window:', chrome.runtime.lastError);
      } else {
        console.log(`Window with ID ${windowId} brought to front.`);
      }
    });
  });
}

// Function to toggle the visibility of all created windows
function toggleWindowVisibility() {
  if (createdWindowIds.length > 0) {
    createdWindowIds.forEach(windowId => {
      chrome.windows.get(windowId, (window) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting window:', chrome.runtime.lastError);
          return;
        }

        const newState = window.state === 'minimized' ? 'normal' : 'minimized';
        chrome.windows.update(windowId, { state: newState }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error updating window:', chrome.runtime.lastError);
          } else {
            console.log(`Window with ID ${windowId} state toggled to:`, newState);
          }
        });
      });
    });
  } else {
    showNoWindowNotification();
  }
}

// Function to show a notification when no window exists
function showNoWindowNotification() {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png', // Ensure you have an icon.png in your extension directory
    title: 'No Window Available',
    message: '暂无窗口，请右键新建窗口'
  }, (notificationId) => {
    console.log('Notification shown with ID:', notificationId);
  });
}

// Listen for window close events to manage window IDs
chrome.windows.onRemoved.addListener((windowId) => {
  const index = createdWindowIds.indexOf(windowId);
  if (index !== -1) {
    createdWindowIds.splice(index, 1);
    console.log(`Window with ID ${windowId} closed. Remaining windows: ${createdWindowIds.length}`);
  }

  if (createdWindowIds.length === 0) {
    console.log('All windows closed, resetting state.');
  }
});

// Ensure the event listener is registered only once
chrome.runtime.onInstalled.addListener(() => {
  // Create a context menu item
  chrome.contextMenus.create({
    id: "createNewWindow",
    title: "Create New Window",
    contexts: ["action"]
  });
});

// Listen for the extension icon click
chrome.action.onClicked.addListener(() => {
  // if (createdWindowIds.length === 0) {
  //   createNewWindow(); // Create a new window if none exist
  // } else {
  //   toggleWindowVisibility(); // Toggle visibility if windows already exist
  // }
  toggleWindowVisibility();
});

// Handle context menu item clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "createNewWindow") {
    createNewWindow();
  }
});

// Start the timer
function startTimer(time) {
  if (isRunning && !isPaused) return; // If already running and not paused, do nothing
  isRunning = true;
  isPaused = false;
  if (time !== undefined) remainingTime = time; // Set time only if provided
  console.log(`Starting timer with time: ${remainingTime}`);
  timerInterval = setInterval(() => {
    if (!isPaused) {
      remainingTime--;
      console.log(`Timer running: remaining time is ${remainingTime}`);
      chrome.runtime.sendMessage({ isRunning, remainingTime }); // Send timer status
      if (remainingTime <= 0) {
        clearInterval(timerInterval);
        isRunning = false;
        console.log('Timer ended');
        chrome.runtime.sendMessage({ isRunning, remainingTime: 0 }); // Ensure remainingTime is 0 when timer ends
      }
    }
  }, 1000);
}

// Listen for messages from other scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { action, time } = request;
  console.log(`Received action: ${action}, time: ${time}`);
  if (action === 'startTimer') {
    startTimer(time);
  } else if (action === 'pauseTimer') {
    isPaused = true;
    console.log('Timer paused', 'store remainingTime:', remainingTime);
  } else if (action === 'restartTimer') {
    clearInterval(timerInterval);
    isRunning = false;
    console.log('Timer restarted');
    chrome.runtime.sendMessage({ isRunning, remainingTime: 0 });
  } else if (action === 'resumeTimer') {
    isPaused = false;
  }
});
