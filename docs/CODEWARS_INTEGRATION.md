# Codewars Integration

CodeArena integrates with the free **Codewars API** to allow instructors to import real coding challenges directly into assessments.

## Overview

- **No authentication required** - Free public API
- **1000+ problems** - JavaScript, Python, Java, C++, Go, Rust, and 15+ more languages
- **Difficulty levels** - 1-8 scale automatically mapped to easy/medium/hard
- **Problem metadata** - Descriptions, examples, and success rates included
- **One-click import** - Preview and import problems into your question bank

## How It Works

### User Flow

1. **Instructor visits Problem Import page**
   - Admin/Proctor role required
   - Search or enter Codewars problem ID

2. **Preview problem**
   - See description, difficulty, language support
   - Check problem metadata and success rates
   - Decide if it fits your assessment

3. **Import with one click**
   - Problem automatically converts to CodeArena format
   - Stores in your question bank
   - Ready to add to assessments

### Behind the Scenes

```
1. Instructor enters Codewars problem ID
   ↓
2. Frontend calls: GET /api/problems/codewars/preview/{id}
   ↓
3. Backend fetches from: https://www.codewars.com/api/v1/code-challenges/{id}
   ↓
4. Convert Codewars format → CodeArena format:
   - Title → title
   - Description → content
   - Difficulty (1-8) → easy/medium/hard
   - Languages → supported languages
   - Stats → metadata
   ↓
5. Store as new Question in database
   ↓
6. Available for assessments
```

## API Endpoints

### Check Codewars Availability

```bash
GET /api/problems/codewars/status
```

Response:
```json
{
  "success": true,
  "data": {
    "available": true,
    "service": "codewars",
    "message": "Codewars API is available"
  }
}
```

### Preview a Problem

```bash
GET /api/problems/codewars/preview/{codewarsId}
```

Example:
```bash
GET /api/problems/codewars/preview/square-root-approximation
```

Response:
```json
{
  "success": true,
  "data": {
    "preview": {
      "type": "coding",
      "title": "Square Root Approximation",
      "content": "Your task is to...",
      "language": "javascript",
      "difficulty": "easy",
      "points": 70,
      "tags": ["fundamentals", "codewars-square-root-approximation"],
      "externalLink": "https://www.codewars.com/kata/square-root-approximation",
      "metadata": {
        "codewarsId": "...",
        "codewarsStats": {
          "totalAttempts": 15000,
          "totalCompleted": 12000,
          "successRate": "80.00%"
        }
      }
    },
    "originalProblem": {
      "id": "...",
      "name": "Square Root Approximation",
      "description": "...",
      ...
    }
  }
}
```

### Import a Problem

```bash
POST /api/problems/import
```

Request:
```json
{
  "codewarsId": "square-root-approximation",
  "language": "javascript"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "message": "Problem imported successfully",
    "question": {
      "_id": "...",
      "type": "coding",
      "title": "Square Root Approximation",
      "content": "...",
      "status": "draft",
      "metadata": {
        "codewarsId": "...",
        "codewarsStats": {...}
      }
    }
  }
}
```

## Finding Codewars Problem IDs

### Method 1: Direct Link
```
https://www.codewars.com/kata/square-root-approximation
                            ↑
                    This is the ID/slug
```

### Method 2: Problem URL
```
https://www.codewars.com/kata/5539e2773a7c5e0f6b000a5f
             or
https://www.codewars.com/kata/square-root-approximation
```

### Method 3: Browse Codewars
1. Visit https://www.codewars.com/kata
2. Filter by language (JavaScript, Python, etc.)
3. Filter by difficulty (6 kyu, 5 kyu, etc.)
4. Copy the slug from the URL

## Supported Languages

All programming languages on Codewars are supported for import:
- JavaScript
- Python
- Java
- C++
- Go
- Rust
- TypeScript
- C#
- PHP
- Ruby
- And 10+ more

## Difficulty Mapping

Codewars ranks problems 1-8 (1 = easiest):

| Codewars Rank | CodeArena Level | Points |
|---|---|---|
| 1-2 | Easy | 70 |
| 3-5 | Medium | 100-140 |
| 6-8 | Hard | 150-200 |

Points are calculated: `50 + (difficulty * 10)`

## Features

### Auto-Converted Fields

When you import a problem:

| Codewars | CodeArena |
|---|---|
| name | title |
| description | content |
| difficulty | easy/medium/hard |
| languages | supported languages |
| id | metadata.codewarsId |
| totalAttempts | metadata.stats.totalAttempts |
| totalCompleted | metadata.stats.totalCompleted |

### Metadata Stored

Each imported problem includes:
- Original Codewars problem ID
- Success rate and attempt statistics
- Link back to original problem
- Tags including Codewars slug

### Link Back to Original

Students can see a link to the original Codewars problem for:
- Extended examples
- Community discussion
- Multiple language solutions

## Limitations

1. **Search not available** - Codewars API doesn't support search
   - Solution: Know the problem ID/slug in advance
   - Or: Browse Codewars website to find problem IDs

2. **Test cases not included** - Codewars doesn't expose full test cases
   - Solution: Import problem and customize test cases manually
   - Or: Link to Codewars for students to test there

3. **Rate limiting** - Be respectful with API calls
   - Recommended: Cache problems locally
   - Don't refresh preview repeatedly

## Usage Examples

### Example 1: Import Easy Problem

```javascript
// Frontend
import { problemImportAPI } from '@/lib/api';

try {
  const result = await problemImportAPI.importCodewarsProblem(
    'square-root-approximation',
    'javascript'
  );
  console.log('Imported:', result.data.question.title);
} catch (error) {
  console.error('Import failed:', error.message);
}
```

### Example 2: Preview Before Importing

```javascript
// Frontend
try {
  const preview = await problemImportAPI.previewCodewarsProblem(
    'square-root-approximation'
  );
  console.log('Problem:', preview.data.preview.title);
  console.log('Difficulty:', preview.data.preview.difficulty);
  console.log('Points:', preview.data.preview.points);
} catch (error) {
  console.error('Preview failed:', error.message);
}
```

### Example 3: Check API Status

```javascript
// Frontend
try {
  const status = await problemImportAPI.checkCodewarsStatus();
  if (status.data.available) {
    console.log('Ready to import problems!');
  }
} catch (error) {
  console.error('Codewars API unavailable');
}
```

## Best Practices

1. **Preview before importing** - Ensure problem fits your assessment
2. **Test the problem** - Solve it yourself first on Codewars
3. **Add custom test cases** - Extend with your own test cases
4. **Document requirements** - Add instructions specific to your course
5. **Link to original** - Students can practice there too
6. **Respect rate limits** - Don't spam imports
7. **Check difficulty** - Ensure problem matches your student level

## Troubleshooting

### "Problem not found"

**Cause:** Invalid Codewars ID or problem doesn't exist

**Solution:**
- Check problem URL on Codewars
- Ensure you're using the problem slug (not the numeric ID)
- Try directly on Codewars first

### "Codewars API unavailable"

**Cause:** Network issue or API downtime

**Solution:**
- Check your internet connection
- Verify Codewars is accessible: https://www.codewars.com
- Try again in a few moments
- Check [Codewars Status](https://status.codewars.com)

### "Already imported"

**Cause:** Problem already exists in your question bank

**Solution:**
- Use the existing question
- Delete and re-import if needed
- Check your question bank for the problem

## Future Enhancements

Possible improvements (not yet implemented):

- [ ] Search endpoint (requires Codewars v2 API)
- [ ] Full test case extraction
- [ ] Problem difficulty recommendations
- [ ] Bulk import of problem collections
- [ ] Cache of popular problems
- [ ] Problem recommendation engine

## See Also

- [Codewars API Documentation](https://dev.codewars.com/)
- [Codewars Website](https://www.codewars.com/)
- [API Reference](./API.md#problems)
- [Question Types](./FEATURES.md#question-types-supported)

---

**[← Back to Index](./INDEX.md)**
