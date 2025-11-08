let allTasks = [];
let users = {};

// Global variables
let statusChart = null;
let chartCanvas = null;
let chartContext = null;

function getStatusClass(status) {
    switch (status) {
        case 'Done': return 'bg-green-100 text-green-800';
        case 'In Progress': return 'bg-blue-100 text-blue-800';
        case 'In Review': return 'bg-yellow-100 text-yellow-800';
        case 'Delayed': return 'bg-red-100 text-red-800';
        case 'To Do': return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function isOverdue(dueDate) {
    const today = new Date().toISOString().split('T')[0];
    return dueDate < today && new Date(dueDate).setHours(0,0,0,0) <= new Date().setHours(0,0,0,0);
}

function renderTasks() {
    const taskList = document.getElementById('taskList');
    const filterPic = document.getElementById('filterPic');
    const filterStatus = document.getElementById('filterStatus');
    const filterDate = document.getElementById('filterDate');
    const currentView = document.querySelector('.nav-link.active')?.dataset?.view || 'all';
    const today = new Date().toISOString().split('T')[0];

    let tasksToRender = [...allTasks];

    if (currentView === 'delayed') {
        tasksToRender = tasksToRender.filter(t => t.status === 'Delayed' || (isOverdue(t.dueDate) && t.status !== 'Done'));
    } else if (currentView === 'today') {
        tasksToRender = tasksToRender.filter(t => t.dueDate === today);
    } else if (currentView === 'myTasks') {
        tasksToRender = tasksToRender.filter(t => t.pic === (window.activeUser && window.activeUser.name));
    }
    
    const picFilterVal = filterPic?.value || 'all';
    const statusFilterVal = filterStatus?.value || 'all';
    const dateFilterVal = filterDate?.value || '';

    if (picFilterVal !== 'all') {
        tasksToRender = tasksToRender.filter(t => t.pic === picFilterVal);
    }
    if (statusFilterVal !== 'all') {
        tasksToRender = tasksToRender.filter(t => t.status === statusFilterVal);
    }
    if (dateFilterVal) {
        tasksToRender = tasksToRender.filter(t => t.dueDate === dateFilterVal);
    }

    if (!taskList) return;

    taskList.innerHTML = '';
    if (tasksToRender.length === 0) {
        taskList.innerHTML = '<p class="text-gray-500 text-center py-8">No tasks found matching your criteria.</p>';
        return;
    }

    tasksToRender.forEach(task => {
        const statusClass = getStatusClass(task.status);
        const overdue = isOverdue(task.dueDate) && task.status !== 'Done';
        const dateClass = overdue ? 'text-red-600 font-semibold' : 'text-gray-500';

        const taskCard = `
            <div class="task-card bg-white p-4 rounded-lg shadow-sm mb-4 flex flex-wrap justify-between items-center" data-task-id="${task.id}">
                <div class="flex-1 min-w-[200px] mb-2 md:mb-0">
                    <p class="font-semibold text-lg">${task.title}</p>
                    <p class="text-sm text-gray-400">${task.project}</p>
                </div>
                <div class="flex items-center space-x-4">
                    <span class="text-sm font-medium ${dateClass}">${task.dueDate}</span>
                    <span class="px-3 py-1 text-sm font-semibold rounded-full ${statusClass}">${task.status}</span>
                    <div class="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold" title="${task.pic}">
                        ${task.pic.charAt(0)}
                    <div>
                </div>
            </div>
        `;
        taskList.innerHTML += taskCard;
    });
}

function updateStats() {
    const today = new Date().toISOString().split('T')[0];
    const statTotal = document.getElementById('statTotal');
    const statToday = document.getElementById('statToday');
    const statOverdue = document.getElementById('statOverdue');

    if (!statTotal || !statToday || !statOverdue) return;

    statTotal.textContent = allTasks.length;
    statToday.textContent = allTasks.filter(t => t.dueDate === today).length;
    statOverdue.textContent = allTasks.filter(t => (isOverdue(t.dueDate) || t.status === 'Delayed') && t.status !== 'Done').length;
}

function initializeChart() {
    // Clean up any existing chart
    if (statusChart) {
        statusChart.destroy();
        statusChart = null;
    }

    // Get fresh canvas and context
    chartCanvas = document.getElementById('statusChart');
    if (!chartCanvas) return;
    
    chartContext = chartCanvas.getContext('2d');
    if (!chartContext) return;

    // Create initial empty chart
    statusChart = new Chart(chartContext, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderColor: [],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12
                    }
                }
            }
        }
    });
}

function renderChart() {
    if (!statusChart) {
        initializeChart();
    }

    if (!statusChart) return; // Exit if initialization failed

    const statusCounts = allTasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
    }, {});

    // Update chart data
    statusChart.data.labels = Object.keys(statusCounts);
    statusChart.data.datasets[0].data = Object.values(statusCounts);
    statusChart.data.datasets[0].backgroundColor = [
        '#d1fae5',
        '#dbeafe',
        '#fef3c7',
        '#fee2e2',
        '#f3f4f6'
    ];
    statusChart.data.datasets[0].borderColor = [
        '#10b981',
        '#3b82f6',
        '#f59e0b',
        '#ef4444',
        '#6b7280'
    ];

    // Update the chart
    try {
        statusChart.update('none'); // Update without animation
    } catch (err) {
        console.error('Error updating chart:', err);
        // If update fails, try to reinitialize
        initializeChart();
    }
}

function populateFilters() {
    const filterPic = document.getElementById('filterPic');
    const filterStatus = document.getElementById('filterStatus');
    
    if (!filterPic || !filterStatus) return;

    const pics = [...new Set(allTasks.map(t => t.pic))];
    filterPic.innerHTML = '<option value="all">All PICs</option>';
    pics.forEach(pic => {
        filterPic.innerHTML += `<option value="${pic}">${pic}</option>`;
    });
    
    const statuses = [...new Set(allTasks.map(t => t.status))];
    filterStatus.innerHTML = '<option value="all">All Statuses</option>';
    statuses.forEach(status => {
        filterStatus.innerHTML += `<option value="${status}">${status}</option>`;
    });
}

// Function to refresh data from the server
async function refreshData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        allTasks = data.tasks || [];
        users = data.users || {};

        // Re-render everything
        renderTasks();
        updateStats();
        renderChart();
        populateFilters();
    } catch (err) {
        console.error('Failed to refresh data:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];

    // Set up SSE connection for real-time updates
    console.log('Setting up SSE connection...');
    const evtSource = new EventSource('/events');
    
    evtSource.onopen = () => {
        console.log('SSE connection opened');
    };
    
    evtSource.addEventListener('message', (event) => {
        console.log('Received SSE message:', event.data);
        const data = JSON.parse(event.data);
        console.log('Parsed SSE data:', data);
        try {
            if (data.type === 'tasks_updated') {
                console.log('Tasks updated, refreshing data...');
                refreshData();
            } else if (data.event === 'connected') {
            }
        } catch (err) {
            console.error('Error parsing SSE message:', err);
        }
    });

    evtSource.onerror = (err) => {
        console.error('EventSource failed:', err);
        evtSource.close();
        // Try to reconnect after a delay
        setTimeout(() => {
            console.log('Attempting to reconnect SSE...');
            location.reload();
        }, 5000);
    };

    // Initial data fetch
    fetch('/api/data')
        .then(res => res.json())
        .then(data => {
            allTasks = data.tasks || [];
            users = data.users || {};

            // default active/other users (simulate login toggle)
            window.activeUser = users[1];
            window.otherUser = users[4];

            // Now initialize the UI handlers and render
            initializeApp();
        })
        .catch(err => {
            console.error('Failed to fetch data from /api/data', err);
            // still initialize with empty data to avoid breaking the UI
            window.activeUser = null;
            window.otherUser = null;
            initializeApp();
        });

    function initializeApp() {
        let currentView = 'all';
        let currentTask = null;

        // Initialize the chart once at startup
        initializeChart();

        const taskList = document.getElementById('taskList');
        const taskModal = document.getElementById('taskModal');
        const closeModalBtn = document.getElementById('closeModal');
        const toggleUserBtn = document.getElementById('toggleUser');
        
        const filterPic = document.getElementById('filterPic');
        const filterStatus = document.getElementById('filterStatus');
        const filterDate = document.getElementById('filterDate');
        const clearFiltersBtn = document.getElementById('clearFilters');
        
        const modalTitle = document.getElementById('modalTitle');
        const modalStatus = document.getElementById('modalStatus');
        const modalPic = document.getElementById('modalPic');
        const modalPicName = document.getElementById('modalPicName');
        const modalDueDate = document.getElementById('modalDueDate');
        const modalProject = document.getElementById('modalProject');
        const modalDescription = document.getElementById('modalDescription');
        const permissionMsg = document.getElementById('permissionMsg');
        const viewTitle = document.getElementById('viewTitle');

        const statTotal = document.getElementById('statTotal');
        const statToday = document.getElementById('statToday');
        const statOverdue = document.getElementById('statOverdue');

        const chatPanel = document.getElementById('chatPanel');
        const openChatBtn = document.getElementById('openChatBtn');
        const closeChatBtn = document.getElementById('closeChatBtn');
        const chatMessages = document.getElementById('chatMessages');
        const chatInput = document.getElementById('chatInput');
        const sendChatBtn = document.getElementById('sendChatBtn');
        
        const modalEl = document.getElementById('new-task-modal');
        const formEl = document.getElementById('new-task-form');
        const openModalBtn = document.getElementById('newTaskButton');
        const cancelBtn = document.getElementById('cancelNewTaskBtn');
        const messageModalEl = document.getElementById('message-modal');
        const messageContentEl = document.getElementById('message-content');

        function getStatusClass(status) {
            switch (status) {
                case 'Done': return 'bg-green-100 text-green-800';
                case 'In Progress': return 'bg-blue-100 text-blue-800';
                case 'In Review': return 'bg-yellow-100 text-yellow-800';
                case 'Delayed': return 'bg-red-100 text-red-800';
                case 'To Do': return 'bg-gray-100 text-gray-800';
                default: return 'bg-gray-100 text-gray-800';
            }
        }

        function isOverdue(dueDate) {
            return dueDate < today && new Date(dueDate).setHours(0,0,0,0) <= new Date().setHours(0,0,0,0);
        }

        function renderTasks() {
            let tasksToRender = [...allTasks];

            if (currentView === 'delayed') {
                tasksToRender = tasksToRender.filter(t => t.status === 'Delayed' || (isOverdue(t.dueDate) && t.status !== 'Done'));
            } else if (currentView === 'today') {
                tasksToRender = tasksToRender.filter(t => t.dueDate === today);
            } else if (currentView === 'myTasks') {
                tasksToRender = tasksToRender.filter(t => t.pic === (window.activeUser && window.activeUser.name));
            }
            
            const picFilterVal = filterPic.value;
            const statusFilterVal = filterStatus.value;
            const dateFilterVal = filterDate.value;

            if (picFilterVal !== 'all') {
                tasksToRender = tasksToRender.filter(t => t.pic === picFilterVal);
            }
            if (statusFilterVal !== 'all') {
                tasksToRender = tasksToRender.filter(t => t.status === statusFilterVal);
            }
            if (dateFilterVal) {
                tasksToRender = tasksToRender.filter(t => t.dueDate === dateFilterVal);
            }

            taskList.innerHTML = '';
            if (tasksToRender.length === 0) {
                taskList.innerHTML = '<p class="text-gray-500 text-center py-8">No tasks found matching your criteria.</p>';
            }

            tasksToRender.forEach(task => {
                const statusClass = getStatusClass(task.status);
                const overdue = task.plan_end_date && new Date(task.plan_end_date) < new Date() && task.status !== 'Done';
                const dateClass = overdue ? 'text-red-600 font-semibold' : 'text-gray-500';

                // Format dates for display
                const planDates = task.plan_start_date && task.plan_end_date ? 
                    `${new Date(task.plan_start_date).toLocaleDateString()} - ${new Date(task.plan_end_date).toLocaleDateString()}` : 
                    'No planned dates';
                
                const actualDates = task.actual_start_date && task.actual_end_date ? 
                    `${new Date(task.actual_start_date).toLocaleDateString()} - ${new Date(task.actual_end_date).toLocaleDateString()}` : 
                    'Not started';

                // Format effort and progress
                const planEffort = task.plan_effort ? `${task.plan_effort}h` : '-';
                const actualEffort = task.actual_effort ? `${task.actual_effort}h` : '-';
                const progress = task.progress ? `${Math.round(task.progress)}%` : '0%';

                const taskCard = `
                    <div class="task-card bg-white p-4 rounded-lg shadow-sm mb-4" data-task-id="${task.id}">
                        <div class="flex justify-between items-start mb-3">
                            <div class="flex-1">
                                <p class="font-semibold text-lg">${task.task}</p>
                                <div class="flex items-center space-x-2 mt-1">
                                    <span class="px-3 py-1 text-sm font-semibold rounded-full ${statusClass}">${task.status}</span>
                                    <span class="text-sm text-gray-500">${progress}</span>
                                </div>
                            </div>
                            <div class="flex items-center">
                                <div class="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold" title="${task.pic}">
                                    ${task.pic.charAt(0)}
                                </div>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4 text-sm mb-3">
                            <div>
                                <p class="text-gray-500">Planned Dates</p>
                                <p class="font-medium ${dateClass}">${planDates}</p>
                            </div>
                            <div>
                                <p class="text-gray-500">Actual Dates</p>
                                <p class="font-medium">${actualDates}</p>
                            </div>
                            <div>
                                <p class="text-gray-500">Planned Effort</p>
                                <p class="font-medium">${planEffort}</p>
                            </div>
                            <div>
                                <p class="text-gray-500">Actual Effort</p>
                                <p class="font-medium">${actualEffort}</p>
                            </div>
                        </div>
                        
                        ${task.issues && task.issues.length > 0 ? `
                            <div class="mb-2">
                                <p class="text-gray-500 text-sm">Issues:</p>
                                <ul class="list-disc list-inside text-sm text-red-600">
                                    ${task.issues.map(issue => `<li>${issue}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        
                        ${task.remark ? `
                            <div class="text-sm text-gray-600 border-t pt-2 mt-2">
                                <p class="italic">${task.remark}</p>
                            </div>
                        ` : ''}
                    </div>
                `;
                taskList.innerHTML += taskCard;
            });
        }

        function populateFilters() {
            const pics = [...new Set(allTasks.map(t => t.pic))];
            filterPic.innerHTML = '<option value="all">All PICs</option>';
            pics.forEach(pic => {
                filterPic.innerHTML += `<option value="${pic}">${pic}</option>`;
            });
            
            const statuses = [...new Set(allTasks.map(t => t.status))];
            filterStatus.innerHTML = '<option value="all">All Statuses</option>';
            statuses.forEach(status => {
                filterStatus.innerHTML += `<option value="${status}">${status}</option>`;
            });
        }

        function updateStats() {
            statTotal.textContent = allTasks.length;
            statToday.textContent = allTasks.filter(t => t.dueDate === today).length;
            statOverdue.textContent = allTasks.filter(t => (isOverdue(t.dueDate) || t.status === 'Delayed') && t.status !== 'Done').length;
        }

        function renderChart() {
            const statusCounts = allTasks.reduce((acc, task) => {
                acc[task.status] = (acc[task.status] || 0) + 1;
                return acc;
            }, {});

            const data = {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: [
                        '#d1fae5', 
                        '#dbeafe', 
                        '#fef3c7', 
                        '#fee2e2', 
                        '#f3f4f6'  
                    ],
                    borderColor: [
                        '#10b981',
                        '#3b82f6',
                        '#f59e0b',
                        '#ef4444',
                        '#6b7280'
                    ],
                    borderWidth: 1
                }]
            };

            const ctx = document.getElementById('statusChart').getContext('2d');
            if (statusChart) {
                statusChart.destroy();
            }
            statusChart = new Chart(ctx, {
                type: 'doughnut',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                boxWidth: 12
                            }
                        }
                    }
                }
            });
        }

        function checkPermissions() {
            if (!currentTask) return;
            
            const isLead = window.activeUser && window.activeUser.isLead;
            const isPIC = currentTask.pic === (window.activeUser && window.activeUser.name);
            const hasPermission = isLead || isPIC;
            
            // Status changes require PIC or Lead permissions
            modalStatus.disabled = !hasPermission;
            console.log(">>> User: ", window.activeUser)
            
            // Get all editable fields
            const editableInputs = {
                status: document.getElementById('modalStatus'),
                progress: document.getElementById('modalProgress'),
                actualEffort: document.getElementById('modalActualEffort'),
                actualStartDate: document.getElementById('modalActualStartDate'),
                actualEndDate: document.getElementById('modalActualEndDate'),
                issues: document.getElementById('task-issues'),
                remarks: document.getElementById('modalRemarks')
            };

            // Special rules for different statuses
            const isDone = currentTask.status === 'Done';
            const isBlocked = currentTask.status === 'Blocked';
            
            // Apply permissions
            Object.values(editableInputs).forEach(input => {
                if (input) {
                    input.disabled = !hasPermission || isDone;
                }
            });

            // Show appropriate permission messages
            permissionMsg.classList.toggle('hidden', hasPermission);
            if (!hasPermission) {
                permissionMsg.textContent = `Only the PIC (${currentTask.pic}) or a Lead can update this task.`;
            } else if (isDone) {
                permissionMsg.textContent = 'Completed tasks cannot be modified.';
                permissionMsg.classList.remove('hidden');
            } else if (isBlocked) {
                permissionMsg.textContent = 'Task is blocked. Please resolve issues before proceeding.';
                permissionMsg.classList.remove('hidden');
            }

            // Additional controls
            if (hasPermission && !isDone) {
                // Show edit controls for actual dates and effort
                const actualControls = document.querySelectorAll('.actual-field-control');
                actualControls.forEach(control => control.classList.remove('hidden'));

                // Enable progress updates only if task is In Progress
                if (currentTask.status === 'In Progress') {
                    editableInputs.progress.disabled = false;
                }

                // Enable issues management
                if (editableInputs.issues) {
                    editableInputs.issues.disabled = false;
                }
            }
        }

        function openModal(taskId) {
            currentTask = allTasks.find(t => t.id == taskId);
            if (!currentTask) return;

            // Update task title and basic info
            modalTitle.textContent = currentTask.task;
            modalStatus.value = currentTask.status;
            modalPic.textContent = currentTask.pic;
            modalPicName.textContent = currentTask.pic;

            // Update progress
            const progressValue = currentTask.progress || 0;
            document.getElementById('modalProgress').textContent = `${Math.round(progressValue)}%`;
            document.getElementById('modalProgressBar').style.width = `${progressValue}%`;

            // Update planned dates and effort
            document.getElementById('modalPlanStartDate').textContent = 
                currentTask.plan_start_date ? new Date(currentTask.plan_start_date).toLocaleDateString() : '-';
            document.getElementById('modalPlanEndDate').textContent = 
                currentTask.plan_end_date ? new Date(currentTask.plan_end_date).toLocaleDateString() : '-';
            document.getElementById('modalPlanEffort').textContent = 
                currentTask.plan_effort ? `${currentTask.plan_effort}h` : '-';

            // Update actual dates and effort
            document.getElementById('modalActualStartDate').textContent = 
                currentTask.actual_start_date ? new Date(currentTask.actual_start_date).toLocaleDateString() : '-';
            document.getElementById('modalActualEndDate').textContent = 
                currentTask.actual_end_date ? new Date(currentTask.actual_end_date).toLocaleDateString() : '-';
            document.getElementById('modalActualEffort').textContent = 
                currentTask.actual_effort ? `${currentTask.actual_effort}h` : '-';

            // Update issues
            const modalIssues = document.getElementById('modalIssues');
            const modalNoIssues = document.getElementById('modalNoIssues');
            
            if (currentTask.issues && currentTask.issues.length > 0) {
                modalIssues.innerHTML = currentTask.issues
                    .map(issue => `<li>${issue}</li>`)
                    .join('');
                modalIssues.classList.remove('hidden');
                modalNoIssues.classList.add('hidden');
            } else {
                modalIssues.classList.add('hidden');
                modalNoIssues.classList.remove('hidden');
            }

            // Update remarks
            document.getElementById('modalRemarks').textContent = 
                currentTask.remark || 'No remarks added';
            
            checkPermissions();
            
            taskModal.classList.remove('hidden');
        }

        function closeModal() {
            taskModal.classList.add('hidden');
            currentTask = null;
        }

        function toggleChatPanel() {
            chatPanel.classList.toggle('hidden');
            chatPanel.classList.toggle('translate-x-full');
        }

        function addMessage(text, isUser) {
            const messageContainer = document.createElement('div');
            messageContainer.className = `flex ${isUser ? 'justify-end' : 'justify-start'}`;
            
            const messageBubble = document.createElement('div');
            messageBubble.className = `p-3 rounded-xl max-w-[80%] shadow-md ${isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-200 text-gray-800 rounded-tl-none'}`;
            messageBubble.textContent = text;
            
            messageContainer.appendChild(messageBubble);
            chatMessages.appendChild(messageContainer);
            chatMessages.scrollTop = chatMessages.scrollHeight; 
        }

        function getBotResponse(userMessage) {
            const lowerMsg = userMessage.toLowerCase();
            
            if (lowerMsg.includes('delayed') || lowerMsg.includes('overdue')) {
                const delayedTasks = allTasks.filter(t => (isOverdue(t.dueDate) || t.status === 'Delayed') && t.status !== 'Done');
                if (delayedTasks.length > 0) {
                    return `I found ${delayedTasks.length} delayed tasks. The top delayed task is: "${delayedTasks[0].title}" (PIC: ${delayedTasks[0].pic}). Please check the "Delayed Tasks" view.`;
                } else {
                    return "Great news! There are no delayed or overdue tasks in the system right now.";
                }
            } else if (lowerMsg.includes('tasks for')) {
                const picName = lowerMsg.split('tasks for')[1]?.trim() || '';
                const tasksForPic = allTasks.filter(t => t.pic.toLowerCase().includes(picName) && t.status !== 'Done');
                if (tasksForPic.length > 0) {
                    return `${tasksForPic.length} tasks found for ${picName}. The next one due is: "${tasksForPic[0].title}".`;
                } else {
                    return `I couldn't find any pending tasks for a person named "${picName}".`;
                }
            } else if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
                return "Hello! I'm here to assist with task summaries and filters. Try asking about 'delayed tasks' or 'tasks for Alex'.";
            } else {
                return "That's an interesting query! To get better results, please ask me specifically about task **statuses**, **PICs**, or **delayed** items.";
            }
        }

        function handleSendMessage() {
            const userText = chatInput.value.trim();
            if (userText === '') return;

            addMessage(userText, true);
            chatInput.value = '';

            setTimeout(() => {
                const botResponse = getBotResponse(userText);
                addMessage(botResponse, false);
            }, 800);
        }

        function showSystemMessage(message, type) {
            const bgColor = type === 'error' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-green-100 border-green-400 text-green-700';
            const icon = type === 'error' ?
                `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>` :
                `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;

            messageContentEl.innerHTML = `
                <div class="p-4 border-2 rounded-lg ${bgColor} font-semibold">
                    ${icon}
                    <span>${message}</span>
                </div>
            `;
            messageModalEl.classList.remove('hidden');
            messageModalEl.classList.add('flex');

            setTimeout(() => {
                messageModalEl.classList.add('hidden');
                messageModalEl.classList.remove('flex');
            }, 3000);
        }

        // --- EVENT LISTENERS ---

        openChatBtn.addEventListener('click', toggleChatPanel);
        closeChatBtn.addEventListener('click', toggleChatPanel);
        sendChatBtn.addEventListener('click', handleSendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSendMessage();
            }
        });

        async function addTask(text) {
            try {
                showSystemMessage('Task added successfully!', 'success');
                closeNewTaskModal();
            } catch (error) {
                console.error("Error adding task:", error);
                showSystemMessage(`Could not add task: ${error.message}`, 'error');
            }
        }

        /**
         * Closes the new task modal.
         */
        function closeNewTaskModal() {
            modalEl.classList.add('hidden');
            modalEl.classList.remove('flex');
            formEl.reset(); // Clear form on close
        }

        /**
         * Opens the new task modal.
         */
        function openNewTaskModal() {
            modalEl.classList.remove('hidden');
            modalEl.classList.add('flex');
            document.getElementById('task-text').focus();
        }

        // Open Modal
        openModalBtn.addEventListener('click', openNewTaskModal);

        // Close Modal via Cancel Button (FIXED)
        cancelBtn.addEventListener('click', closeNewTaskModal);

        // Close Modal via Backdrop Click (FIXED)
        modalEl.addEventListener('click', (event) => {
            // Check if the click occurred directly on the modal backdrop
            if (event.target === modalEl) {
                closeNewTaskModal();
            }
        });

        // Form submission
        formEl.addEventListener('submit', (e) => {
            e.preventDefault();
            const taskText = document.getElementById('task-text').value;
            if (taskText) {
                addTask(taskText);
            }
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                currentView = link.dataset.view;
                viewTitle.textContent = link.textContent; 
                renderTasks();
            });
        });

        filterPic.addEventListener('change', renderTasks);
        filterStatus.addEventListener('change', renderTasks);
        filterDate.addEventListener('change', renderTasks);
        
        clearFiltersBtn.addEventListener('click', () => {
            filterPic.value = 'all';
            filterStatus.value = 'all';
            filterDate.value = '';
            renderTasks();
        });

        taskList.addEventListener('click', (e) => {
            const card = e.target.closest('.task-card');
            if (card) {
                openModal(card.dataset.taskId);
            }
        });

        closeModalBtn.addEventListener('click', closeModal);
        taskModal.addEventListener('click', (e) => {
            if (e.target === taskModal) {
                closeModal();
            }
        });

        toggleUserBtn.addEventListener('click', () => {
            [window.activeUser, window.otherUser] = [window.otherUser, window.activeUser];
            
            let role = '';
            if (window.activeUser && window.activeUser.isLead) role = 'Lead';
            else if (currentTask && window.activeUser && window.activeUser.name === currentTask.pic) role = 'PIC';
            else role = 'Teammate';
            
            toggleUserBtn.textContent = `Current User: ${window.activeUser ? window.activeUser.name : 'Unknown'} (${role})`;
            
            const avatar = document.querySelector('.w-10.h-10.rounded-full');
            if (avatar && window.activeUser) {
                avatar.textContent = window.activeUser.name.charAt(0);
                avatar.title = window.activeUser.name;
            }

            checkPermissions();
        });

        populateFilters();
        updateStats();
        renderChart();
        renderTasks();
    }
});