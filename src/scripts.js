document.addEventListener('DOMContentLoaded', () => {
    const dashboardLink = document.getElementById('dashboard-link');
    const employeesLink = document.getElementById('employees-link');
    const importSampleLink = document.getElementById('import-sample-link');

    const dashboardSection = document.getElementById('dashboard');
    const employeesSection = document.getElementById('employees');
    const importSampleSection = document.getElementById('import-sample');

    const sections = [dashboardSection, employeesSection, importSampleSection];

    const showSection = (section) => {
        sections.forEach(sec => sec.classList.add('hidden'));
        section.classList.remove('hidden');
    };

    dashboardLink.addEventListener('click', () => {
        showSection(dashboardSection);
        fetchDashboardStats();
    });

    employeesLink.addEventListener('click', () => {
        showSection(employeesSection);
        fetchEmployees();
    });

    importSampleLink.addEventListener('click', () => {
        showSection(importSampleSection);
    });

    const fetchDashboardStats = async () => {
        try {
            const response = await fetch('/dashboard');
            const data = await response.json();

            document.getElementById('total-employees').innerText = data.totalEmployees;
            document.getElementById('active-employees').innerText = data.activeEmployees;
            document.getElementById('total-payroll').innerText = data.totalPayroll.toFixed(2);
            document.getElementById('avg-salary').innerText = data.avgSalary.toFixed(2);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await fetch('/api/employees');
            const employees = await response.json();
            const tableBody = document.getElementById('employee-table-body');
            tableBody.innerHTML = '';
            
            employees.forEach(emp => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${emp.firstName} ${emp.lastName}</td>
                    <td>${emp.email}</td>
                    <td>${emp.department}</td>
                    <td>${emp.position}</td>
                    <td>${emp.hireDate}</td>
                    <td>$${emp.baseSalary.toFixed(2)}</td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const importForm = document.getElementById('import-form');
    importForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(importForm);
        try {
            const response = await fetch('/import/employees', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            alert(`Imported: ${result.imported}, Errors: ${result.errors.length}`);
        } catch (error) {
            console.error('Error importing employees:', error);
        }
    });

    const generateSampleButton = document.getElementById('generate-sample-data');
    generateSampleButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/generate-sample-data', { method: 'POST' });
            const result = await response.json();
            alert(`Sample data generated. Employees: ${result.employeesCount}, Payrolls: ${result.payrollsCount}`);
        } catch (error) {
            console.error('Error generating sample data:', error);
        }
    });

    // Initialize dashboard
    dashboardLink.click();
});
