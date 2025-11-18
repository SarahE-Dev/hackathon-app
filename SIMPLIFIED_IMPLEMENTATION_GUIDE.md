# Simplified Implementation Guide
**Self-Contained Features - No External Dependencies**

This guide covers the **self-contained improvements** that don't require external services like Sentry, identity verification APIs, or third-party monitoring tools.

---

## ✅ What's Been Implemented (Self-Contained)

### 1. **Enhanced Proctoring Audit Trail** ✅

Track comprehensive user behavior during assessments - all stored in your MongoDB database.

#### Features:
- **Keystroke Dynamics:** Track typing speed, pause patterns, delete ratio
- **Mouse Tracking:** Track clicks, movements, scrolls (throttled)
- **Code Change Tracking:** Track inserts, deletes, pastes
- **Behavioral Analysis:** Calculate consistency scores, detect suspicious patterns
- **Navigation Tracking:** Time per question, revisit patterns, answer changes
- **Risk Scoring:** Automated 0-100 risk score based on all factors

#### Files Created:
- `backend/src/services/auditTrailService.ts` - Core audit trail logic
- `backend/src/controllers/auditTrailController.ts` - API endpoints
- `frontend/src/hooks/useAuditTrail.ts` - Frontend tracking hook

#### API Endpoints:
```typescript
// Batch log events (called from frontend automatically)
POST /api/attempts/:attemptId/audit-events
Body: { events: AuditEvent[] }

// Get behavioral metrics for admin review
GET /api/attempts/:attemptId/behavioral-metrics

// Get navigation patterns
GET /api/attempts/:attemptId/navigation-patterns

// Get full audit trail with risk score
GET /api/attempts/:attemptId/audit-trail
```

#### How It Works:
1. Frontend hooks automatically track user behavior
2. Events are batched and sent every 10 seconds
3. Backend stores everything in MongoDB
4. Admin/proctor can review detailed audit trails
5. Automated risk scoring flags suspicious attempts

#### Usage Example:
```typescript
// In your assessment component
import { useAuditTrail } from '@/hooks/useAuditTrail';

const { trackCodeChange } = useAuditTrail({
  attemptId,
  questionId: currentQuestion._id,
  enabled: attempt?.assessmentSnapshot.settings.proctoring.enabled,
});

// Automatically tracks keystrokes, mouse, navigation
// For code editor changes, track manually:
monaco.editor.onDidChangeModelContent((e) => {
  trackCodeChange('insert', e.changes[0].rangeOffset, e.changes[0].text.length, e.changes[0].text);
});
```

---

### 2. **Enhanced Question Navigator** ✅

Power user features for faster assessment navigation.

#### Features:
- **Real-time Search:** Search questions by title, type, or number
- **Smart Filters:** Filter by answered, flagged, unanswered, or all
- **Visual Status:** Color-coded question tiles (answered, flagged, current)
- **Progress Tracking:** Live progress percentage and bar
- **Quick Actions:** 
  - Flag/unflag current question
  - Jump to next unanswered
  - Navigate with search
- **Stats Display:** Live counts of answered, flagged, unanswered

#### File Created:
- `frontend/src/components/QuestionNavigator.tsx`

#### Usage:
```typescript
import { QuestionNavigator } from '@/components/QuestionNavigator';

<QuestionNavigator
  questions={questions}
  currentIndex={currentQuestionIndex}
  answers={answers}
  flaggedQuestions={flaggedQuestions}
  onNavigate={setCurrentQuestionIndex}
  onToggleFlag={toggleFlagQuestion}
/>
```

---

## 🎯 Integration Steps

### Step 1: Enable Audit Trail in Assessment

Update your assessment page to use the audit trail hook:

```typescript
// In frontend/src/app/assessment/[attemptId]/page.tsx
import { useAuditTrail } from '@/hooks/useAuditTrail';

// Inside component
const { trackCodeChange } = useAuditTrail({
  attemptId,
  questionId: currentQuestion._id,
  enabled: attempt?.assessmentSnapshot.settings.proctoring.enabled,
  batchSize: 20,
  flushInterval: 10000, // 10 seconds
});

// Tracking happens automatically for keystrokes, mouse, navigation
// For code changes in Monaco, manually track:
const handleEditorChange = (value: string, event: any) => {
  if (event.changes) {
    event.changes.forEach((change: any) => {
      trackCodeChange(
        change.text ? 'insert' : 'delete',
        change.rangeOffset,
        change.text?.length || change.rangeLength,
        change.text
      );
    });
  }
};
```

### Step 2: Replace Old Question Sidebar

Replace the simple question grid with the enhanced navigator:

```typescript
// Old code:
<div className="glass rounded-2xl p-6">
  <div className="grid grid-cols-5 gap-2">
    {questions.map((q, i) => <button>...</button>)}
  </div>
</div>

// New code:
<QuestionNavigator
  questions={questions}
  currentIndex={currentQuestionIndex}
  answers={answers}
  flaggedQuestions={flaggedQuestions}
  onNavigate={setCurrentQuestionIndex}
  onToggleFlag={toggleFlagQuestion}
/>
```

### Step 3: Add Admin Audit Trail Viewer

Create an admin page to review audit trails:

```typescript
// frontend/src/app/admin/audit/[attemptId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

export default function AuditTrailPage({ params }: { params: { attemptId: string } }) {
  const [auditTrail, setAuditTrail] = useState(null);

  useEffect(() => {
    const fetchAuditTrail = async () => {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(
        `/api/attempts/${params.attemptId}/audit-trail`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAuditTrail(response.data.data);
    };
    
    fetchAuditTrail();
  }, [params.attemptId]);

  if (!auditTrail) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Audit Trail</h1>
      
      {/* Risk Score */}
      <div className={`p-4 rounded-lg ${
        auditTrail.summary.riskScore > 70 ? 'bg-red-500/20 border border-red-500' :
        auditTrail.summary.riskScore > 40 ? 'bg-yellow-500/20 border border-yellow-500' :
        'bg-green-500/20 border border-green-500'
      }`}>
        <h2 className="font-bold">Risk Score: {auditTrail.summary.riskScore}/100</h2>
        <p className="text-sm">
          {auditTrail.summary.riskScore > 70 ? 'High Risk - Manual Review Recommended' :
           auditTrail.summary.riskScore > 40 ? 'Medium Risk - Review Recommended' :
           'Low Risk - Normal Behavior'}
        </p>
      </div>

      {/* Behavioral Metrics */}
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-2">Behavioral Metrics</h2>
        <ul className="space-y-2">
          <li>Typing Speed: {auditTrail.behavioral.avgTypingSpeed} WPM</li>
          <li>Delete Ratio: {(auditTrail.behavioral.deleteRatio * 100).toFixed(1)}%</li>
          <li>Paste Count: {auditTrail.behavioral.pasteCount}</li>
          <li>Consistency Score: {(auditTrail.behavioral.consistencyScore * 100).toFixed(1)}%</li>
        </ul>
        
        {auditTrail.behavioral.suspiciousPatterns.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-500/20 rounded">
            <h3 className="font-bold text-yellow-400">⚠️ Suspicious Patterns:</h3>
            <ul className="list-disc list-inside">
              {auditTrail.behavioral.suspiciousPatterns.map((pattern: string, i: number) => (
                <li key={i}>{pattern}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-2">Event Timeline</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {auditTrail.timeline.map((event: any, i: number) => (
            <div key={i} className="p-2 bg-dark-800 rounded flex justify-between">
              <span className="text-sm">{event.type}</span>
              <span className="text-xs text-gray-500">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 📊 Testing the Features

### Test Audit Trail:

1. **Start an assessment** with proctoring enabled
2. **Type some code** - keystrokes are tracked
3. **Copy/paste** something - paste events are logged
4. **Switch tabs** - tab switch logged
5. **After submission**, call the audit trail API:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/attempts/ATTEMPT_ID/audit-trail
```

Expected response:
```json
{
  "success": true,
  "data": {
    "behavioral": {
      "avgTypingSpeed": 85,
      "pausePatterns": [100, 150, 200, ...],
      "deleteRatio": 0.15,
      "pasteCount": 3,
      "copyCount": 2,
      "consistencyScore": 0.78,
      "suspiciousPatterns": []
    },
    "navigation": {
      "totalTimeSpent": 1800,
      "questionsVisited": 10,
      "avgTimePerQuestion": 180,
      "quickCompletions": 2,
      "suspiciousPatterns": []
    },
    "summary": {
      "totalEvents": 450,
      "suspiciousEvents": 5,
      "riskScore": 25
    }
  }
}
```

### Test Question Navigator:

1. **Open an assessment**
2. **Search** for a question by typing in the search box
3. **Filter** by "Unanswered" - should show only unanswered questions
4. **Flag** a question - should appear in "Flagged" filter
5. **Click "Jump to Next Unanswered"** - should navigate to first unanswered

---

## 🚀 Performance Considerations

### Audit Trail:
- Events are **batched** (20 events at a time)
- **10-second flush interval** reduces server load
- Uses **navigator.sendBeacon** on page unload for reliability
- Mouse movements are **throttled** to 1 per second
- Code content is **limited** to 100 characters per event

### Question Navigator:
- Uses **useMemo** for filtering/search (no re-renders)
- **Instant search** with no debounce needed (React is fast enough)
- **Smooth animations** with CSS transitions
- No external dependencies

---

## 🔒 Privacy & Data Retention

All audit trail data is stored in your MongoDB database. Consider:

1. **Data Retention Policy:**
```typescript
// Automatically clean up old audit data
// Add to your cleanup cron job
const deleteOldAuditData = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  await Attempt.updateMany(
    { createdAt: { $lt: thirtyDaysAgo } },
    { $set: { events: [] } }
  );
};
```

2. **Anonymization for Research:**
```typescript
// Remove PII from events for research/analysis
const anonymizeAuditData = (events: any[]) => {
  return events.map(e => ({
    type: e.type,
    timestamp: e.timestamp,
    metadata: {
      ...e.metadata,
      // Remove any PII
      questionId: undefined, // or hash it
    }
  }));
};
```

---

## 📝 Configuration Options

### Audit Trail Configuration:
```typescript
// backend/src/config/auditTrail.ts
export const AUDIT_TRAIL_CONFIG = {
  // Enable/disable features
  trackKeystrokes: true,
  trackMouse: true,
  trackCodeChanges: true,
  
  // Performance
  batchSize: 20,
  flushInterval: 10000, // ms
  
  // Privacy
  storeCodeContent: true, // Set false for privacy
  maxCodeContentLength: 100,
  
  // Retention
  retentionDays: 90,
  
  // Risk thresholds
  riskThresholds: {
    high: 70,
    medium: 40,
    low: 0,
  },
};
```

### Question Navigator Configuration:
```typescript
// In your assessment component
<QuestionNavigator
  questions={questions}
  currentIndex={currentQuestionIndex}
  answers={answers}
  flaggedQuestions={flaggedQuestions}
  onNavigate={setCurrentQuestionIndex}
  onToggleFlag={toggleFlagQuestion}
  // Optional: customize colors, icons, etc.
/>
```

---

## ✅ Summary

You now have:
1. ✅ **Comprehensive audit trail** without external services
2. ✅ **Enhanced question navigator** with search and filters
3. ✅ **Risk scoring** for automatic flagging
4. ✅ **Self-contained** - all data in your MongoDB

**Next:** Real-time collaborative editor with Yjs (self-hosted WebSocket)

---

*All implementations are production-ready and tested.*
