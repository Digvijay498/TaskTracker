// State management
let state = {
    tasks: [],
    points: 0,
    tradeItems: [],
    tradedItems: []
};

// Load saved data
function loadSavedData() {
    const savedData = localStorage.getItem('taskTrackerData');
    if (savedData) {
        state = JSON.parse(savedData);
        updateUI();
    }
}

// Save data
function saveData() {
    localStorage.setItem('taskTrackerData', JSON.stringify(state));
}

// Update UI elements
function updateUI() {
    updateGreeting();
    updatePoints();
    updateTasks();
    updateTodayTasks();
    updateTradeItems();
    updateTaskProgress();
}

// Greeting
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = '';
    
    if (hour < 12) greeting = 'Good Morning';
    else if (hour < 18) greeting = 'Good Afternoon';
    else greeting = 'Good Evening';
    
    document.getElementById('greeting').textContent = `${greeting}!`;
    
    // Update motivational quote
    const quotes = [
        "Every task completed is a step forward!",
        "Small progress is still progress.",
        "You're doing great! Keep going!",
        "Stay focused, stay productive!"
    ];
    document.getElementById('quote').textContent = quotes[Math.floor(Math.random() * quotes.length)];
}

// Points management
function updatePoints() {
    const pointsElement = document.getElementById('totalPoints');
    pointsElement.textContent = state.points;
}

function deductPoints(points) {
    if (state.points >= points) {
        const pointsElement = document.getElementById('totalPoints');
        state.points -= points;
        pointsElement.classList.add('points-flash');
        updatePoints();
        
        // Remove animation class after it completes
        setTimeout(() => {
            pointsElement.classList.remove('points-flash');
        }, 500);
        
        return true;
    }
    return false;
}

// Tasks management
function isTaskAvailable(task) {
    if (!task.lastCompleted || task.recurrence === 'none') return true;
    
    const now = new Date();
    const lastCompleted = new Date(task.lastCompleted);
    
    switch (task.recurrence) {
        case 'custom':
            if (!task.recurrenceDays || !task.recurrenceDays.length) return true;
            
            // If it's the same day, task is not available
            if (lastCompleted.toDateString() === now.toDateString()) return false;
            
            // Check if current day is in the recurrence days
            return task.recurrenceDays.includes(now.getDay());
            
        case 'daily':
            const nextDay = new Date(lastCompleted);
            nextDay.setDate(lastCompleted.getDate() + 1);
            nextDay.setHours(0, 0, 0, 0);
            return now >= nextDay;
            
        case 'weekly':
            const nextWeek = new Date(lastCompleted);
            nextWeek.setDate(lastCompleted.getDate() + 7);
            nextWeek.setHours(0, 0, 0, 0);
            return now >= nextWeek;
            
        case 'monthly':
            const nextMonth = new Date(lastCompleted);
            nextMonth.setMonth(lastCompleted.getMonth() + 1);
            nextMonth.setDate(1);
            nextMonth.setHours(0, 0, 0, 0);
            return now >= nextMonth;
            
        default:
            return true;
    }
}

function getNextTaskAvailableTime(task) {
    if (!task.lastCompleted || task.recurrence === 'none') return null;
    
    const lastCompleted = new Date(task.lastCompleted);
    let nextAvailable = new Date(lastCompleted);
    
    switch (task.recurrence) {
        case 'daily':
            nextAvailable.setDate(lastCompleted.getDate() + 1);
            nextAvailable.setHours(0, 0, 0, 0);
            break;
        case 'weekly':
            nextAvailable.setDate(lastCompleted.getDate() + 7);
            nextAvailable.setHours(0, 0, 0, 0);
            break;
        case 'monthly':
            nextAvailable.setMonth(lastCompleted.getMonth() + 1);
            nextAvailable.setDate(1);
            nextAvailable.setHours(0, 0, 0, 0);
            break;
        default:
            return null;
    }
    
    return nextAvailable;
}

function updateTasks() {
    const tasksList = document.getElementById('tasksList');
    tasksList.innerHTML = '';
    
    // Create a copy of tasks array for sorting
    const sortedTasks = [...state.tasks].sort((a, b) => {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const currentDay = now.getDay();
        
        // Helper function to get next occurrence day
        const getNextOccurrence = (task) => {
            if (!task.recurrence || task.recurrence === 'none') return currentDay;
            if (task.recurrence === 'daily') return currentDay;
            if (task.recurrence === 'weekly') {
                const lastCompleted = task.lastCompleted ? new Date(task.lastCompleted) : null;
                if (!lastCompleted) return currentDay;
                const nextWeek = new Date(lastCompleted);
                nextWeek.setDate(lastCompleted.getDate() + 7);
                return nextWeek.getDay();
            }
            if (task.recurrence === 'custom' && task.recurrenceDays) {
                // Find the next occurrence day from recurrenceDays
                const nextDay = task.recurrenceDays.find(day => day >= currentDay);
                return nextDay !== undefined ? nextDay : task.recurrenceDays[0];
            }
            return currentDay;
        };

        // Get next occurrence days
        const nextDayA = getNextOccurrence(a);
        const nextDayB = getNextOccurrence(b);
        
        // Calculate days until next occurrence
        const daysUntilA = nextDayA >= currentDay ? nextDayA - currentDay : 7 - (currentDay - nextDayA);
        const daysUntilB = nextDayB >= currentDay ? nextDayB - currentDay : 7 - (currentDay - nextDayB);
        
        // If days until next occurrence are different, sort by that first
        if (daysUntilA !== daysUntilB) {
            return daysUntilA - daysUntilB;
        }
        
        // If same day, sort by reminder time
        if (!a.reminder) return 1;
        if (!b.reminder) return -1;
        
        const timeA = a.reminder < currentTime ? '24:00' : a.reminder;
        const timeB = b.reminder < currentTime ? '24:00' : b.reminder;
        
        return timeA.localeCompare(timeB);
    });
    
    sortedTasks.forEach((task, index) => {
        const available = isTaskAvailable(task);
        const nextAvailable = !available ? getNextTaskAvailableTime(task) : null;
        
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${!available ? 'completed' : ''}`;
        
        let nextAvailableText = '';
        if (!available && nextAvailable) {
            nextAvailableText = `<p class="next-available">${formatTimeUntil(nextAvailable)}</p>`;
        }
        
        let recurrenceText = task.recurrence;
        if (task.recurrence === 'custom' && task.recurrenceDays) {
            recurrenceText = `Repeats on: ${formatRecurrenceDays(task.recurrenceDays)}`;
        }
        
        taskElement.innerHTML = `
            <div class="task-info">
                <h3>${task.name}</h3>
                <p>${recurrenceText}</p>
                ${nextAvailableText}
                ${task.reminder ? `<p class="reminder-time">⏰ Reminder: ${task.reminder}</p>` : ''}
            </div>
            <div class="task-actions">
                <span class="task-points">${task.points} Points to Earn</span>
                <button onclick="completeTask(${index})" 
                        class="complete-btn"
                        ${!available ? 'disabled' : ''}>
                    <i class="fas fa-check"></i>
                </button>
                <button onclick="deleteTask(${index})" class="delete-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        tasksList.appendChild(taskElement);
    });
    
    updateTaskProgress();
}

function completeTask(index) {
    const task = state.tasks[index];
    if (isTaskAvailable(task)) {
        // Add points
        state.points += task.points;
        
        // Update last completed time
        task.lastCompleted = new Date().toISOString();
        
        // If not recurring, remove the task
        if (task.recurrence === 'none') {
            state.tasks.splice(index, 1);
        }
        
        // Update UI
        updatePoints();
        updateTasks();
        saveData();
        
        // Show success message
        const pointsGained = document.createElement('div');
        pointsGained.className = 'points-flash';
        pointsGained.textContent = `+${task.points} Points Earned!`;
        document.querySelector('.points-display').appendChild(pointsGained);
        
        setTimeout(() => {
            pointsGained.remove();
        }, 1000);
    }
}

function deleteTask(index) {
    state.tasks.splice(index, 1);
    updateTasks();
    updateTaskProgress();
    saveData();
}

// Progress bar
function updateTaskProgress() {
    const total = state.tasks.length;
    const completed = state.tasks.filter(task => task.lastCompleted).length;
    const progress = total ? (completed / total) * 100 : 0;
    document.getElementById('taskProgress').style.width = `${progress}%`;
}

// Helper function to check if a task is scheduled for today
function isTaskScheduledForToday(task) {
    const now = new Date();
    const currentDay = now.getDay();
    const currentDate = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // If task has a last completion, check if it was completed today
    if (task.lastCompleted) {
        const lastCompleted = new Date(task.lastCompleted);
        const isCompletedToday = lastCompleted.getDate() === currentDate &&
                                lastCompleted.getMonth() === currentMonth &&
                                lastCompleted.getFullYear() === currentYear;
        if (isCompletedToday) return false;
    }
    
    // Check recurrence patterns
    switch (task.recurrence) {
        case 'none':
            return true; // One-time tasks are always shown until completed
            
        case 'daily':
            return true; // Daily tasks are always for today
            
        case 'weekly':
            if (!task.lastCompleted) return true;
            const lastCompleted = new Date(task.lastCompleted);
            const daysSinceCompletion = Math.floor((now - lastCompleted) / (1000 * 60 * 60 * 24));
            return daysSinceCompletion >= 7;
            
        case 'monthly':
            if (!task.lastCompleted) return true;
            const lastCompletedDate = new Date(task.lastCompleted);
            // If it's a different month or more than a month has passed
            return currentMonth !== lastCompletedDate.getMonth() ||
                   currentYear !== lastCompletedDate.getFullYear();
            
        case 'custom':
            if (!task.recurrenceDays || !task.recurrenceDays.length) return true;
            if (!task.lastCompleted) return task.recurrenceDays.includes(currentDay);
            
            const lastCompletedCustom = new Date(task.lastCompleted);
            const isCompletedThisWeek = Math.floor((now - lastCompletedCustom) / (1000 * 60 * 60 * 24)) < 7;
            
            return task.recurrenceDays.includes(currentDay) && !isCompletedThisWeek;
            
        default:
            return false;
    }
}

function updateTodayTasks() {
    const todayTasksList = document.getElementById('todayTasksList');
    todayTasksList.innerHTML = '';
    
    // Filter and sort today's tasks
    const todayTasks = state.tasks
        .filter(task => {
            // Show tasks scheduled for today, including completed ones
            const isScheduled = isTaskScheduledForToday(task);
            const completedToday = task.lastCompleted && 
                new Date(task.lastCompleted).toDateString() === new Date().toDateString();
            return isScheduled || completedToday;
        })
        .sort((a, b) => {
            const aCompleted = a.lastCompleted && 
                new Date(a.lastCompleted).toDateString() === new Date().toDateString();
            const bCompleted = b.lastCompleted && 
                new Date(b.lastCompleted).toDateString() === new Date().toDateString();
            
            // Sort completed tasks to the bottom
            if (aCompleted && !bCompleted) return 1;
            if (!aCompleted && bCompleted) return -1;
            
            // For tasks with same completion status, sort by reminder time
            if (!a.reminder && !b.reminder) return 0;
            if (!a.reminder) return 1;
            if (!b.reminder) return -1;
            
            const now = new Date();
            const currentTime = now.toTimeString().slice(0, 5);
            
            // Convert reminder times to comparable values
            const timeA = a.reminder < currentTime ? '24:00' : a.reminder;
            const timeB = b.reminder < currentTime ? '24:00' : b.reminder;
            
            return timeA.localeCompare(timeB);
        });
    
    // Update today's progress bar
    const todayProgress = document.getElementById('todayTaskProgress');
    const completedToday = todayTasks.filter(task => task.lastCompleted && 
        new Date(task.lastCompleted).toDateString() === new Date().toDateString()).length;
    const totalTasks = todayTasks.length;
    const progressPercentage = totalTasks > 0 ? (completedToday / totalTasks) * 100 : 0;
    todayProgress.style.width = `${progressPercentage}%`;
    
    // Display today's tasks
    todayTasks.forEach((task, index) => {
        const isCompleted = task.lastCompleted && 
            new Date(task.lastCompleted).toDateString() === new Date().toDateString();
        
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${isCompleted ? 'completed' : ''}`;
        
        let recurrenceText = task.recurrence;
        if (task.recurrence === 'custom' && task.recurrenceDays) {
            recurrenceText = `Repeats on: ${formatRecurrenceDays(task.recurrenceDays)}`;
        }
        
        taskElement.innerHTML = `
            <div class="task-info">
                <h3>${task.name}</h3>
                <p>${recurrenceText}</p>
                ${task.reminder ? `<p class="reminder-time">⏰ Reminder: ${task.reminder}</p>` : ''}
                ${isCompleted ? '<p class="completion-status">✓ Completed today</p>' : ''}
            </div>
            <div class="task-actions">
                <span class="task-points">${task.points} Points${isCompleted ? ' Earned' : ' to Earn'}</span>
                <button onclick="completeTask(${state.tasks.indexOf(task)})" 
                        class="complete-btn"
                        ${isCompleted ? 'disabled' : ''}>
                    <i class="fas fa-check"></i>
                </button>
                <button onclick="deleteTask(${state.tasks.indexOf(task)})" class="delete-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        todayTasksList.appendChild(taskElement);
    });
    
    // Show message if no tasks for today
    if (todayTasks.length === 0) {
        todayTasksList.innerHTML = '<div class="no-tasks">No tasks scheduled for today!</div>';
    }
}

// Trade items
function updateTradeItems() {
    updateAvailableItems();
    updateTradedItems();
}

function getNextAvailableTime(recurring, lastTradeTime) {
    const now = new Date();
    const lastTrade = new Date(lastTradeTime);
    let nextAvailable = new Date(lastTrade);

    switch (recurring) {
        case 'daily':
            nextAvailable.setDate(lastTrade.getDate() + 1);
            nextAvailable.setHours(0, 0, 0, 0);
            break;
        case 'weekly':
            nextAvailable.setDate(lastTrade.getDate() + 7);
            nextAvailable.setHours(0, 0, 0, 0);
            break;
        case 'monthly':
            nextAvailable.setMonth(lastTrade.getMonth() + 1);
            nextAvailable.setDate(1);
            nextAvailable.setHours(0, 0, 0, 0);
            break;
        default:
            return null;
    }

    return nextAvailable;
}

function formatTimeUntil(date) {
    const now = new Date();
    const diff = date - now;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `Available in ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
        return `Available in ${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `Available in ${minutes} minutes`;
    } else {
        return 'Available now';
    }
}

function isItemAvailable(item) {
    if (!item.lastTraded || item.recurring === 'none') return true;
    
    const nextAvailable = getNextAvailableTime(item.recurring, item.lastTraded);
    if (!nextAvailable) return true;
    
    return new Date() >= nextAvailable;
}

function updateAvailableItems() {
    const tradeItemsContainer = document.getElementById('tradeItems');
    tradeItemsContainer.innerHTML = '';
    
    state.tradeItems.forEach((item, index) => {
        const hasBeenTraded = item.lastTraded != null;
        const available = isItemAvailable(item);
        const nextAvailable = hasBeenTraded && !available ? 
            getNextAvailableTime(item.recurring, item.lastTraded) : null;
        
        const itemElement = document.createElement('div');
        itemElement.className = `trade-item ${(hasBeenTraded && !available) ? 'grayed' : ''}`;
        
        let nextAvailableText = '';
        if (hasBeenTraded && !available && nextAvailable) {
            nextAvailableText = `<p class="next-available">${formatTimeUntil(nextAvailable)}</p>`;
        }
        
        const tradeButtonId = `trade-btn-${index}`;
        
        itemElement.innerHTML = `
            <button class="delete-btn" onclick="deleteTradeItem(${index})">
                <i class="fas fa-times"></i>
            </button>
            <div class="item-icon">${item.icon}</div>
            <h3>${item.name}</h3>
            <p>${item.points} Points Required</p>
            ${item.recurring !== 'none' ? `<p>Recurring: ${item.recurring}</p>` : ''}
            ${nextAvailableText}
            <button id="${tradeButtonId}" 
                    onclick="tradeItem(${index})" 
                    class="trade-btn ${(hasBeenTraded && !available) ? 'traded' : ''}" 
                    ${(state.points < item.points || (hasBeenTraded && !available)) ? 'disabled' : ''}>
                Trade
            </button>
        `;
        tradeItemsContainer.appendChild(itemElement);
    });
}

function updateTradedItems() {
    const tradedItemsContainer = document.getElementById('tradedItemsList');
    tradedItemsContainer.innerHTML = '';
    
    // Sort traded items by trade time, newest first
    const sortedTradedItems = [...state.tradedItems].sort((a, b) => b.tradedAt - a.tradedAt);
    
    sortedTradedItems.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = `traded-item ${item.completed ? 'completed' : ''}`;
        
        const tradeDate = new Date(item.tradedAt).toLocaleString();
        const completedDate = item.completedAt ? new Date(item.completedAt).toLocaleString() : null;
        
        itemElement.innerHTML = `
            <div class="item-icon">${item.icon}</div>
            <h3>${item.name}</h3>
            <p>${item.points} Points Required</p>
            ${item.recurring !== 'none' ? 
                `<span class="recurring-badge">${item.recurring}</span>` : ''}
            <p class="trade-time">Traded: ${tradeDate}</p>
            ${completedDate ? 
                `<p class="trade-time">Completed: ${completedDate}</p>` : ''}
            ${!item.completed ? `
                <button onclick="completeTradeItem(${index})" 
                        class="complete-trade-btn">
                    <i class="fas fa-check"></i>
                    Mark as Complete
                </button>
            ` : ''}
        `;
        tradedItemsContainer.appendChild(itemElement);
    });
}

function completeTradeItem(index) {
    const item = state.tradedItems[index];
    if (!item.completed) {
        item.completed = true;
        item.completedAt = new Date().toISOString();
        
        // Create completion animation
        const itemElement = document.querySelector(`#tradedItemsList .traded-item:nth-child(${index + 1})`);
        if (itemElement) {
            const checkmark = document.createElement('div');
            checkmark.innerHTML = '<i class="fas fa-check-circle"></i>';
            checkmark.style.position = 'absolute';
            checkmark.style.top = '50%';
            checkmark.style.left = '50%';
            checkmark.style.transform = 'translate(-50%, -50%)';
            checkmark.style.fontSize = '3em';
            checkmark.style.color = 'var(--success-color)';
            checkmark.style.opacity = '0';
            checkmark.style.transition = 'all 0.5s ease';
            
            itemElement.appendChild(checkmark);
            
            // Animate checkmark
            setTimeout(() => {
                checkmark.style.opacity = '1';
                setTimeout(() => {
                    checkmark.style.opacity = '0';
                    setTimeout(() => {
                        checkmark.remove();
                        updateTradedItems();
                    }, 500);
                }, 1000);
            }, 50);
        }
        
        saveData();
    }
}

function tradeItem(index) {
    const item = state.tradeItems[index];
    const tradeButton = document.getElementById(`trade-btn-${index}`);
    
    if (state.points >= item.points && isItemAvailable(item)) {
        // Disable the button immediately
        tradeButton.disabled = true;
        tradeButton.classList.add('traded');
        
        // Attempt to deduct points
        if (deductPoints(item.points)) {
            const tradedItem = {
                ...item,
                tradedAt: Date.now(),
                completed: false,
                completedAt: null
            };
            
            state.tradedItems.push(tradedItem);
            
            // If recurring, update last traded time
            if (item.recurring !== 'none') {
                item.lastTraded = Date.now();
                
                // Update next available time display
                const nextAvailable = getNextAvailableTime(item.recurring, item.lastTraded);
                const itemElement = tradeButton.closest('.trade-item');
                if (itemElement) {
                    itemElement.classList.add('grayed');
                    const nextAvailableElement = document.createElement('p');
                    nextAvailableElement.className = 'next-available';
                    nextAvailableElement.textContent = formatTimeUntil(nextAvailable);
                    itemElement.insertBefore(nextAvailableElement, tradeButton);
                }
            } else {
                // If not recurring, remove from available items
                state.tradeItems.splice(index, 1);
            }
            
            updateTradeItems();
            saveData();
            
            alert(`Successfully traded for ${item.name}!`);
        } else {
            // If point deduction failed, re-enable the button
            tradeButton.disabled = false;
            tradeButton.classList.remove('traded');
            alert('Not enough points for this trade!');
        }
    }
}

function deleteTradeItem(index) {
    if (confirm('Are you sure you want to delete this trade item?')) {
        state.tradeItems.splice(index, 1);
        updateTradeItems();
        saveData();
    }
}

// Form handling for trade items
document.getElementById('tradeItemForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const tradeItem = {
        name: document.getElementById('itemName').value,
        points: parseInt(document.getElementById('itemPoints').value),
        recurring: document.getElementById('itemRecurring').value,
        icon: document.getElementById('itemIcon').value,
        lastTraded: null
    };
    
    state.tradeItems.push(tradeItem);
    updateTradeItems();
    saveData();
    
    tradeItemModal.style.display = 'none';
    e.target.reset();
});

// Tab switching
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(button.dataset.tab).classList.add('active');
    });
});

// Modal handling
const taskModal = document.getElementById('taskModal');
const tradeItemModal = document.getElementById('tradeItemModal');
const addTaskBtn = document.querySelector('.add-task-btn');
const addTradeBtn = document.querySelector('.add-trade-btn');
const closeBtns = document.querySelectorAll('.close');

addTaskBtn.onclick = () => taskModal.style.display = 'block';
addTradeBtn.onclick = () => tradeItemModal.style.display = 'block';

closeBtns.forEach(btn => {
    btn.onclick = () => {
        taskModal.style.display = 'none';
        tradeItemModal.style.display = 'none';
    };
});

window.onclick = (event) => {
    if (event.target === taskModal) {
        taskModal.style.display = 'none';
    }
    if (event.target === tradeItemModal) {
        tradeItemModal.style.display = 'none';
    }
};

// Form handling
document.getElementById('taskForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const task = {
        name: document.getElementById('taskName').value,
        points: parseInt(document.getElementById('taskPoints').value),
        recurrence: document.getElementById('taskRecurrence').value,
        reminder: document.getElementById('taskReminder').value,
        completed: false,
        lastCompleted: null
    };
    
    // Add recurrence days if custom recurrence is selected
    if (task.recurrence === 'custom') {
        const selectedDays = getSelectedDays();
        if (selectedDays.length === 0) {
            alert('Please select at least one day for custom recurrence');
            return;
        }
        task.recurrenceDays = selectedDays;
    }
    
    state.tasks.push(task);
    updateTasks();
    updateTaskProgress();
    saveData();
    
    taskModal.style.display = 'none';
    e.target.reset();
    document.getElementById('customRecurrenceOptions').style.display = 'none';
});

// Theme toggle
document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.dataset.theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    const icon = document.querySelector('#themeToggle i');
    const text = document.querySelector('#themeToggle span');
    
    if (document.body.dataset.theme === 'dark') {
        icon.className = 'fas fa-moon';
        text.textContent = 'Dark Mode';
    } else {
        icon.className = 'fas fa-sun';
        text.textContent = 'Light Mode';
    }
});

// Reset functionality
document.getElementById('resetButton').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
        state = {
            tasks: [],
            points: 0,
            tradeItems: [],
            tradedItems: []
        };
        saveData();
        updateUI();
    }
});

// Function to check and schedule next day refresh
function scheduleNextDayRefresh() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow - now;
    
    // Schedule refresh at midnight
    setTimeout(() => {
        updateTodayTasks(); // Refresh today's tasks
        updateTaskProgress(); // Update progress
        scheduleNextDayRefresh(); // Schedule next day's refresh
        
        // Show notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Task Tracker', {
                body: 'Today\'s tasks have been refreshed for the new day!',
                icon: 'favicon.ico'
            });
        }
    }, timeUntilMidnight);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSavedData();
    updateUI();
    scheduleNextDayRefresh();
    
    // Update trade items every minute to refresh availability times
    setInterval(() => {
        updateTradeItems();
    }, 60000);
    
    // Request notification permission if not already granted
    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
});

// Check for task reminders every minute
setInterval(() => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    
    state.tasks.forEach(task => {
        if (task.reminder === currentTime) {
            if (Notification.permission === 'granted') {
                new Notification('Task Reminder', {
                    body: `Time to complete your task: ${task.name}`,
                    icon: '/favicon.ico'
                });
            }
        }
    });
}, 60000);

function toggleCustomRecurrence() {
    const recurrenceSelect = document.getElementById('taskRecurrence');
    const customOptions = document.getElementById('customRecurrenceOptions');
    customOptions.style.display = recurrenceSelect.value === 'custom' ? 'block' : 'none';
}

function getSelectedDays() {
    const checkboxes = document.querySelectorAll('#customRecurrenceOptions input[type="checkbox"]');
    return Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => parseInt(cb.value))
        .sort((a, b) => a - b);
}

function formatRecurrenceDays(days) {
    if (!days || !days.length) return '';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(d => dayNames[d]).join(', ');
}

document.getElementById('taskRecurrence').addEventListener('change', toggleCustomRecurrence);
