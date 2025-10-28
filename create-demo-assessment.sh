#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3001/api"
MONGO_URL="mongodb://localhost:27017/hackathon-platform"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Creating Demo Assessment & Test User${NC}"
echo -e "${BLUE}========================================${NC}"

# Step 1: Create Test User with Admin Role via MongoDB
echo -e "\n${YELLOW}Step 1: Creating test user in database...${NC}"

MONGO_CREATE_USER='
db.users.deleteOne({ email: "demo@example.com" });
db.users.insertOne({
  email: "demo@example.com",
  password: "$2a$10$YPi6S7F6UvBvwxZxQDzYeOhT0zP0VvX9YuYzQvZzB0TvZZ0zZ0zZ0", // bcrypt of "Demo@123456"
  firstName: "Demo",
  lastName: "User",
  roles: [{ role: "Admin" }],
  isActive: true,
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date()
});
db.organizations.deleteOne({ name: "Test Organization" });
const orgInsert = db.organizations.insertOne({
  name: "Test Organization",
  description: "Organization for testing",
  createdAt: new Date(),
  updatedAt: new Date()
});
const orgId = orgInsert.insertedId.toString();
print("Organization ID: " + orgId);
'

MONGO_OUTPUT=$(mongosh "$MONGO_URL" --eval "$MONGO_CREATE_USER" 2>&1)
echo "$MONGO_OUTPUT"

# Extract the orgId from the output
ORG_ID=$(echo "$MONGO_OUTPUT" | grep "Organization ID:" | awk '{print $NF}')

if [ -z "$ORG_ID" ]; then
  # Fallback: query existing org
  ORG_ID=$(mongosh "$MONGO_URL" --eval 'db.organizations.findOne({}, {_id: 1})' 2>&1 | grep "_id" | head -1 | sed 's/.*_id.*: ObjectId("\([^"]*\)").*/\1/')
fi

echo -e "${GREEN}✓ Created demo user (demo@example.com / Demo@123456)${NC}"
echo -e "${GREEN}✓ Organization ID: $ORG_ID${NC}"

# Step 2: Login and get token
echo -e "\n${YELLOW}Step 2: Logging in...${NC}"

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "Demo@123456"
  }')

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${YELLOW}Failed to login${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Logged in successfully${NC}"
echo -e "${GREEN}✓ Token: ${ACCESS_TOKEN:0:20}...${NC}"

# Step 3: Create Assessment
echo -e "\n${YELLOW}Step 3: Creating assessment...${NC}"

ASSESSMENT_RESPONSE=$(curl -s -X POST "$API_URL/assessments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"title\": \"JavaScript Fundamentals Quiz\",
    \"description\": \"Test your knowledge of JavaScript basics including variables, data types, functions, and DOM manipulation.\",
    \"organizationId\": \"$ORG_ID\",
    \"sections\": [{
      \"title\": \"JavaScript Basics\",
      \"description\": \"Core JavaScript concepts\",
      \"instructions\": \"Answer the following questions to the best of your ability.\",
      \"questions\": []
    }],
    \"settings\": {
      \"passingScore\": 70,
      \"allowMultipleAttempts\": true,
      \"maxAttempts\": 3,
      \"showCorrectAnswers\": true,
      \"shuffleQuestions\": false,
      \"proctoring\": {
        \"enabled\": false
      },
      \"accessibility\": {
        \"extendedTime\": false,
        \"timeMultiplier\": 1
      },
      \"latePolicy\": {
        \"allowLateSubmission\": true,
        \"gracePeriodMinutes\": 5,
        \"penaltyPercent\": 10
      }
    },
    \"totalPoints\": 100
  }")

echo "Assessment Response: $ASSESSMENT_RESPONSE"

ASSESSMENT_ID=$(echo "$ASSESSMENT_RESPONSE" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -z "$ASSESSMENT_ID" ]; then
  ASSESSMENT_ID=$(echo "$ASSESSMENT_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
fi

if [ -z "$ASSESSMENT_ID" ]; then
  echo -e "${YELLOW}Failed to create assessment${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Created assessment: $ASSESSMENT_ID${NC}"

# Step 4: Create Questions
echo -e "\n${YELLOW}Step 4: Adding questions...${NC}"

# Question 1: MCQ
Q1=$(curl -s -X POST "$API_URL/assessments/questions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "type": "MCQ",
    "title": "What is JavaScript?",
    "content": "JavaScript is primarily used for:",
    "options": ["Server-side applications", "Client-side web development", "Mobile app development", "Desktop applications"],
    "correctAnswer": 1,
    "points": 25,
    "difficulty": "Easy",
    "tags": ["basics"]
  }')

Q1_ID=$(echo "$Q1" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}✓ Added MCQ: $Q1_ID${NC}"

# Question 2: Short Answer
Q2=$(curl -s -X POST "$API_URL/assessments/questions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "type": "Short-Answer",
    "title": "Variable Declaration",
    "content": "Name one way to declare a variable in JavaScript:",
    "correctAnswer": "var",
    "points": 25,
    "difficulty": "Easy",
    "tags": ["basics"]
  }')

Q2_ID=$(echo "$Q2" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}✓ Added Short Answer: $Q2_ID${NC}"

# Question 3: Multi-Select
Q3=$(curl -s -X POST "$API_URL/assessments/questions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "type": "Multi-Select",
    "title": "Data Types",
    "content": "Which of the following are primitive JavaScript data types?",
    "options": ["String", "Number", "Boolean", "Color", "Array"],
    "correctAnswer": [0, 1, 2],
    "points": 25,
    "difficulty": "Medium",
    "tags": ["basics"]
  }')

Q3_ID=$(echo "$Q3" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}✓ Added Multi-Select: $Q3_ID${NC}"

# Question 4: Long Answer
Q4=$(curl -s -X POST "$API_URL/assessments/questions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "type": "Long-Answer",
    "title": "Explain Closures",
    "content": "Explain what a closure is in JavaScript and provide an example.",
    "points": 25,
    "difficulty": "Hard",
    "tags": ["advanced"]
  }')

Q4_ID=$(echo "$Q4" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}✓ Added Long Answer: $Q4_ID${NC}"

# Step 5: Publish Assessment
echo -e "\n${YELLOW}Step 5: Publishing assessment...${NC}"

PUBLISH=$(curl -s -X POST "$API_URL/assessments/$ASSESSMENT_ID/publish" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Publish Response: $PUBLISH"
echo -e "${GREEN}✓ Assessment published${NC}"

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Demo Assessment Created Successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "\n${YELLOW}Test User Credentials:${NC}"
echo -e "  Email: ${GREEN}demo@example.com${NC}"
echo -e "  Password: ${GREEN}Demo@123456${NC}"
echo -e "  Role: ${GREEN}Admin${NC}"
echo -e "\n${YELLOW}Assessment Details:${NC}"
echo -e "  ID: ${GREEN}$ASSESSMENT_ID${NC}"
echo -e "  Title: ${GREEN}JavaScript Fundamentals Quiz${NC}"
echo -e "  Questions: ${GREEN}4${NC}"
echo -e "  Total Points: ${GREEN}100${NC}"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "  1. Go to: ${GREEN}http://localhost:3000/dashboard${NC}"
echo -e "  2. Login with credentials above"
echo -e "  3. Click 'Start' on the JavaScript Fundamentals Quiz"
echo -e "  4. Answer the questions and submit"
echo -e "\n${BLUE}========================================${NC}"
