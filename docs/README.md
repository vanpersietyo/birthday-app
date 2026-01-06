# API Documentation

Welcome to the Birthday Messaging System API documentation!

## Quick Links

📘 **[API Documentation Guide](API_DOCUMENTATION.md)** - Complete API reference with examples
📗 **[OpenAPI Specification](openapi.yaml)** - Machine-readable API definition
📙 **[Postman Collection](postman-collection.json)** - Ready-to-use API collection
📕 **[Email Service Docs](EMAIL_SERVICE.md)** - Email integration details

---

## Getting Started

### 1. View API Documentation

Choose your preferred method:

#### Option A: Swagger UI (Recommended)

View interactive API documentation:

```bash
# Install globally
npm install -g @redocly/cli

# Preview the docs
redocly preview-docs docs/openapi.yaml

# Open: http://localhost:8080
```

Or use Docker:

```bash
docker run -p 8080:8080 -e SWAGGER_JSON=/docs/openapi.yaml \
  -v $(pwd)/docs:/docs swaggerapi/swagger-ui

# Open: http://localhost:8080
```

#### Option B: Online Swagger Editor

1. Go to [editor.swagger.io](https://editor.swagger.io/)
2. File → Import file → Select `openapi.yaml`
3. Browse the interactive documentation

#### Option C: VS Code

1. Install extension: "OpenAPI (Swagger) Editor"
2. Open `openapi.yaml`
3. Press `Shift+Alt+P` to preview

---

### 2. Import Postman Collection

#### Method 1: Import File

1. Open Postman
2. Click "Import" (top left)
3. Select `postman-collection.json`
4. Click "Import"

#### Method 2: Quick Start

The collection includes:
- ✅ All 6 API endpoints
- ✅ Multiple example requests
- ✅ Automated tests for each endpoint
- ✅ Environment variables
- ✅ Complete user lifecycle workflow

**After importing:**
1. Set `baseUrl` variable to your server (default: `http://localhost:3000`)
2. Run "Create User" to auto-save the `userId`
3. Other requests will use the saved `userId` automatically

---

## API Overview

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| POST | `/api/user` | Create new user |
| GET | `/api/user/:id` | Get user by ID |
| GET | `/api/users` | Get all users |
| PUT | `/api/user/:id` | Update user |
| DELETE | `/api/user/:id` | Delete user |

### Quick Test

```bash
# 1. Check server is running
curl http://localhost:3000/health

# 2. Create a user
curl -X POST http://localhost:3000/api/user \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "birthday": "1990-05-15",
    "timezone": "America/New_York"
  }'

# 3. Get all users
curl http://localhost:3000/api/users
```

---

## Documentation Files

### Core Documentation

| File | Format | Use Case |
|------|--------|----------|
| `openapi.yaml` | YAML | API specification for tools (Swagger UI, code generators) |
| `postman-collection.json` | JSON | Import into Postman for API testing |
| `API_DOCUMENTATION.md` | Markdown | Human-readable API guide |

### Additional Docs

| File | Description |
|------|-------------|
| `README.md` | This file - documentation index |
| `EMAIL_SERVICE.md` | Email service integration guide |

---

## Features

### OpenAPI Specification

- ✅ OpenAPI 3.0.3 compliant
- ✅ Complete endpoint documentation
- ✅ Request/response schemas
- ✅ Validation rules
- ✅ Error response examples
- ✅ Multiple request examples per endpoint
- ✅ Tagged and organized

**Compatible with:**
- Swagger UI
- Swagger Editor
- Redoc
- Postman (can import OpenAPI)
- Code generators (swagger-codegen, openapi-generator)
- API documentation tools

### Postman Collection

- ✅ Postman Collection v2.1 format
- ✅ Environment variables (`baseUrl`, `userId`)
- ✅ Pre-request scripts
- ✅ Automated test scripts
- ✅ Multiple example responses
- ✅ Organized folders
- ✅ Complete workflow examples

**Includes:**
- Health check endpoint
- All CRUD operations
- Error scenarios
- User lifecycle workflow
- Test assertions

---

## Usage Examples

### Create User (Multiple Timezones)

**User in New York:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "birthday": "1990-05-15",
  "timezone": "America/New_York"
}
```

**User in Melbourne:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "birthday": "1985-12-20",
  "timezone": "Australia/Melbourne"
}
```

**User in London:**
```json
{
  "firstName": "James",
  "lastName": "Wilson",
  "email": "james.wilson@example.com",
  "birthday": "1992-03-10",
  "timezone": "Europe/London"
}
```

### Update User

**Change timezone (user moved):**
```json
{
  "timezone": "Europe/Paris"
}
```

**Update name:**
```json
{
  "firstName": "Jonathan",
  "lastName": "Doe"
}
```

**Deactivate user:**
```json
{
  "isActive": false
}
```

---

## Validation Rules

### Required Fields (Create User)

- `firstName`: 1-100 characters
- `lastName`: 1-100 characters
- `email`: Valid email format, must be unique
- `birthday`: YYYY-MM-DD format, cannot be in future
- `timezone`: Valid IANA timezone identifier

### Optional Fields (Update User)

All fields are optional, but at least one must be provided:
- `firstName`
- `lastName`
- `email` (must be unique if changed)
- `birthday`
- `timezone`
- `isActive`

### Common Validation Errors

```json
// Invalid email
{
  "success": false,
  "error": "\"email\" must be a valid email"
}

// Invalid birthday format
{
  "success": false,
  "error": "Birthday must be in YYYY-MM-DD format"
}

// Invalid timezone
{
  "success": false,
  "error": "Invalid timezone. Use IANA timezone format (e.g., America/New_York)"
}

// Birthday in future
{
  "success": false,
  "error": "Birthday cannot be in the future"
}

// Duplicate email
{
  "success": false,
  "error": "User with email john.doe@example.com already exists"
}
```

---

## Response Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 201 | Created | User created successfully |
| 400 | Bad Request | Validation error |
| 404 | Not Found | User not found |
| 409 | Conflict | Email already exists |
| 500 | Internal Server Error | Server error |

---

## Tools & Integrations

### Code Generation

Generate client SDKs from OpenAPI spec:

```bash
# JavaScript/TypeScript client
npx @openapitools/openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g typescript-axios \
  -o generated/typescript-client

# Python client
npx @openapitools/openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g python \
  -o generated/python-client

# Java client
npx @openapitools/openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g java \
  -o generated/java-client
```

### API Testing Tools

**Use OpenAPI spec with:**
- Postman (import OpenAPI)
- Insomnia (import OpenAPI)
- REST Client (VS Code extension)
- Bruno
- Hoppscotch

**Use Postman collection with:**
- Postman Desktop
- Newman (CLI runner)
- Postman API Monitoring

### Documentation Tools

**Generate documentation:**
- Swagger UI
- Redoc
- RapiDoc
- Stoplight
- ReadMe.io

---

## Testing

### Manual Testing with Postman

1. Import collection
2. Set `baseUrl` variable
3. Run requests individually or as a collection
4. View test results

### Automated Testing with Newman

```bash
# Install Newman
npm install -g newman

# Run collection
newman run docs/postman-collection.json \
  --environment your-environment.json

# Generate HTML report
newman run docs/postman-collection.json \
  --reporters cli,html \
  --reporter-html-export report.html
```

### Integration Testing

```bash
# Test the actual API
npm run test:email-api
```

---

## Best Practices

### When Creating Users

1. **Use valid IANA timezones**
   - ✅ `America/New_York`
   - ❌ `EST` or `EDT`

2. **Use ISO date format for birthdays**
   - ✅ `1990-05-15`
   - ❌ `05/15/1990` or `15-05-1990`

3. **Ensure unique emails**
   - Check if email exists before creating
   - Handle 409 Conflict responses

### When Updating Users

1. **Only send fields you want to update**
   ```json
   // Good - update only timezone
   { "timezone": "Europe/London" }

   // Unnecessary - sending unchanged fields
   {
     "firstName": "John",
     "lastName": "Doe",
     "timezone": "Europe/London"
   }
   ```

2. **Consider the impact of changes**
   - Changing birthday → Messages rescheduled
   - Changing timezone → Message time changes
   - Setting `isActive: false` → Messages paused

---

## Troubleshooting

### Common Issues

**Server not responding:**
```bash
# Check if server is running
curl http://localhost:3000/health

# Start the server
npm run dev
```

**Validation errors:**
- Check request payload matches schema in OpenAPI spec
- Verify all required fields are present
- Check data types and formats

**404 Not Found:**
- Verify the endpoint URL (check `/api` prefix)
- Ensure user ID is correct (copy from creation response)

**409 Conflict:**
- Email already exists
- Try a different email address

---

## Support

### Resources

- 📘 [API Documentation](API_DOCUMENTATION.md) - Full API reference
- 📗 [OpenAPI Spec](openapi.yaml) - Technical specification
- 📙 [Postman Collection](postman-collection.json) - Test collection
- 📕 [Email Service](EMAIL_SERVICE.md) - Email integration

### Getting Help

1. Check the documentation above
2. Review example requests in Postman
3. Check server logs for errors
4. Refer to main README.md

---

## Contributing

When updating the API:

1. **Update OpenAPI spec** (`openapi.yaml`)
2. **Update Postman collection** (`postman-collection.json`)
3. **Update documentation** (`API_DOCUMENTATION.md`)
4. **Add examples** for new endpoints
5. **Test thoroughly** with Postman

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-06 | Initial API documentation with OpenAPI & Postman |

---

**Generated:** 2026-01-06
**API Version:** 1.0.0
**OpenAPI Version:** 3.0.3
**Postman Collection Version:** 2.1.0
