#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3001/api"
TEST_EMAIL="testuser@example.com"
TEST_PASSWORD="Test@123456"
TEST_FIRST_NAME="Test"
TEST_LAST_NAME="User"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Creating Test Assessment${NC}"
echo -e "${BLUE}========================================${NC}"

# Step 1: Register user (try login first, if fails register new user)
echo -e "\n${YELLOW}Step 1: Authenticating user...${NC}"

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# If login failed, register
if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${YELLOW}Registering new user...${NC}"
  REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$TEST_EMAIL\",
      \"firstName\": \"$TEST_FIRST_NAME\",
      \"lastName\": \"$TEST_LAST_NAME\",
      \"password\": \"$TEST_PASSWORD\"
    }")

  echo "Register Response: $REGISTER_RESPONSE"
  ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
else
  echo "Login successful"
fi

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${YELLOW}Failed to get access token${NC}"
  echo "Login Response: $LOGIN_RESPONSE"
  echo "Register Response: $REGISTER_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Got access token: ${ACCESS_TOKEN:0:20}...${NC}"

# Step 2: Create Assessment
echo -e "\n${YELLOW}Step 2: Creating assessment...${NC}"

ASSESSMENT_RESPONSE=$(curl -s -X POST "$API_URL/assessments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "title": "JavaScript Fundamentals Quiz",
    "description": "Test your knowledge of JavaScript basics",
    "sections": [
      {
        "title": "Basics",
        "description": "JavaScript fundamentals",
        "instructions": "Answer the following questions",
        "questions": []
      }
    ],
    "settings": {
      "passingScore": 70,
      "allowMultipleAttempts": true,
      "maxAttempts": 3,
      "showCorrectAnswers": true,
      "shuffleQuestions": false,
      "proctoring": {
        "enabled": false
      },
      "accessibility": {
        "extendedTime": false,
        "timeMultiplier": 1
      },
      "latePolicy": {
        "allowLateSubmission": true,
        "gracePeriodMinutes": 5,
        "penaltyPercent": 10
      }
    },
    "totalPoints": 100
  }')

echo "Assessment Response: $ASSESSMENT_RESPONSE"

ASSESSMENT_ID=$(echo "$ASSESSMENT_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$ASSESSMENT_ID" ]; then
  echo -e "${YELLOW}Failed to create assessment${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Created assessment: $ASSESSMENT_ID${NC}"

# Step 3: Create Questions
echo -e "\n${YELLOW}Step 3: Adding questions to assessment...${NC}"

# Question 1: Multiple Choice
Q1_RESPONSE=$(curl -s -X POST "$API_URL/assessments/questions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "type": "MCQ",
    "title": "What is JavaScript?",
    "content": "JavaScript is a programming language primarily used for:",
    "options": [
      "Server-side applications",
      "Client-side web development",
      "Mobile app development",
      "Desktop applications"
    ],
    "correctAnswer": 1,
    "points": 25,
    "difficulty": "Easy",
    "tags": ["basics"]
  }')

Q1_ID=$(echo "$Q1_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}✓ Created MCQ question: $Q1_ID${NC}"

# Question 2: Short Answer
Q2_RESPONSE=$(curl -s -X POST "$API_URL/assessments/questions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "type": "Short-Answer",
    "title": "Variable Declaration",
    "content": "Name one way to declare a variable in JavaScript.",
    "correctAnswer": "var",
    "points": 25,
    "difficulty": "Easy",
    "tags": ["basics"]
  }')

Q2_ID=$(echo "$Q2_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}✓ Created Short Answer question: $Q2_ID${NC}"

# Question 3: Multiple Select
Q3_RESPONSE=$(curl -s -X POST "$API_URL/assessments/questions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "type": "Multi-Select",
    "title": "Data Types",
    "content": "Which of the following are JavaScript data types?",
    "options": [
      "String",
      "Number",
      "Boolean",
      "Color",
      "Array"
    ],
    "correctAnswer": [0, 1, 2, 4],
    "points": 25,
    "difficulty": "Medium",
    "tags": ["basics"]
  }')

Q3_ID=$(echo "$Q3_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}✓ Created Multi-Select question: $Q3_ID${NC}"

# Question 4: Long Answer
Q4_RESPONSE=$(curl -s -X POST "$API_URL/assessments/questions" \
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

Q4_ID=$(echo "$Q4_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}✓ Created Long Answer question: $Q4_ID${NC}"

# Step 4: Publish Assessment
echo -e "\n${YELLOW}Step 4: Publishing assessment...${NC}"

PUBLISH_RESPONSE=$(curl -s -X POST "$API_URL/assessments/$ASSESSMENT_ID/publish" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Publish Response: $PUBLISH_RESPONSE"

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Assessment Created Successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "\nTest User Credentials:"
echo -e "  Email: ${YELLOW}$TEST_EMAIL${NC}"
echo -e "  Password: ${YELLOW}$TEST_PASSWORD${NC}"
echo -e "\nAssessment Details:"
echo -e "  ID: ${YELLOW}$ASSESSMENT_ID${NC}"
echo -e "  Title: ${YELLOW}JavaScript Fundamentals Quiz${NC}"
echo -e "  Questions: ${YELLOW}4${NC}"
echo -e "  Total Points: ${YELLOW}100${NC}"
echo -e "\nAccess Token: ${YELLOW}${ACCESS_TOKEN:0:20}...${NC}"
echo -e "\nNext Steps:"
echo -e "  1. Go to http://localhost:3000/dashboard"
echo -e "  2. Login with the credentials above"
echo -e "  3. Click 'Start' on the JavaScript Fundamentals Quiz"
echo -e "  4. Answer the questions and submit"
echo -e "\n${BLUE}========================================${NC}"
