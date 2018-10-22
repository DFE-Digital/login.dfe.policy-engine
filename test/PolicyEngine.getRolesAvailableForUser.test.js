jest.mock('./../lib/infrastructure/directories');
jest.mock('./../lib/infrastructure/organisations');
jest.mock('./../lib/infrastructure/access');

const DirectoriesClient = require('./../lib/infrastructure/directories');
const OrganisationsClient = require('./../lib/infrastructure/organisations');
const AccessClient = require('./../lib/infrastructure/access');
const PolicyEngine = require('./../lib');

const directoriesClient = {
  getUserById: jest.fn(),
};
const organisationsClient = {
  getUserOrganisations: jest.fn(),
};
const accessClient = {
  getPoliciesForService: jest.fn(),
  getUserAccessToServiceAtOrganisation: jest.fn(),
  getRolesForService: jest.fn(),
};
const allServiceRoles = [
  { id: 'role-1', name: 'role one' },
  { id: 'role-2', name: 'role two' },
  { id: 'role-3', name: 'role three' },
];
const user = {
  sub: 'user-1',
  email: 'user.one@unit.test',
};
const userOrganisations = [
  {
    organisation: {
      id: 'organisation-1',
    },
    role: {
      id: 0,
      name: 'End user',
    },
  },
];
const userAccessToService = {
  userId: 'user-1',
  organisationId: 'organisation-1',
  serviceId: 'service-1',
  roles: [
    'role-1'
  ]
};
const userId = 'user-1';
const organisationId = 'organisation-1';
const serviceId = 'service-1';
const correlationId = 'correlation-id';

describe('When getting available roles for a user', () => {
  let engine;

  beforeEach(() => {
    directoriesClient.getUserById.mockReset().mockReturnValue(user);
    DirectoriesClient.mockImplementation(() => directoriesClient);

    organisationsClient.getUserOrganisations.mockReset().mockReturnValue(userOrganisations);
    OrganisationsClient.mockImplementation(() => organisationsClient);

    accessClient.getPoliciesForService.mockReset();
    accessClient.getUserAccessToServiceAtOrganisation.mockReset().mockReturnValue(userAccessToService);
    accessClient.getRolesForService.mockReset().mockReturnValue(allServiceRoles);
    AccessClient.mockImplementation(() => accessClient);

    engine = new PolicyEngine({
      directories: {
        service: {
          url: 'https://directories.unit.test',
          auth: {},
        }
      },
      organisations: {
        service: {
          url: 'https://organisations.unit.test',
          auth: {},
        }
      },
      access: {
        service: {
          url: 'https://access.unit.test',
          auth: {},
        }
      },
    })
  });

  it('then it should return all roles for service if no policies', async () => {
    accessClient.getPoliciesForService.mockReturnValue([]);

    const actual = await engine.getRolesAvailableForUser(userId, organisationId, serviceId, correlationId);

    expect(actual).toEqual(allServiceRoles);
  });

  it('then it should return an empty array if user matches no policy', async () => {
    accessClient.getPoliciesForService.mockReturnValue([
      {
        id: 'policy-1',
        name: 'policy one',
        applicationId: serviceId,
        conditions: [
          {
            field: 'id',
            operator: 'is',
            value: ['another-user'],
          },
        ],
        roles: [
          allServiceRoles[0],
          allServiceRoles[2],
        ],
      },
    ]);

    const actual = await engine.getRolesAvailableForUser(userId, organisationId, serviceId, correlationId);

    expect(actual).toEqual([]);
  });

  it('then it should return policy roles when user matches organisation criteria', async () => {
    accessClient.getPoliciesForService.mockReturnValue([
      {
        id: 'policy-1',
        name: 'policy one',
        applicationId: serviceId,
        conditions: [
          {
            field: 'organisation.id',
            operator: 'is',
            value: [organisationId],
          },
        ],
        roles: [
          allServiceRoles[0],
          allServiceRoles[2],
        ],
      },
    ]);

    const actual = await engine.getRolesAvailableForUser(userId, organisationId, serviceId, correlationId);

    expect(actual).toEqual([
      allServiceRoles[0],
      allServiceRoles[2],
    ]);
  });

  it('then it should return policy roles when user matches user criteria', async () => {
    accessClient.getPoliciesForService.mockReturnValue([
      {
        id: 'policy-1',
        name: 'policy one',
        applicationId: serviceId,
        conditions: [
          {
            field: 'id',
            operator: 'is',
            value: [userId],
          },
        ],
        roles: [
          allServiceRoles[0],
          allServiceRoles[2],
        ],
      },
    ]);

    const actual = await engine.getRolesAvailableForUser(userId, organisationId, serviceId, correlationId);

    expect(actual).toEqual([
      allServiceRoles[0],
      allServiceRoles[2],
    ]);
  });

  it('then it should return policy roles when user matches roles criteria', async () => {
    accessClient.getPoliciesForService.mockReturnValue([
      {
        id: 'policy-1',
        name: 'policy one',
        applicationId: serviceId,
        conditions: [
          {
            field: 'roles',
            operator: 'is',
            value: [userAccessToService.roles[0]],
          },
        ],
        roles: [
          allServiceRoles[0],
          allServiceRoles[2],
        ],
      },
    ]);

    const actual = await engine.getRolesAvailableForUser(userId, organisationId, serviceId, correlationId);

    expect(actual).toEqual([
      allServiceRoles[0],
      allServiceRoles[2],
    ]);
  });
});
