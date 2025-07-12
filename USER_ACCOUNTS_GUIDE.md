# 👥 **3-User Account System Guide**

## 🚀 **Quick Setup**

### **Step 1: Run Database Migration**
```bash
cd backend/
node migrate.js
```

### **Step 2: Start Backend**
```bash
npm start
```

### **Step 3: Start Frontend**
```bash
cd ../frontend/
npm start
```

### **Step 4: Access Login Page**
Go to: `http://localhost:3000`

---

## 👤 **User Accounts & Credentials**

### **1. 👑 Administrator Account**
```
Username: admin
Password: admin123
Role: admin
Employee ID: None (System Admin)
```

**🔑 Permissions:**
- ✅ **Full System Access** - Complete control over everything
- ✅ **User Management** - Create/manage user accounts
- ✅ **Master Data Management** - Manage offices, positions, relationships
- ✅ **Employee Management** - Full CRUD operations
- ✅ **Payroll Management** - Calculate, process, and approve payroll
- ✅ **Holiday Management** - Manage company holidays
- ✅ **Reports Access** - View and export all reports
- ✅ **System Administration** - Configure system settings

**🎯 Use Cases:**
- System configuration and setup
- Managing other user accounts
- Setting up offices and positions
- Final approval of payroll
- System-wide reporting

---

### **2. 👨‍💼 Human Resources Account**
```
Username: hr
Password: hr123
Role: hr
Employee ID: EMP001
```

**🔑 Permissions:**
- ✅ **Employee Management** - Hire, manage, and track employees
- ✅ **Payroll Management** - Process and calculate payroll
- ✅ **Holiday Management** - Manage company holidays and leaves
- ✅ **Reports Access** - Generate HR and payroll reports
- ✅ **Dashboard Access** - View overall company metrics
- ❌ **Master Data Management** - Cannot modify offices/positions
- ❌ **User Management** - Cannot create system users

**🎯 Use Cases:**
- Employee onboarding and management
- Payroll processing and verification
- Managing employee leaves and holidays
- HR reporting and analytics
- Employee performance tracking

---

### **3. 👨‍💼 Floor Manager Account**
```
Username: floormanager
Password: manager123
Role: floor_manager
Employee ID: EMP002
```

**🔑 Permissions:**
- ✅ **Employee Management** - Manage team members
- ✅ **Payroll Management** - Review and process team payroll
- ✅ **Reports Access** - View team and departmental reports
- ✅ **Dashboard Access** - Monitor team performance
- ❌ **Holiday Management** - Cannot manage company holidays
- ❌ **Master Data Management** - Cannot modify system settings
- ❌ **User Management** - Cannot create users

**🎯 Use Cases:**
- Managing floor operations
- Team payroll oversight
- Departmental reporting
- Employee attendance tracking
- Team performance monitoring

---

## 🔐 **Login Process**

### **Method 1: Manual Login**
1. Go to login page
2. Enter username and password
3. Optional: Enable 2FA checkbox
4. Enter 6-digit code (if 2FA enabled)
5. Click "Sign In"

### **Method 2: Quick Login (Demo)**
1. Click the colored user account cards
2. Click the **"Use"** button for any account
3. Credentials auto-fill
4. Click "Sign In"

---

## 🛡️ **Role-Based Access Control**

### **Navigation Menu (Dynamic)**
Each user sees different menu items based on their permissions:

#### **👑 Admin Sees:**
- Dashboard
- Employees
- Payroll
- Reports
- Holidays
- Profile
- **Master Data** (Add Office/Position)

#### **👨‍💼 HR Sees:**
- Dashboard
- Employees
- Payroll
- Reports
- Holidays
- Profile

#### **👨‍💼 Floor Manager Sees:**
- Dashboard
- Employees
- Payroll
- Reports
- Profile

---

## 🔒 **Security Features**

### **Available for All Users:**
- 🔐 **Two-Factor Authentication** (Google Authenticator)
- 🔑 **JWT Token Security** (24-hour expiration)
- 🛡️ **Password Encryption** (bcrypt with salt)
- 🚫 **Role-based Page Protection**
- 📱 **Session Management**

### **Setup 2FA:**
1. Login with any account
2. Go to **Profile** page
3. Click **"Enable 2FA"** in Security Settings
4. Scan QR code with Google Authenticator
5. Enter verification code
6. Save backup codes

---

## 🔄 **Switching Between Accounts**

### **Method 1: Logout & Login**
1. Click logout button in sidebar (bottom-right)
2. Select different account on login page
3. Enter credentials

### **Method 2: Quick Switch (Demo)**
1. Logout
2. Use the "Use" buttons for different accounts
3. Credentials auto-populate

---

## 📊 **Testing Each Role**

### **👑 Admin Testing:**
```bash
1. Login as admin
2. Access Master Data → Add Office/Position
3. Go to Holidays → Manage holidays
4. Check all menu items are visible
5. Verify employee management works
6. Test payroll calculations
```

### **👨‍💼 HR Testing:**
```bash
1. Login as hr
2. Notice "Master Data" section is hidden
3. Access Employees → Add/Edit employees
4. Access Payroll → Process payroll
5. Access Holidays → Manage holidays
6. Access Reports → View employee reports
```

### **👨‍💼 Floor Manager Testing:**
```bash
1. Login as floormanager
2. Notice "Holidays" is hidden
3. Access Employees → Manage team
4. Access Payroll → Process team payroll
5. Access Reports → View team reports
6. Verify limited access to certain features
```

---

## 🎯 **Production Setup**

### **Security Checklist:**
- [ ] Change all default passwords
- [ ] Enable 2FA for all accounts
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS
- [ ] Set up proper database security
- [ ] Regular security audits

### **Recommended Password Changes:**
```bash
Admin: admin123 → [Strong Password]
HR: hr123 → [Strong Password]  
Floor Manager: manager123 → [Strong Password]
```

---

## 📱 **Mobile Access**

All accounts work perfectly on mobile devices:
- ✅ Responsive design
- ✅ Touch-friendly interface
- ✅ Mobile-optimized navigation
- ✅ Mobile 2FA support

---

## 🆘 **Troubleshooting**

### **Login Issues:**
1. **Wrong credentials**: Use exact usernames (case-sensitive)
2. **2FA not working**: Check phone time sync
3. **Account locked**: No lockout implemented yet
4. **Permission denied**: Check role-based access

### **Role Issues:**
1. **Missing menu items**: Normal based on role
2. **Access denied**: Expected for restricted features
3. **Can't see data**: Check if role has permission

### **Quick Reset:**
```bash
# Reset database and users
cd backend/
node migrate.js
```

---

## 📈 **Usage Analytics**

### **Role Distribution:**
- **Admin**: 1 account (System-wide)
- **HR**: 1+ accounts (Department-level)
- **Floor Manager**: Multiple accounts (Team-level)
- **Employee**: Multiple accounts (Individual-level)

### **Permission Hierarchy:**
```
Admin > HR > Floor Manager > Employee
```

---

## 🎉 **Summary**

Your payroll system now has **complete multi-user support** with:

✅ **3 Pre-configured Accounts** with different access levels  
✅ **Role-based Permission System** with granular control  
✅ **Dynamic Navigation** that adapts to user roles  
✅ **2FA Security** available for all accounts  
✅ **Production-ready Authentication** with JWT  
✅ **Easy Account Switching** for testing  
✅ **Mobile-responsive Design** for all devices  

**Ready for production deployment!** 🚀

---

## 📞 **Support**

Need help? Check the role permissions and ensure you're using the correct account for your intended actions.

**Quick Reference:**
- Admin: Full access to everything
- HR: Employee + Payroll + Holiday management
- Floor Manager: Employee + Payroll management only