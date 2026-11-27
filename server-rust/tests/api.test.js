const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001/api';

const MASTER_TOKEN = process.env.USERS_MASTER_TOKEN || 'users-master';
const CLEAR_TOKEN = process.env.CLEAR_DATABASE_MASTER_TOKEN || 'fatman';

function authenticated(token) {
  return { Authorization: `Bearer ${token}` };
}

async function request(method, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { ...options.headers };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return { status: response.status, body };
}

describe('Mama Calendar API', () => {
  let authToken;
  let userId;
  let eventId;
  let testUserId;
  let authTokenId;

  describe('Clear Database', () => {
    it('should clear all data at test start', async () => {
      const result = await request('DELETE', '/clear-database', {
        headers: authenticated(CLEAR_TOKEN),
      });
      assert.strictEqual(result.status, 200);
      assert.ok(result.body.deleted);
    });

    it('should reject without master token', async () => {
      const result = await request('DELETE', '/clear-database');
      assert.strictEqual(result.status, 401);
      assert.strictEqual(result.body.error, 'Unauthorized');
    });

    it('should reject with wrong token', async () => {
      const result = await request('DELETE', '/clear-database', {
        headers: authenticated('invalid-token'),
      });
      assert.strictEqual(result.status, 401);
      assert.strictEqual(result.body.error, 'Unauthorized');
    });
  });

  describe('Health Check', () => {
    it('should return ok status', async () => {
      const result = await request('GET', '/health');
      assert.strictEqual(result.status, 200);
      assert.deepStrictEqual(result.body, { status: 'ok' });
    });
  });

  describe('Registration', () => {
    const testUsername = 'testuser';
    const testPassword = 'securePassword123';

    it('should register a new user', async () => {
      const result = await request('POST', '/auth/register', {
        body: { username: testUsername, password: testPassword },
      });
      assert.strictEqual(result.status, 201);
      assert.ok(result.body.id);
      assert.strictEqual(result.body.username, testUsername);
      assert.ok(!result.body.password);
      userId = result.body.id;
    });

    it('should reject registration without password', async () => {
      const result = await request('POST', '/auth/register', {
        body: { username: testUsername },
      });
      assert.strictEqual(result.status, 400);
      assert.ok(result.body.error);
    });

    it('should reject registration without username', async () => {
      const result = await request('POST', '/auth/register', {
        body: { password: testPassword },
      });
      assert.strictEqual(result.status, 400);
      assert.ok(result.body.error);
    });

    it('should reject empty registration body', async () => {
      const result = await request('POST', '/auth/register', {
        body: {},
      });
      assert.strictEqual(result.status, 400);
      assert.ok(result.body.error);
    });
  });

  describe('Authorization', () => {
    it('should authorize with valid credentials', async () => {
      const result = await request('POST', '/auth/authorize', {
        body: { username: 'testuser', password: 'securePassword123' },
      });
      assert.strictEqual(result.status, 200);
      assert.ok(result.body.token);
      assert.strictEqual(typeof result.body.token, 'string');
      assert.ok(result.body.token.length > 0);
      authToken = result.body.token;
    });

    it('should reject with wrong password', async () => {
      const result = await request('POST', '/auth/authorize', {
        body: { username: 'testuser', password: 'wrongPassword' },
      });
      assert.strictEqual(result.status, 401);
      assert.strictEqual(result.body.error, 'Invalid username or password');
    });

    it('should reject with nonexistent user', async () => {
      const result = await request('POST', '/auth/authorize', {
        body: { username: 'unknownUser', password: 'somePassword' },
      });
      assert.strictEqual(result.status, 401);
      assert.strictEqual(result.body.error, 'Invalid username or password');
    });

    it('should reject without password', async () => {
      const result = await request('POST', '/auth/authorize', {
        body: { username: 'testuser' },
      });
      assert.strictEqual(result.status, 400);
      assert.ok(result.body.error);
    });

    it('should reject without username', async () => {
      const result = await request('POST', '/auth/authorize', {
        body: { password: 'securePassword123' },
      });
      assert.strictEqual(result.status, 400);
      assert.ok(result.body.error);
    });

    it('should reject empty body', async () => {
      const result = await request('POST', '/auth/authorize', {
        body: {},
      });
      assert.strictEqual(result.status, 400);
      assert.ok(result.body.error);
    });
  });

  describe('Events', () => {
    const testDescription = 'Doctor appointment';
    const testDate = 20240715;
    const testEmoji = '🩺';
    const updatedDescription = 'Dentist appointment';

    it('should reject listing events without auth token', async () => {
      const result = await request('GET', '/events');
      assert.strictEqual(result.status, 401);
      assert.strictEqual(result.body.error, 'Unauthorized');
    });

    it('should list empty events for authorized user', async () => {
      const result = await request('GET', '/events', {
        headers: authenticated(authToken),
      });
      assert.strictEqual(result.status, 200);
      assert.deepStrictEqual(result.body, []);
    });

    it('should create an event', async () => {
      const result = await request('POST', '/events', {
        headers: authenticated(authToken),
        body: {
          description: testDescription,
          date: testDate,
          emoji: testEmoji,
        },
      });
      assert.strictEqual(result.status, 201);
      assert.ok(result.body.id);
      assert.strictEqual(result.body.description, testDescription);
      assert.strictEqual(result.body.date, testDate);
      assert.strictEqual(result.body.emoji, testEmoji);
      assert.strictEqual(result.body.userId, userId);
      assert.ok(result.body.createdAt);
      eventId = result.body.id;
    });

    it('should create event without emoji', async () => {
      const result = await request('POST', '/events', {
        headers: authenticated(authToken),
        body: { description: 'Grocery shopping', date: 20240716 },
      });
      assert.strictEqual(result.status, 201);
      assert.ok(result.body.id);
      assert.strictEqual(result.body.description, 'Grocery shopping');
      assert.strictEqual(result.body.date, 20240716);
      assert.strictEqual(result.body.emoji, undefined);
    });

    it('should reject event without description', async () => {
      const result = await request('POST', '/events', {
        headers: authenticated(authToken),
        body: { date: testDate },
      });
      assert.strictEqual(result.status, 400);
      assert.ok(result.body.error);
    });

    it('should reject event with null date', async () => {
      const result = await request('POST', '/events', {
        headers: authenticated(authToken),
        body: { description: 'Test', date: null },
      });
      assert.strictEqual(result.status, 400);
      assert.ok(result.body.error);
    });

    it('should list all events for authorized user', async () => {
      const result = await request('GET', '/events', {
        headers: authenticated(authToken),
      });
      assert.strictEqual(result.status, 200);
      assert.ok(Array.isArray(result.body));
      assert.strictEqual(result.body.length, 2);
    });

    it('should get single event by identifier', async () => {
      const result = await request('GET', `/events/${eventId}`, {
        headers: authenticated(authToken),
      });
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.body.id, eventId);
      assert.strictEqual(result.body.description, testDescription);
      assert.strictEqual(result.body.date, testDate);
      assert.strictEqual(result.body.emoji, testEmoji);
    });

    it('should return 404 for nonexistent event', async () => {
      const result = await request('GET', '/events/000000000000000000000000', {
        headers: authenticated(authToken),
      });
      assert.strictEqual(result.status, 404);
      assert.strictEqual(result.body.error, 'Event not found');
    });

    it('should update event description', async () => {
      const result = await request('PUT', `/events/${eventId}`, {
        headers: authenticated(authToken),
        body: { description: updatedDescription },
      });
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.body.id, eventId);
      assert.strictEqual(result.body.description, updatedDescription);
      assert.strictEqual(result.body.date, testDate);
    });

    it('should update event date and emoji', async () => {
      const newDate = 20240720;
      const newEmoji = '🦷';
      const result = await request('PUT', `/events/${eventId}`, {
        headers: authenticated(authToken),
        body: { date: newDate, emoji: newEmoji },
      });
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.body.id, eventId);
      assert.strictEqual(result.body.description, updatedDescription);
      assert.strictEqual(result.body.date, newDate);
      assert.strictEqual(result.body.emoji, newEmoji);
    });

    it('should reject update without fields', async () => {
      const result = await request('PUT', `/events/${eventId}`, {
        headers: authenticated(authToken),
        body: {},
      });
      assert.strictEqual(result.status, 400);
      assert.ok(result.body.error);
    });

    it('should reject update for nonexistent event', async () => {
      const result = await request('PUT', '/events/000000000000000000000000', {
        headers: authenticated(authToken),
        body: { description: 'Updated' },
      });
      assert.strictEqual(result.status, 404);
      assert.strictEqual(result.body.error, 'Event not found');
    });

    it('should delete event', async () => {
      const result = await request('DELETE', `/events/${eventId}`, {
        headers: authenticated(authToken),
      });
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.body.id, eventId);
    });

    it('should return 404 for deleted event', async () => {
      const result = await request('GET', `/events/${eventId}`, {
        headers: authenticated(authToken),
      });
      assert.strictEqual(result.status, 404);
    });

    it('should reject delete for nonexistent event', async () => {
      const result = await request('DELETE', '/events/000000000000000000000000', {
        headers: authenticated(authToken),
      });
      assert.strictEqual(result.status, 404);
      assert.strictEqual(result.body.error, 'Event not found');
    });

    it('should reject event creation without auth token', async () => {
      const result = await request('POST', '/events', {
        body: { description: 'Test', date: 20240101 },
      });
      assert.strictEqual(result.status, 401);
    });
  });

  describe('Users Management', () => {
    const testUsername = 'managementUser';
    const testPassword = 'hashedSecret456';

    it('should reject without master token', async () => {
      const result = await request('GET', '/users');
      assert.strictEqual(result.status, 401);
      assert.strictEqual(result.body.error, 'Unauthorized');
    });

    it('should reject with wrong master token', async () => {
      const result = await request('GET', '/users', {
        headers: authenticated('wrong-token'),
      });
      assert.strictEqual(result.status, 401);
      assert.strictEqual(result.body.error, 'Unauthorized');
    });

    it('should list users', async () => {
      const result = await request('GET', '/users', {
        headers: authenticated(MASTER_TOKEN),
      });
      assert.strictEqual(result.status, 200);
      assert.ok(Array.isArray(result.body));
    });

    it('should create a user', async () => {
      const result = await request('POST', '/users', {
        headers: authenticated(MASTER_TOKEN),
        body: { username: testUsername, password: testPassword },
      });
      assert.strictEqual(result.status, 201);
      assert.ok(result.body.id);
      assert.strictEqual(result.body.username, testUsername);
      testUserId = result.body.id;
    });

    it('should reject user without username', async () => {
      const result = await request('POST', '/users', {
        headers: authenticated(MASTER_TOKEN),
        body: { password: testPassword },
      });
      assert.strictEqual(result.status, 400);
      assert.ok(result.body.error);
    });

    it('should reject user without password', async () => {
      const result = await request('POST', '/users', {
        headers: authenticated(MASTER_TOKEN),
        body: { username: testUsername },
      });
      assert.strictEqual(result.status, 400);
      assert.ok(result.body.error);
    });

    it('should reject empty user body', async () => {
      const result = await request('POST', '/users', {
        headers: authenticated(MASTER_TOKEN),
        body: {},
      });
      assert.strictEqual(result.status, 400);
      assert.ok(result.body.error);
    });

    it('should get user by identifier', async () => {
      const result = await request('GET', `/users/${testUserId}`, {
        headers: authenticated(MASTER_TOKEN),
      });
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.body.id, testUserId);
      assert.strictEqual(result.body.username, testUsername);
    });

    it('should return 404 for nonexistent user', async () => {
      const result = await request('GET', '/users/000000000000000000000000', {
        headers: authenticated(MASTER_TOKEN),
      });
      assert.strictEqual(result.status, 404);
      assert.strictEqual(result.body.error, 'User not found');
    });

    it('should update user username', async () => {
      const result = await request('PUT', `/users/${testUserId}`, {
        headers: authenticated(MASTER_TOKEN),
        body: { username: 'updatedManagementUser' },
      });
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.body.id, testUserId);
      assert.strictEqual(result.body.username, 'updatedManagementUser');
    });

    it('should update user password', async () => {
      const result = await request('PUT', `/users/${testUserId}`, {
        headers: authenticated(MASTER_TOKEN),
        body: { password: 'newHashedSecret789' },
      });
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.body.id, testUserId);
      assert.strictEqual(result.body.password, 'newHashedSecret789');
    });

    it('should reject update without fields', async () => {
      const result = await request('PUT', `/users/${testUserId}`, {
        headers: authenticated(MASTER_TOKEN),
        body: {},
      });
      assert.strictEqual(result.status, 400);
      assert.ok(result.body.error);
    });

    it('should reject update for nonexistent user', async () => {
      const result = await request('PUT', '/users/000000000000000000000000', {
        headers: authenticated(MASTER_TOKEN),
        body: { username: 'Ghost' },
      });
      assert.strictEqual(result.status, 404);
      assert.strictEqual(result.body.error, 'User not found');
    });

    it('should delete user', async () => {
      const result = await request('DELETE', `/users/${testUserId}`, {
        headers: authenticated(MASTER_TOKEN),
      });
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.body.id, testUserId);
    });

    it('should return 404 for deleted user', async () => {
      const result = await request('GET', `/users/${testUserId}`, {
        headers: authenticated(MASTER_TOKEN),
      });
      assert.strictEqual(result.status, 404);
    });

    it('should reject delete for nonexistent user', async () => {
      const result = await request('DELETE', '/users/000000000000000000000000', {
        headers: authenticated(MASTER_TOKEN),
      });
      assert.strictEqual(result.status, 404);
      assert.strictEqual(result.body.error, 'User not found');
    });
  });

  describe('Auth Tokens Management', () => {
    const testTokenValue = 'test-token-value-abc-123';
    const testTokenUserId = 'test-user-id-456';

    it('should reject without master token', async () => {
      const result = await request('GET', '/auth-tokens');
      assert.strictEqual(result.status, 401);
      assert.strictEqual(result.body.error, 'Unauthorized');
    });

    it('should reject with wrong master token', async () => {
      const result = await request('GET', '/auth-tokens', {
        headers: authenticated('invalid-master'),
      });
      assert.strictEqual(result.status, 401);
      assert.strictEqual(result.body.error, 'Unauthorized');
    });

    it('should list auth tokens', async () => {
      const result = await request('GET', '/auth-tokens', {
        headers: authenticated(MASTER_TOKEN),
      });
      assert.strictEqual(result.status, 200);
      assert.ok(Array.isArray(result.body));
    });

    it('should create an auth token', async () => {
      const result = await request('POST', '/auth-tokens', {
        headers: authenticated(MASTER_TOKEN),
        body: { token: testTokenValue, userId: testTokenUserId },
      });
      assert.strictEqual(result.status, 201);
      assert.ok(result.body.id);
      assert.strictEqual(result.body.token, testTokenValue);
      assert.strictEqual(result.body.userId, testTokenUserId);
      assert.ok(result.body.createdAt);
      authTokenId = result.body.id;
    });

    it('should reject token without token value', async () => {
      const result = await request('POST', '/auth-tokens', {
        headers: authenticated(MASTER_TOKEN),
        body: { userId: testTokenUserId },
      });
      assert.strictEqual(result.status, 400);
      assert.ok(result.body.error);
    });

    it('should reject token without userId', async () => {
      const result = await request('POST', '/auth-tokens', {
        headers: authenticated(MASTER_TOKEN),
        body: { token: testTokenValue },
      });
      assert.strictEqual(result.status, 400);
      assert.ok(result.body.error);
    });

    it('should reject empty token body', async () => {
      const result = await request('POST', '/auth-tokens', {
        headers: authenticated(MASTER_TOKEN),
        body: {},
      });
      assert.strictEqual(result.status, 400);
      assert.ok(result.body.error);
    });

    it('should get token by identifier', async () => {
      const result = await request('GET', `/auth-tokens/${authTokenId}`, {
        headers: authenticated(MASTER_TOKEN),
      });
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.body.id, authTokenId);
      assert.strictEqual(result.body.token, testTokenValue);
      assert.strictEqual(result.body.userId, testTokenUserId);
    });

    it('should return 404 for nonexistent token', async () => {
      const result = await request('GET', '/auth-tokens/000000000000000000000000', {
        headers: authenticated(MASTER_TOKEN),
      });
      assert.strictEqual(result.status, 404);
      assert.strictEqual(result.body.error, 'Auth token not found');
    });

    it('should update token value', async () => {
      const updatedTokenValue = 'updated-token-value-xyz';
      const result = await request('PUT', `/auth-tokens/${authTokenId}`, {
        headers: authenticated(MASTER_TOKEN),
        body: { token: updatedTokenValue },
      });
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.body.id, authTokenId);
      assert.strictEqual(result.body.token, updatedTokenValue);
      assert.strictEqual(result.body.userId, testTokenUserId);
    });

    it('should update token userId', async () => {
      const updatedUserId = 'updated-user-id';
      const result = await request('PUT', `/auth-tokens/${authTokenId}`, {
        headers: authenticated(MASTER_TOKEN),
        body: { userId: updatedUserId },
      });
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.body.id, authTokenId);
      assert.strictEqual(result.body.userId, updatedUserId);
    });

    it('should reject token update without fields', async () => {
      const result = await request('PUT', `/auth-tokens/${authTokenId}`, {
        headers: authenticated(MASTER_TOKEN),
        body: {},
      });
      assert.strictEqual(result.status, 400);
      assert.ok(result.body.error);
    });

    it('should reject token update for nonexistent token', async () => {
      const result = await request('PUT', '/auth-tokens/000000000000000000000000', {
        headers: authenticated(MASTER_TOKEN),
        body: { token: 'newValue' },
      });
      assert.strictEqual(result.status, 404);
      assert.strictEqual(result.body.error, 'Auth token not found');
    });

    it('should delete auth token', async () => {
      const result = await request('DELETE', `/auth-tokens/${authTokenId}`, {
        headers: authenticated(MASTER_TOKEN),
      });
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.body.id, authTokenId);
    });

    it('should return 404 for deleted token', async () => {
      const result = await request('GET', `/auth-tokens/${authTokenId}`, {
        headers: authenticated(MASTER_TOKEN),
      });
      assert.strictEqual(result.status, 404);
    });

    it('should reject delete for nonexistent token', async () => {
      const result = await request('DELETE', '/auth-tokens/000000000000000000000000', {
        headers: authenticated(MASTER_TOKEN),
      });
      assert.strictEqual(result.status, 404);
      assert.strictEqual(result.body.error, 'Auth token not found');
    });
  });

  describe('Full Integration Flow', () => {
    const flowUsername = 'flowUser';
    const flowPassword = 'flowPassword';
    const todayDate = 20260725;
    const todayEventDescription = 'Today appointment';

    it('should clear database before flow', async () => {
      const result = await request('DELETE', '/clear-database', {
        headers: authenticated(CLEAR_TOKEN),
      });
      assert.strictEqual(result.status, 200);
      assert.ok(result.body.deleted);
    });

    it('should register a new user for flow', async () => {
      const result = await request('POST', '/auth/register', {
        body: { username: flowUsername, password: flowPassword },
      });
      assert.strictEqual(result.status, 201);
      assert.ok(result.body.id);
      assert.strictEqual(result.body.username, flowUsername);
    });

    let flowToken;
    it('should authorize flow user', async () => {
      const result = await request('POST', '/auth/authorize', {
        body: { username: flowUsername, password: flowPassword },
      });
      assert.strictEqual(result.status, 200);
      assert.ok(result.body.token);
      assert.strictEqual(typeof result.body.token, 'string');
      assert.ok(result.body.token.length > 0);
      flowToken = result.body.token;
    });

    let flowEventId;
    it('should add event for today', async () => {
      const result = await request('POST', '/events', {
        headers: authenticated(flowToken),
        body: { description: todayEventDescription, date: todayDate },
      });
      assert.strictEqual(result.status, 201);
      assert.ok(result.body.id);
      assert.strictEqual(result.body.description, todayEventDescription);
      assert.strictEqual(result.body.date, todayDate);
      flowEventId = result.body.id;
    });

    it('should get events and verify today event exists', async () => {
      const result = await request('GET', '/events', {
        headers: authenticated(flowToken),
      });
      assert.strictEqual(result.status, 200);
      assert.ok(Array.isArray(result.body));
      assert.strictEqual(result.body.length, 1);

      const foundEvent = result.body[0];
      assert.strictEqual(foundEvent.id, flowEventId);
      assert.strictEqual(foundEvent.description, todayEventDescription);
      assert.strictEqual(foundEvent.date, todayDate);
    });

    it('should get single event by identifier matching today event', async () => {
      const result = await request('GET', `/events/${flowEventId}`, {
        headers: authenticated(flowToken),
      });
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.body.id, flowEventId);
      assert.strictEqual(result.body.description, todayEventDescription);
      assert.strictEqual(result.body.date, todayDate);
    });
  });
});
