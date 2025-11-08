// Add CSS styles for typing indicator
const style = document.createElement('style');
style.textContent = `
    .typing-indicator {
        display: flex;
        gap: 4px;
    }
    .typing-indicator span {
        width: 8px;
        height: 8px;
        background: #666;
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out;
    }
    .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
    .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
    }
    .markdown-bubble {
        font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
        font-size: 1rem;
        line-height: 1.6;
        background: #f3f4f6;
        color: #222;
        overflow-x: auto;
    }
    .markdown-bubble h1, .markdown-bubble h2, .markdown-bubble h3 {
        margin-top: 1em;
        margin-bottom: 0.5em;
        font-weight: bold;
    }
    .markdown-bubble pre, .markdown-bubble code {
        background: #e5e7eb;
        color: #1e293b;
        border-radius: 4px;
        padding: 2px 6px;
        font-size: 0.95em;
        font-family: 'Fira Mono', 'Consolas', 'Menlo', monospace;
    }
    .markdown-bubble pre {
        padding: 12px;
        margin: 8px 0;
        overflow-x: auto;
    }
    .markdown-bubble ul, .markdown-bubble ol {
        margin-left: 1.5em;
        margin-bottom: 1em;
    }
    .markdown-bubble blockquote {
        border-left: 4px solid #d1d5db;
        background: #f9fafb;
        padding: 8px 16px;
        margin: 8px 0;
        color: #374151;
    }
    .markdown-bubble a {
        color: #2563eb;
        text-decoration: underline;
    }
`;
document.head.appendChild(style);

let allTasks = [];
let users = {};

// Global variables
let statusChart = null;
let chartCanvas = null;
let chartContext = null;
let viewMode = 'card'; // 'card' or 'table'
let chatWebSocket = null;

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

function renderTableView(tasksToRender, taskList) {
    const table = `
        <div class="overflow-x-auto">
            <table class="min-w-full bg-white">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="py-2 px-4 text-left text-sm font-semibold text-gray-600">Task</th>
                        <th class="py-2 px-4 text-left text-sm font-semibold text-gray-600">Status</th>
                        <th class="py-2 px-4 text-left text-sm font-semibold text-gray-600">PIC</th>
                        <th class="py-2 px-4 text-left text-sm font-semibold text-gray-600">Progress</th>
                        <th class="py-2 px-4 text-left text-sm font-semibold text-gray-600">Plan Dates</th>
                        <th class="py-2 px-4 text-left text-sm font-semibold text-gray-600">Effort</th>
                    </tr>
                </thead>
                <tbody>
                    ${tasksToRender.map(task => {
                        const statusClass = getStatusClass(task.status);
                        const planDates = task.plan_start_date && task.plan_end_date ? 
                            `${new Date(task.plan_start_date).toLocaleDateString()} - ${new Date(task.plan_end_date).toLocaleDateString()}` : 
                            'Not set';
                        const progress = task.progress ? `${Math.round(task.progress)}%` : '0%';
                        const effort = task.plan_effort ? `${task.plan_effort}h` : '-';
                        console.log(task)
                        
                        return `
                            <tr class="task-row border-b hover:bg-gray-50 cursor-pointer" data-task-id="${task.id}">
                                <td class="py-2 px-4">
                                    <div class="font-medium">${task.task}</div>
                                    ${task.issues && task.issues.length > 0 ? 
                                        `<div class="text-xs text-red-600 mt-1">${task.issues.length} issue(s)</div>` : ''}
                                </td>
                                <td class="py-2 px-4">
                                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">${task.status}</span>
                                </td>
                                <td class="py-2 px-4">
                                    <div class="flex items-center">
                                        <div class="w-6 h-6 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold mr-2">
                                            ${task.pic.charAt(0)}
                                        </div>
                                        <span class="text-sm">${task.pic}</span>
                                    </div>
                                </td>
                                <td class="py-2 px-4">
                                    <div class="w-24 bg-gray-200 rounded-full h-2">
                                        <div class="bg-blue-600 h-2 rounded-full" style="width: ${progress}"></div>
                                    </div>
                                    <span class="text-xs text-gray-600 ml-1">${progress}</span>
                                </td>
                                <td class="py-2 px-4 text-sm">${planDates}</td>
                                <td class="py-2 px-4 text-sm">${effort}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    taskList.innerHTML = table;
}

function renderCardView(tasksToRender, taskList) {
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

    if (viewMode === 'table') {
        renderTableView(tasksToRender, taskList);
    } else {
        renderCardView(tasksToRender, taskList);
    }
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

        // Add view mode toggle functionality
        const viewToggle = document.getElementById('viewToggle');
        if (viewToggle) {
            viewToggle.addEventListener('change', (e) => {
                viewMode = e.target.checked ? 'table' : 'card';
                renderTasks();
            });
        }

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
        // const openModalBtn = document.getElementById('newTaskButton');
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
            return dueDate < today;
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

            if(viewMode === 'table') {
                renderTableView(tasksToRender, taskList);
            } else {
                renderCardView(tasksToRender, taskList);
            }
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
            statToday.textContent = allTasks.filter(t => t.plan_end_date.split('T')[0] === today).length;
            statOverdue.textContent = allTasks.filter(t => (isOverdue(t.plan_end_date.split('T')[0]) || t.status === 'Delayed') && t.status !== 'Done').length;
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
            messageContainer.className = `flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`;
            
            const messageBubble = document.createElement('div');
            messageBubble.className = `message-bubble p-3 rounded-xl max-w-[80%] ${
                isUser ? 'bg-blue-600 text-white rounded-tr-none mr-2' : 'bg-gray-200 text-gray-800 rounded-tl-none ml-2 markdown-bubble'
            }`;
            if (!isUser) {
                messageBubble.innerHTML = window.marked ? window.marked.parse(text) : text;
            } else {
                messageBubble.textContent = text;
            }
            messageContainer.appendChild(messageBubble);
            chatMessages.appendChild(messageContainer);
            chatMessages.scrollTo({
                top: chatMessages.scrollHeight,
                behavior: 'smooth'
            });
        }

        // Initialize WebSocket connection
        async function initWebSocket() {
            if (!chatWebSocket || chatWebSocket.readyState !== WebSocket.OPEN) {
                return new Promise((resolve, reject) => {
                    chatWebSocket = new WebSocket("ws://3f10394f0109.ngrok-free.app/tasks/ws/chat");
                    
                    chatWebSocket.onopen = () => {
                        console.log('WebSocket connected');
                        resolve(chatWebSocket);
                    };
                    
                    chatWebSocket.onerror = (error) => {
                        console.error('WebSocket error:', error);
                        reject(error);
                    };

                    chatWebSocket.onclose = () => {
                        console.log('WebSocket closed');
                        chatWebSocket = null;
                    };

                    let currentMessageContainer = null;
                    let currentMessageBubble = null;
                    let markdownContent = '';

                    chatWebSocket.onmessage = (event) => {
                        if (event.data === "[END]") {
                            // Message complete, render markdown and reset for next response
                            updateStats();
                            renderChart();
                            if (currentMessageBubble && window.marked) {
                                currentMessageBubble.innerHTML = window.marked.parse(markdownContent);
                            }
                            currentMessageContainer = null;
                            currentMessageBubble = null;
                            markdownContent = '';
                            return;
                        }
                        if (!currentMessageContainer) {
                            // Create a new message container and bubble for this response
                            currentMessageContainer = document.createElement('div');
                            currentMessageContainer.className = 'flex justify-start mb-2';
                            currentMessageBubble = document.createElement('div');
                            currentMessageBubble.className = 'message-bubble markdown-bubble p-2 rounded-lg bg-gray-200 text-gray-800 rounded-tl-none max-w-[80%] ml-2';
                            currentMessageContainer.appendChild(currentMessageBubble);
                            chatMessages.appendChild(currentMessageContainer);
                        }
                        // Accumulate markdown content
                        markdownContent += event.data;
                        // Show raw text while streaming
                        currentMessageBubble.textContent = markdownContent;
                        // Scroll to the latest message
                        chatMessages.scrollTo({
                            top: chatMessages.scrollHeight,
                            behavior: 'smooth'
                        });
                    };
                });
            }
            return chatWebSocket;
        }

        async function getBotResponse(userMessage) {
            try {
                const ws = await initWebSocket();
                ws.send(userMessage);
            } catch (error) {
                console.error('Error with WebSocket:', error);
                addMessage("Sorry, I'm having trouble connecting to the chat service. Please try again.", false);
            }
        }

        function handleSendMessage() {
            const userText = chatInput.value.trim();
            if (userText === '') return;

            addMessage(userText, true);
            chatInput.value = '';

            getBotResponse(userText, addMessage);
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
        // openModalBtn.addEventListener('click', openNewTaskModal);

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
            let card = e.target.closest('.task-card');
            if (card) {
                openModal(card.dataset.taskId);
            } else {
                card = e.target.closest('.task-row');
                if (card) {
                    openModal(card.dataset.taskId);
                }
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