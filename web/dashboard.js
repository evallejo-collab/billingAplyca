// Dashboard JavaScript functionality

const API_BASE = '../api';

// Show/hide sections
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';
    
    // Load section-specific data
    switch(sectionId) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'contracts':
            loadContracts();
            break;
        case 'time-entries':
            loadTimeEntries();
            loadActiveContractsForSelect();
            break;
        case 'reports':
            // Reports are loaded on demand
            break;
    }
}

// Load dashboard data
async function loadDashboard() {
    try {
        // Load overview stats
        const statsResponse = await fetch(`${API_BASE}/reports.php?action=overview`);
        const statsData = await statsResponse.json();
        
        if (statsData.success) {
            displayOverviewStats(statsData.stats);
        }
        
        // Load active contracts
        const contractsResponse = await fetch(`${API_BASE}/contracts.php?status=active`);
        const contractsData = await contractsResponse.json();
        
        if (contractsData.success) {
            displayActiveContracts(contractsData.contracts);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Display overview statistics
function displayOverviewStats(stats) {
    const statsHtml = `
        <div class="col-md-3">
            <div class="card bg-primary text-white">
                <div class="card-body">
                    <h5 class="card-title">Contratos Totales</h5>
                    <h2>${stats.total_contracts || 0}</h2>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-success text-white">
                <div class="card-body">
                    <h5 class="card-title">Contratos Activos</h5>
                    <h2>${stats.active_contracts || 0}</h2>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-info text-white">
                <div class="card-body">
                    <h5 class="card-title">Horas Utilizadas</h5>
                    <h2>${parseFloat(stats.total_used_hours || 0).toFixed(1)}</h2>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-warning text-white">
                <div class="card-body">
                    <h5 class="card-title">Total Facturado</h5>
                    <h2>$${parseFloat(stats.total_billed_amount || 0).toLocaleString()}</h2>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('stats-row').innerHTML = statsHtml;
}

// Display active contracts
function displayActiveContracts(contracts) {
    let html = '';
    
    contracts.forEach(contract => {
        const completionPercentage = (contract.used_hours / contract.total_hours) * 100;
        const progressClass = completionPercentage > 80 ? 'bg-warning' : completionPercentage > 90 ? 'bg-danger' : 'bg-success';
        
        html += `
            <div class="col-md-6 mb-3">
                <div class="card contract-card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title">${contract.contract_number}</h5>
                            <span class="badge bg-success">Activo</span>
                        </div>
                        <p class="card-text text-muted">${contract.client_name}</p>
                        <p class="card-text">${contract.description}</p>
                        
                        <div class="row mb-2">
                            <div class="col-6">
                                <small class="text-muted">Horas Utilizadas</small>
                                <div>${contract.used_hours} / ${contract.total_hours}</div>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Horas Restantes</small>
                                <div>${contract.remaining_hours}</div>
                            </div>
                        </div>
                        
                        <div class="progress mb-2">
                            <div class="progress-bar ${progressClass}" style="width: ${completionPercentage}%"></div>
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="text-muted">$${contract.hourly_rate}/hora</span>
                            <button class="btn btn-sm btn-outline-primary" onclick="viewContract(${contract.id})">
                                Ver Detalle
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    document.getElementById('active-contracts').innerHTML = html;
}

// Load all contracts
async function loadContracts() {
    try {
        const response = await fetch(`${API_BASE}/contracts.php`);
        const data = await response.json();
        
        if (data.success) {
            displayContractsList(data.contracts);
        }
    } catch (error) {
        console.error('Error loading contracts:', error);
    }
}

// Display contracts list
function displayContractsList(contracts) {
    let html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>Número</th>
                        <th>Cliente</th>
                        <th>Descripción</th>
                        <th>Horas</th>
                        <th>Tarifa</th>
                        <th>Estado</th>
                        <th>Progreso</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    contracts.forEach(contract => {
        const completionPercentage = (contract.used_hours / contract.total_hours) * 100;
        const statusClass = {
            'active': 'success',
            'completed': 'primary',
            'cancelled': 'danger'
        };
        
        html += `
            <tr>
                <td>${contract.contract_number}</td>
                <td>${contract.client_name}</td>
                <td>${contract.description}</td>
                <td>${contract.used_hours} / ${contract.total_hours}</td>
                <td>$${contract.hourly_rate}</td>
                <td><span class="badge bg-${statusClass[contract.status] || 'secondary'}">${contract.status}</span></td>
                <td>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar" style="width: ${completionPercentage}%">
                            ${completionPercentage.toFixed(1)}%
                        </div>
                    </div>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewContract(${contract.id})">
                        Ver
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('contracts-list').innerHTML = html;
}

// Save new contract
async function saveContract() {
    const form = document.getElementById('contract-form');
    const formData = new FormData(form);
    
    const contractData = {
        client_id: parseInt(formData.get('client_id')),
        contract_number: formData.get('contract_number'),
        description: formData.get('description'),
        total_hours: parseFloat(formData.get('total_hours')),
        hourly_rate: parseFloat(formData.get('hourly_rate')),
        start_date: formData.get('start_date'),
        end_date: formData.get('end_date')
    };
    
    try {
        const response = await fetch(`${API_BASE}/contracts.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(contractData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Contrato creado exitosamente');
            bootstrap.Modal.getInstance(document.getElementById('contractModal')).hide();
            form.reset();
            loadContracts();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error saving contract:', error);
        alert('Error al guardar el contrato');
    }
}

// Load active contracts for select dropdown
async function loadActiveContractsForSelect() {
    try {
        const response = await fetch(`${API_BASE}/contracts.php?status=active`);
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('contract-select');
            select.innerHTML = '<option value="">Seleccionar contrato...</option>';
            
            data.contracts.forEach(contract => {
                select.innerHTML += `
                    <option value="${contract.id}">
                        ${contract.contract_number} - ${contract.client_name} (${contract.remaining_hours}h restantes)
                    </option>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading contracts for select:', error);
    }
}

// Save time entry
async function saveTimeEntry() {
    const form = document.getElementById('time-entry-form');
    const formData = new FormData(form);
    
    const timeEntryData = {
        action: 'add_time_entry',
        contract_id: parseInt(formData.get('contract_id')),
        description: formData.get('description'),
        hours_used: parseFloat(formData.get('hours_used')),
        entry_date: formData.get('entry_date'),
        created_by: formData.get('created_by'),
        notes: formData.get('notes')
    };
    
    try {
        const response = await fetch(`${API_BASE}/contracts.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(timeEntryData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Horas registradas exitosamente');
            bootstrap.Modal.getInstance(document.getElementById('timeEntryModal')).hide();
            form.reset();
            loadTimeEntries();
            loadDashboard(); // Refresh dashboard
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error saving time entry:', error);
        alert('Error al registrar las horas');
    }
}

// Load time entries
async function loadTimeEntries() {
    try {
        const response = await fetch(`${API_BASE}/time_entries.php`);
        const data = await response.json();
        
        if (data.success) {
            displayTimeEntriesList(data.entries);
        }
    } catch (error) {
        console.error('Error loading time entries:', error);
    }
}

// Display time entries list
function displayTimeEntriesList(entries) {
    let html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>Fecha</th>
                        <th>Contrato</th>
                        <th>Cliente</th>
                        <th>Descripción</th>
                        <th>Horas</th>
                        <th>Monto</th>
                        <th>Creado por</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    entries.forEach(entry => {
        html += `
            <tr>
                <td>${entry.entry_date}</td>
                <td>${entry.contract_number}</td>
                <td>${entry.client_name}</td>
                <td>${entry.description}</td>
                <td>${entry.hours_used}h</td>
                <td>$${parseFloat(entry.amount).toLocaleString()}</td>
                <td>${entry.created_by || '-'}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('time-entries-list').innerHTML = html;
}

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    showSection('dashboard');
    
    // Set today's date as default for forms
    const today = new Date().toISOString().split('T')[0];
    document.querySelector('input[name="entry_date"]').value = today;
    document.querySelector('input[name="start_date"]').value = today;
});

// View contract details
function viewContract(contractId) {
    // This would typically open a detailed view or modal
    alert(`Ver detalles del contrato ID: ${contractId}`);
}