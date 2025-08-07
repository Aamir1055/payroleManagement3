import openpyxl
from datetime import datetime, timedelta

# Employee Data extracted from get_employee_data output
employees = [
    {'employeeId': 'EMP-143', 'name': 'ABDUL RAHIM J'},
    {'employeeId': 'EMP-017', 'name': 'HAMZA SHAHZAD'},
    {'employeeId': 'EMP-040', 'name': 'MAHIN KHAN'},
    # Add more employees as required...
]

# Create new workbook and sheet
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "July 2025 Attendance"

# Define header
headers = ['Employee ID', 'Employee Name'] + [f"2025-07-{day:02d}" for day in range(1, 32)
                                               if datetime(2025, 7, day).weekday() < 5]  # excluding Sundays
ws.append(headers)

# Fill sheet with dummy data
for employee in employees:
    row = [employee['employeeId'], employee['name']] + ['P'] * (len(headers) - 2)
    ws.append(row)

# Save to a new file
wb.save('C:\\Users\\bazaa\\Desktop\\PayRollManagementSystem\\payroleManagement1\\payroleManagement2\\backend\\attendance_july_2025.xlsx')
print("Attendance file for July 2025 created successfully.")

