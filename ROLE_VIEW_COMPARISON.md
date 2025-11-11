# Role-Based View Comparison

This document demonstrates the visual differences between what each role sees in the application.

---

## Dashboard View Comparison

### 🎓 STUDENT/APPLICANT View (`/dashboard`)

**What Students SEE:**
```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard                                    [Logout Button] │
│ Welcome back, Sarah!                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🚀 JTC Hackathon 2025                                       │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐  ┌────────────────────────┐    │
│  │ 💻 Live Coding         │  │ 👥 Teams & Projects    │    │
│  │ Sessions               │  │                        │    │
│  │                        │  │ Browse all teams       │    │
│  │ Join hackathon         │  │ and their projects     │    │
│  │ sessions               │  │                        │    │
│  │ [View Sessions →]      │  │ [Browse Teams →]       │    │
│  └────────────────────────┘  └────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📋 Assessments                                              │
├─────────────────────────────────────────────────────────────┤
│ Available | In Progress | Completed                         │
├─────────────────────────────────────────────────────────────┤
│ Assessment 1: Python Basics                   [Start]       │
│ Assessment 2: JavaScript Advanced             [Start]       │
└─────────────────────────────────────────────────────────────┘
```

**What Students DON'T SEE:**
- ❌ NO "Quick Actions" section at all
- ❌ NO Admin Dashboard link
- ❌ NO Proctor Dashboard link
- ❌ NO Judge Dashboard link
- ❌ NO Hackathon Sessions management link

---

### 🔧 ADMIN View (`/dashboard`)

**What Admins SEE:**
```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard                                    [Logout Button] │
│ Welcome back, Admin User!                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Quick Actions                                               │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ ⚙️ Admin     │ │ 💻 Hackathon │ │ ⚖️ Judge     │       │
│  │ Dashboard    │ │ Sessions     │ │ Dashboard    │       │
│  │              │ │              │ │              │       │
│  │ Manage users │ │ Manage live  │ │ Review and   │       │
│  │ teams, judges│ │ coding       │ │ score        │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🚀 JTC Hackathon 2025                                       │
│ (Same hackathon cards as students see)                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📋 Assessments                                              │
│ (Same assessment section as students see)                   │
└─────────────────────────────────────────────────────────────┘
```

**Key Difference:**
- ✅ Admins see the **"Quick Actions"** section with 3 admin cards
- ✅ Access to Admin Dashboard, Hackathon Sessions, Judge Dashboard
- ✅ Everything else is the same as students

---

### 👁️ PROCTOR View (`/dashboard`)

**What Proctors SEE:**
```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard                                    [Logout Button] │
│ Welcome back, Proctor Name!                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Quick Actions                                               │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐                  │
│  │ 👁️ Proctor Dashboard                 │                  │
│  │                                      │                  │
│  │ Monitor hackathon sessions           │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🚀 JTC Hackathon 2025                                       │
│ (Same hackathon cards as students see)                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📋 Assessments                                              │
│ (Same assessment section as students see)                   │
└─────────────────────────────────────────────────────────────┘
```

**Key Difference:**
- ✅ Proctors see **"Quick Actions"** with 1 proctor card
- ✅ Access to Proctor Dashboard for monitoring
- ❌ No admin or judge access

---

### ⚖️ JUDGE View (`/dashboard`)

**What Judges SEE:**
```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard                                    [Logout Button] │
│ Welcome back, Judge Name!                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Quick Actions                                               │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐                  │
│  │ ⚖️ Judge Dashboard                    │                  │
│  │                                      │                  │
│  │ Review and score hackathon projects  │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🚀 JTC Hackathon 2025                                       │
│ (Same hackathon cards as students see)                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📋 Assessments                                              │
│ (Same assessment section as students see)                   │
└─────────────────────────────────────────────────────────────┘
```

**Key Difference:**
- ✅ Judges see **"Quick Actions"** with 1 judge card
- ✅ Access to Judge Dashboard for scoring
- ❌ No admin or proctor access

---

## How to Verify Role-Based Views

### Test Accounts to Verify Different Views:

1. **Login as Student/Applicant:**
   - Email: `student@example.com`
   - You should see: NO Quick Actions section

2. **Login as Admin:**
   - Email: `admin@example.com`
   - You should see: Quick Actions with 3 cards (Admin, Hackathon Sessions, Judge)

3. **Login as Proctor:**
   - Email: `proctor@example.com`
   - You should see: Quick Actions with 1 card (Proctor Dashboard)

4. **Login as Judge:**
   - Email: `judge@example.com`
   - You should see: Quick Actions with 1 card (Judge Dashboard)

---

## Code Implementation (Dashboard Line 192-261)

The conditional rendering that creates these differences:

```typescript
{/* This entire section only renders for Admin, Proctor, or Judge */}
{(isAdmin() || isProctor() || isJudge()) && (
  <div className="mb-8">
    <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

      {/* Admin sees these 3 cards */}
      {isAdmin() && (
        <>
          <Link href="/admin">Admin Dashboard</Link>
          <Link href="/admin/sessions">Hackathon Sessions</Link>
          <Link href="/judge">Judge Dashboard</Link>
        </>
      )}

      {/* Proctor (non-admin) sees this 1 card */}
      {isProctor() && !isAdmin() && (
        <Link href="/proctor">Proctor Dashboard</Link>
      )}

      {/* Judge (non-admin, non-proctor) sees this 1 card */}
      {isJudge() && !isAdmin() && !isProctor() && (
        <Link href="/judge">Judge Dashboard</Link>
      )}
    </div>
  </div>
)}
```

**If the user role is "Applicant" (student):**
- `isAdmin()` returns `false`
- `isProctor()` returns `false`
- `isJudge()` returns `false`
- The entire Quick Actions section **does not render at all**

---

## Direct Page Access Protection

Even if a student tries to directly navigate to admin pages:

| URL Attempt | What Happens |
|-------------|-------------|
| `/admin` | 🚫 Blocked by `RoleGuard(['Admin'])` |
| `/proctor` | 🚫 Blocked by `RoleGuard(['Admin', 'Proctor'])` |
| `/proctor/monitor` | 🚫 Blocked by `RoleGuard(['Admin', 'Proctor'])` |
| `/admin/sessions` | 🚫 Blocked by `RoleGuard(['Admin', 'Proctor'])` |
| `/judge` | 🚫 Blocked by `RoleGuard(['Judge', 'Admin'])` |

**RoleGuard behavior:**
- Checks user role from authStore
- Redirects to `/dashboard` if unauthorized
- Shows "Access Denied" or redirects before page content loads

---

## Expected Behavior Summary

✅ **Students:**
- Clean, focused dashboard
- Only hackathon and assessment sections
- NO administrative links visible

✅ **Admins:**
- See everything students see
- PLUS: Quick Actions with 3 admin cards
- Full management capabilities

✅ **Proctors:**
- See everything students see
- PLUS: Quick Actions with proctor card
- Monitoring capabilities

✅ **Judges:**
- See everything students see
- PLUS: Quick Actions with judge card
- Scoring capabilities

---

## Troubleshooting

**If you see the same view for all roles:**

1. **Check which user you're logged in as:**
   ```javascript
   // Open browser console
   JSON.parse(localStorage.getItem('user'))
   ```
   Look at the `role` field

2. **Check if authStore is initialized:**
   ```javascript
   // The role checking functions
   useAuthStore.getState().isAdmin()
   useAuthStore.getState().isProctor()
   useAuthStore.getState().isJudge()
   ```

3. **Verify JWT token has correct role:**
   ```javascript
   localStorage.getItem('accessToken')
   // Decode this JWT to check the role claim
   ```

4. **Clear storage and re-login:**
   ```javascript
   localStorage.clear()
   // Then login again
   ```

---

## Visual Inspection Checklist

When logged in as a **student**, scroll through `/dashboard` and verify:
- [ ] NO "Quick Actions" heading visible
- [ ] NO Admin Dashboard card
- [ ] NO Proctor Dashboard card
- [ ] NO Judge Dashboard card
- [ ] NO Hackathon Sessions management link
- [ ] CAN see "JTC Hackathon 2025" section
- [ ] CAN see "Live Coding Sessions" card
- [ ] CAN see "Teams & Projects" card
- [ ] CAN see "Assessments" section

When logged in as **admin**, verify:
- [ ] DOES see "Quick Actions" heading
- [ ] DOES see 3 cards: Admin, Hackathon Sessions, Judge
- [ ] Everything else is the same

