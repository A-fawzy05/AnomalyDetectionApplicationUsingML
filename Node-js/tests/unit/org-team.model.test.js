/**
 * Unit tests for the Organization and Team join-password compare methods.
 *
 * The pre-save hook (which hashes joinPassword) only runs on .save() and is
 * exercised by the integration tests. Here we verify the compare method logic
 * against a hash we create directly.
 */
const bcrypt = require('bcryptjs');
const Organization = require('../../models/Organization');
const Team = require('../../models/Team');

describe('Organization.compareJoinPassword', () => {
  test('matches a correct join password', async () => {
    const org = new Organization();
    org.joinPassword = await bcrypt.hash('letmein', 10);
    expect(await org.compareJoinPassword('letmein')).toBe(true);
    expect(await org.compareJoinPassword('nope')).toBe(false);
  });
});

describe('Team.compareJoinPassword', () => {
  test('matches a correct join password', async () => {
    const team = new Team();
    team.joinPassword = await bcrypt.hash('teampw', 10);
    expect(await team.compareJoinPassword('teampw')).toBe(true);
    expect(await team.compareJoinPassword('nope')).toBe(false);
  });
});
