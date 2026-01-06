# Birthday Messaging System

A scalable TypeScript application that sends personalized birthday messages to users at 9 AM in their local timezone. Built with Express.js, Prisma, and PostgreSQL.

## Features

- **Timezone-aware scheduling**: Messages are sent at 9 AM in each user's local timezone
- **Reliable delivery**: Automatic retries with exponential backoff for failed messages
- **Recovery mechanism**: Automatically sends unsent messages after system downtime
- **Race condition prevention**: Distributed locking prevents duplicate messages
- **Scalable architecture**: Job-based processing handles thousands of birthdays daily
- **RESTful API**: Full CRUD operations for user management
- **Comprehensive testing**: Unit tests for services and controllers
- **Extensible design**: Easy to add new message types (anniversaries, etc.)

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 13+ (or SQLite for development)
- Redis 6+ (optional, for Bull queue)

## Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up your environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/birthday_app?schema=public"
EMAIL_SERVICE_URL=https://email-service.digitalenvision.com.au
```

3. Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Start the development server:

```bash
npm run dev
```

## Database Setup

### PostgreSQL (Production)

```bash
# Create database
createdb birthday_app

# Run migrations
npm run prisma:migrate
```

### SQLite (Development)

Update `.env`:

```env
DATABASE_URL="file:./dev.db"
```

Then run migrations:

```bash
npm run prisma:migrate
```

## API Documentation

### Base URL

```
http://localhost:3000/api
```

### Endpoints

#### Create User

```http
POST /api/user
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "birthday": "1990-01-15",
  "timezone": "America/New_York"
}
```

**Response (201)**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "birthday": "1990-01-15",
    "timezone": "America/New_York",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Update User

```http
PUT /api/user/:id
Content-Type: application/json

{
  "firstName": "Jane",
  "timezone": "Australia/Melbourne"
}
```

**Response (200)**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "john@example.com",
    "birthday": "1990-01-15",
    "timezone": "Australia/Melbourne",
    "isActive": true,
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

#### Delete User

```http
DELETE /api/user/:id
```

**Response (200)**:

```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

#### Get User

```http
GET /api/user/:id
```

**Response (200)**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "birthday": "1990-01-15",
    "timezone": "America/New_York",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Get All Users

```http
GET /api/users
```

**Response (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "birthday": "1990-01-15",
      "timezone": "America/New_York",
      "isActive": true
    }
  ]
}
```

### Timezone Format

Use IANA timezone identifiers (e.g., `America/New_York`, `Australia/Melbourne`, `Europe/London`). See the [full list](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).

### Birthday Format

Use `YYYY-MM-DD` format (e.g., `1990-01-15`).

## Architecture

### System Components

1. **Express API**: RESTful endpoints for user management
2. **Prisma ORM**: Type-safe database access with PostgreSQL
3. **Scheduler**: node-cron jobs for periodic tasks
4. **Email Service**: Retry logic with exponential backoff
5. **Birthday Service**: Timezone-aware message scheduling

### How It Works

#### 1. Birthday Message Creation

Every 5 minutes (configurable), the system:

- Fetches all active users
- Checks if today is their birthday in their local timezone
- Creates a message log entry with status `PENDING`
- Schedules delivery for 9 AM in their timezone

#### 2. Message Processing

Every minute, the system:

- Fetches pending messages where `scheduledAt <= now()`
- Acquires distributed lock to prevent duplicates
- Sends message via external API
- Updates status: `SENT`, `FAILED`, or `RETRY`

#### 3. Recovery Mechanism

On startup, the system:

- Finds all unsent messages from past dates
- Attempts to deliver them immediately
- Ensures no birthday message is missed

#### 4. Race Condition Prevention

The `MessageLog` table uses:

- **Unique constraint**: `(userId, messageType, scheduledDate)` prevents duplicate creation
- **Distributed lock**: `lockId` and `lockedUntil` prevent concurrent processing
- **Optimistic updates**: Only unlocked messages can be processed

### Database Schema

#### Users Table

| Column     | Type      | Description                    |
| ---------- | --------- | ------------------------------ |
| id         | UUID      | Primary key                    |
| firstName  | String    | User's first name              |
| lastName   | String    | User's last name               |
| email      | String    | Unique email address           |
| birthday   | String    | Birthday in YYYY-MM-DD format  |
| timezone   | String    | IANA timezone identifier       |
| isActive   | Boolean   | Whether user should get messages |
| createdAt  | Timestamp | Creation time                  |
| updatedAt  | Timestamp | Last update time               |

#### MessageLogs Table

| Column        | Type      | Description                        |
| ------------- | --------- | ---------------------------------- |
| id            | UUID      | Primary key                        |
| userId        | UUID      | Foreign key to users               |
| messageType   | Enum      | BIRTHDAY or ANNIVERSARY            |
| message       | Text      | Message content                    |
| status        | Enum      | PENDING, SENT, FAILED, RETRY       |
| scheduledDate | String    | Date in YYYY-MM-DD format          |
| scheduledAt   | Timestamp | Exact time to send (9 AM local)    |
| sentAt        | Timestamp | When message was sent              |
| retryCount    | Integer   | Number of retry attempts           |
| errorMessage  | Text      | Last error message                 |
| lockId        | String    | Distributed lock identifier        |
| lockedUntil   | Timestamp | Lock expiration time               |
| createdAt     | Timestamp | Creation time                      |

**Unique constraint**: `(userId, messageType, scheduledDate)` ensures one message per user per day.

## Scalability Considerations

### Current Design

- **Horizontal scaling**: Distributed locking allows multiple instances
- **Batch processing**: Processes messages in batches
- **Efficient queries**: Indexed on `status`, `scheduledDate`, `userId`
- **Lock expiration**: Prevents stuck messages (5-minute timeout)

### Handling Thousands of Birthdays

1. **Database indexing**: Fast queries with composite indexes
2. **Batch processing**: Processes messages in configurable batches
3. **Lock-based concurrency**: Multiple workers can run safely
4. **Cron optimization**: Adjustable check intervals
5. **Connection pooling**: Prisma handles connection management

### Future Enhancements

For even larger scale:

- **Message queue**: Use Bull/BullMQ with Redis for job distribution
- **Worker processes**: Separate API and worker servers
- **Database sharding**: Partition users by timezone or ID range
- **Caching**: Redis cache for frequently accessed data
- **Rate limiting**: Throttle external API calls

## Testing

Run tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

View coverage:

```bash
npm test -- --coverage
```

### Test Coverage

- **UserService**: CRUD operations, validation, error handling
- **EmailService**: Success, retries, error scenarios
- **UserController**: Request validation, response formatting
- **BirthdayService**: Timezone handling, message scheduling (add tests as needed)

## Configuration

### Environment Variables

| Variable                      | Default                      | Description                         |
| ----------------------------- | ---------------------------- | ----------------------------------- |
| `NODE_ENV`                    | `development`                | Environment (development/production)|
| `PORT`                        | `3000`                       | Server port                         |
| `DATABASE_URL`                | Required                     | PostgreSQL connection string        |
| `EMAIL_SERVICE_URL`           | Required                     | External email service URL          |
| `EMAIL_SERVICE_TIMEOUT`       | `5000`                       | API timeout (ms)                    |
| `EMAIL_SERVICE_MAX_RETRIES`   | `3`                          | Max retry attempts                  |
| `EMAIL_SERVICE_RETRY_DELAY`   | `2000`                       | Initial retry delay (ms)            |
| `BIRTHDAY_CHECK_CRON`         | `*/5 * * * *`                | Message creation schedule           |
| `BIRTHDAY_MESSAGE_HOUR`       | `9`                          | Hour to send messages (0-23)        |
| `BIRTHDAY_MESSAGE_MINUTE`     | `0`                          | Minute to send messages (0-59)      |

### Cron Expression

The `BIRTHDAY_CHECK_CRON` uses standard cron syntax:

```
*    *    *    *    *
┬    ┬    ┬    ┬    ┬
│    │    │    │    └─── Day of week (0-7)
│    │    │    └──────── Month (1-12)
│    │    └───────────── Day of month (1-31)
│    └────────────────── Hour (0-23)
└─────────────────────── Minute (0-59)
```

Examples:

- `*/5 * * * *` - Every 5 minutes
- `0 * * * *` - Every hour
- `0 0 * * *` - Every day at midnight

## Error Handling

### Email Service Errors

The system handles:

- **Timeouts**: Retry with exponential backoff
- **5xx errors**: Retry up to max retries
- **4xx errors**: Mark as failed (no retry)
- **Network errors**: Retry with backoff

### Recovery Strategy

1. **Automatic retry**: Failed messages retry up to 3 times
2. **Exponential backoff**: Delays increase: 2s, 4s, 8s
3. **Status tracking**: Messages marked as `RETRY` or `FAILED`
4. **Manual recovery**: Failed messages can be manually retried

## Logging

Logs are written to:

- **Console**: Development mode (colorized)
- **combined.log**: All logs
- **error.log**: Error logs only

Log format: JSON with timestamps
