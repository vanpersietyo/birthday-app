import request from 'supertest';
import app from '../../app';
import { prisma } from '../../config/database';

jest.setTimeout(10000);

describe('User API Integration Tests', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.messageLog.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/user', () => {
    it('should create a new user', async () => {
      const userData = {
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        birthday: '1995-06-20',
        timezone: 'Europe/London',
      };

      const response = await request(app)
        .post('/api/user')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
      });
    });

    it('should reject invalid timezone', async () => {
      const userData = {
        firstName: 'Bob',
        lastName: 'Jones',
        email: 'bob@example.com',
        birthday: '1990-03-15',
        timezone: 'Invalid/Timezone',
      };

      const response = await request(app)
        .post('/api/user')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('timezone');
    });

    it('should reject duplicate email', async () => {
      const userData = {
        firstName: 'Charlie',
        lastName: 'Brown',
        email: 'charlie@example.com',
        birthday: '1988-12-01',
        timezone: 'America/Los_Angeles',
      };

      await request(app).post('/api/user').send(userData).expect(201);

      const response = await request(app)
        .post('/api/user')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('PUT /api/user/:id', () => {
    it('should update user successfully', async () => {
      const userData = {
        firstName: 'David',
        lastName: 'Wilson',
        email: 'david@example.com',
        birthday: '1992-08-10',
        timezone: 'Australia/Sydney',
      };

      const createResponse = await request(app)
        .post('/api/user')
        .send(userData)
        .expect(201);

      const userId = createResponse.body.data.id;

      const updateResponse = await request(app)
        .put(`/api/user/${userId}`)
        .send({ firstName: 'Dave', timezone: 'Australia/Melbourne' })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.firstName).toBe('Dave');
      expect(updateResponse.body.data.timezone).toBe('Australia/Melbourne');
    });
  });

  describe('DELETE /api/user/:id', () => {
    it('should delete user successfully', async () => {
      const userData = {
        firstName: 'Eve',
        lastName: 'Davis',
        email: 'eve@example.com',
        birthday: '1993-04-25',
        timezone: 'America/Chicago',
      };

      const createResponse = await request(app)
        .post('/api/user')
        .send(userData)
        .expect(201);

      const userId = createResponse.body.data.id;

      await request(app).delete(`/api/user/${userId}`).expect(200);

      await request(app).get(`/api/user/${userId}`).expect(404);
    });
  });

  describe('GET /api/users', () => {
    it('should return all users', async () => {
      await prisma.user.deleteMany();

      const users = [
        {
          firstName: 'User1',
          lastName: 'Test',
          email: 'user1@example.com',
          birthday: '1990-01-01',
          timezone: 'UTC',
        },
        {
          firstName: 'User2',
          lastName: 'Test',
          email: 'user2@example.com',
          birthday: '1991-02-02',
          timezone: 'UTC',
        },
      ];

      for (const user of users) {
        await request(app).post('/api/user').send(user);
      }

      const response = await request(app).get('/api/users').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
    });
  });
});
