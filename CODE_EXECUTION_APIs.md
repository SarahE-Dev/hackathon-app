# Code Execution APIs - Free & Open Source Options

## TL;DR: Best Options for Your Platform

**Recommended: Judge0 CE (Community Edition)** - Free, open source, self-hosted, supports 60+ languages

---

## About LeetCode & HackerRank APIs

### ❌ LeetCode
- **No official public API**
- Has an unofficial GraphQL API (reverse-engineered)
- Not recommended for production use
- Terms of Service prohibit scraping/automation

### ❌ HackerRank
- **API exists but is enterprise-only**
- HackerRank for Work API (paid enterprise plans)
- Not available for free/personal projects
- Pricing: Contact sales (expensive)

---

## ✅ FREE Open Source Alternatives

### 1. **Judge0 CE** (HIGHLY RECOMMENDED)

**What it is**: Open-source code execution system

**Features**:
- ✅ **60+ programming languages**
- ✅ **Self-hosted** (Docker-based)
- ✅ **FREE** (MIT License)
- ✅ **Production-ready**
- ✅ **Isolated execution** (sandboxed)
- ✅ **Time & memory limits**
- ✅ **REST API**
- ✅ **Batch submissions**
- ✅ **Used by 1000+ projects**

**Supported Languages**: Python, JavaScript, Java, C++, C, C#, Ruby, Go, Rust, PHP, Swift, Kotlin, and 50+ more

**Deployment Options**:
1. **Self-hosted (Docker)** - Free forever
2. **RapidAPI** - Free tier: 50 requests/day
3. **Judge0 Subs** - Paid managed hosting

**GitHub**: https://github.com/judge0/judge0

**Example Usage**:
```bash
# Self-hosted endpoint
curl -X POST http://localhost:2358/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "source_code": "print(2 + 3)",
    "language_id": 71,
    "stdin": ""
  }'
```

**Integration Complexity**: ⭐⭐⭐⭐⭐ (Easy)

**Best For**: Production applications, hackathons, coding assessments

---

### 2. **Piston**

**What it is**: High-performance code execution engine

**Features**:
- ✅ **40+ languages**
- ✅ **Self-hosted** (Docker)
- ✅ **FREE & Open Source**
- ✅ **Fast** (optimized for speed)
- ✅ **Simple REST API**
- ✅ **Active development**

**Supported Languages**: Python, JavaScript, Java, C++, C, Go, Rust, TypeScript, and more

**Deployment**: Docker Compose

**GitHub**: https://github.com/engineer-man/piston

**Example Usage**:
```bash
curl -X POST https://emkc.org/api/v2/piston/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "version": "3.10",
    "files": [{
      "content": "print(2 + 3)"
    }]
  }'
```

**Integration Complexity**: ⭐⭐⭐⭐⭐ (Easy)

**Best For**: Speed-critical applications, simple code execution

---

### 3. **Glot.io**

**What it is**: Code execution API with free tier

**Features**:
- ✅ **30+ languages**
- ✅ **Hosted service** (no setup)
- ✅ **Free tier**: 10 req/sec
- ✅ **Simple API**
- ⚠️ Rate limits on free tier

**Supported Languages**: Python, JavaScript, Java, C++, C, Ruby, Go, Rust, and more

**Website**: https://glot.io/

**Example Usage**:
```bash
curl -X POST https://glot.io/api/run/python/latest \
  -H "Authorization: Token YOUR_TOKEN" \
  -d '{
    "files": [{
      "name": "main.py",
      "content": "print(2 + 3)"
    }]
  }'
```

**Integration Complexity**: ⭐⭐⭐⭐ (Easy)

**Best For**: Quick prototyping, low-volume applications

---

### 4. **Jdoodle**

**What it is**: Online compiler API

**Features**:
- ✅ **70+ languages**
- ✅ **Hosted service**
- ✅ **Free tier**: 200 calls/day
- ⚠️ Credit-based system

**Website**: https://www.jdoodle.com/compiler-api/

**Pricing**:
- Free: 200 credits/day
- Pro: $10/month (2000 credits/day)

**Integration Complexity**: ⭐⭐⭐⭐ (Easy)

**Best For**: Low-volume testing, development

---

## 🏆 Recommendation for Your Platform

### Use **Judge0 CE** (Self-Hosted)

**Why?**

1. **Cost**: Completely FREE forever
2. **Scale**: Handle unlimited requests
3. **Privacy**: Your code never leaves your servers
4. **Reliability**: No external dependencies
5. **Features**: Most comprehensive
6. **Community**: Large, active community
7. **Production-Ready**: Used by major platforms

**Setup Time**: 15 minutes with Docker

---

## Quick Start: Judge0 CE

### 1. Install with Docker Compose

```bash
# Clone the repository
git clone https://github.com/judge0/judge0.git
cd judge0

# Start Judge0
docker-compose up -d

# Judge0 will be available at:
# http://localhost:2358
```

### 2. Test It

```bash
# Submit code
curl -X POST http://localhost:2358/submissions?wait=true \
  -H "Content-Type: application/json" \
  -d '{
    "source_code": "print(\"Hello from Judge0\")",
    "language_id": 71
  }'
```

### 3. Integrate with Your Backend

Add to your `backend/src/services/codeExecutionService.ts`:

```typescript
import axios from 'axios';

const JUDGE0_URL = process.env.JUDGE0_URL || 'http://localhost:2358';

export const executeCode = async (
  sourceCode: string,
  languageId: number,
  stdin: string = '',
  expectedOutput?: string
) => {
  // Submit code
  const response = await axios.post(`${JUDGE0_URL}/submissions?wait=true`, {
    source_code: sourceCode,
    language_id: languageId,
    stdin,
    expected_output: expectedOutput,
  });

  return response.data;
};

// Language IDs:
// 71 - Python (3.8)
// 63 - JavaScript (Node.js)
// 62 - Java
// 54 - C++ (GCC 9.2)
// 76 - C++ (Clang 10)
```

---

## Language IDs (Judge0)

Common languages for hackathons:

| Language | ID | Version |
|----------|----|----- ---|
| Python | 71 | 3.8.1 |
| JavaScript (Node.js) | 63 | 12.14.0 |
| Java | 62 | OpenJDK 13 |
| C++ (GCC) | 54 | GCC 9.2.0 |
| C (GCC) | 50 | GCC 9.2.0 |
| Go | 60 | 1.13.5 |
| Rust | 73 | 1.40.0 |
| TypeScript | 74 | 3.7.4 |
| Ruby | 72 | 2.7.0 |
| PHP | 68 | 7.4.1 |

Full list: https://github.com/judge0/judge0/blob/master/CHANGELOG.md

---

## Comparison Table

| Feature | Judge0 CE | Piston | Glot.io | Jdoodle |
|---------|-----------|--------|---------|---------|
| **Free Forever** | ✅ | ✅ | Limited | Limited |
| **Self-Hosted** | ✅ | ✅ | ❌ | ❌ |
| **Languages** | 60+ | 40+ | 30+ | 70+ |
| **No Rate Limits** | ✅ | ✅ | ❌ | ❌ |
| **Open Source** | ✅ | ✅ | ❌ | ❌ |
| **Batch Execution** | ✅ | ❌ | ❌ | ❌ |
| **Test Cases** | ✅ | ❌ | ❌ | ✅ |
| **Setup Difficulty** | Medium | Medium | None | None |
| **Production Ready** | ✅ | ✅ | ⚠️ | ⚠️ |

---

## Integration Roadmap

### Phase 1: Basic Code Execution (Week 7)

1. **Set up Judge0 CE**
   ```bash
   cd code-runner
   git clone https://github.com/judge0/judge0.git
   cd judge0
   docker-compose up -d
   ```

2. **Create Service** (`backend/src/services/codeExecutionService.ts`)
   - Execute code via Judge0 API
   - Handle test cases
   - Calculate scores

3. **Add API Endpoint** (`POST /api/code/execute`)
   - Receive code from frontend
   - Submit to Judge0
   - Return results

### Phase 2: Queue System (Week 7)

1. **Add BullMQ**
   - Queue code execution jobs
   - Handle multiple submissions
   - Prevent overload

2. **Add Worker**
   - Process jobs from queue
   - Update attempt with results
   - Handle failures

### Phase 3: Advanced Features (Post-MVP)

- Multiple language support
- Custom test case management
- Performance metrics
- Memory/time analysis
- Code similarity detection

---

## Cost Analysis

### Self-Hosted Judge0 (Recommended)

**Infrastructure Costs** (AWS EC2):
- **t3.medium**: $30/month (2 vCPU, 4GB RAM)
- Handles: ~100 concurrent executions
- Scale up as needed

**Comparison**:
- **Jdoodle Pro**: $10/month (2000 executions/day = ~$0.005/execution)
- **Judge0 Self-Hosted**: $30/month (unlimited executions = ~$0.0001/execution at 30k/month)

**Break-even**: After 6,000 executions/month, self-hosting is cheaper

**For Hackathons**: Self-hosting is MUCH cheaper (1000+ submissions in a day)

---

## Security Considerations

### Judge0 CE Security Features

✅ **Sandboxing**: Each execution in isolated container
✅ **Time Limits**: Prevent infinite loops
✅ **Memory Limits**: Prevent memory exhaustion
✅ **CPU Limits**: Prevent CPU hogging
✅ **Network Isolation**: No internet access
✅ **File System Restrictions**: Limited disk access

### Additional Security (Your Backend)

- Rate limiting per user
- Input validation (max code size)
- Malicious code detection
- Execution quotas

---

## Alternative: Build Your Own

If you want full control, you can build your own using:

1. **Docker SDK** - Run code in containers
2. **Resource Limits** - cgroups for CPU/memory
3. **Timeout** - Kill long-running processes
4. **Cleanup** - Remove containers after execution

**Pros**: Full control, no external dependencies
**Cons**: Complex, security risks, maintenance burden

**Recommendation**: Use Judge0 unless you have specific needs

---

## Conclusion

### ✅ Use Judge0 CE for Your Platform

**Setup**:
```bash
# In your docker-compose.yml, add:
services:
  judge0:
    image: judge0/judge0:latest
    ports:
      - "2358:2358"
    environment:
      - REDIS_HOST=redis
      - POSTGRES_HOST=postgres
```

**Integration**: ~2 hours
**Cost**: $0 (or $30/month for dedicated server)
**Maintenance**: Minimal

**You'll have**: Production-ready code execution for 60+ languages!

---

## Resources

- **Judge0 Docs**: https://ce.judge0.com/
- **Judge0 GitHub**: https://github.com/judge0/judge0
- **Piston GitHub**: https://github.com/engineer-man/piston
- **Glot.io**: https://glot.io/
- **Community**: Judge0 Discord (active support)

---

## Need Help?

1. Check Judge0 documentation
2. Join Judge0 Discord community
3. Review example integrations on GitHub
4. See NEXT_STEPS.md for integration checklist

**You're ready to add code execution to your platform!** 🚀
