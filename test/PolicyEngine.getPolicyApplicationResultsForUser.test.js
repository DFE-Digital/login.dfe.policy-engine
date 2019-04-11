jest.mock('./../lib/infrastructure/directories');
jest.mock('./../lib/infrastructure/organisations');
jest.mock('./../lib/infrastructure/access');
jest.mock('./../lib/infrastructure/applications');
jest.mock('./../lib/constraints/MinimumConstraint');
jest.mock('./../lib/constraints/MaximumConstraint');
jest.mock('./../lib/constraints/ParentChildConstraint');

const DirectoriesClient = require('./../lib/infrastructure/directories');
const OrganisationsClient = require('./../lib/infrastructure/organisations');
const AccessClient = require('./../lib/infrastructure/access');
const ApplicationsClient = require('./../lib/infrastructure/applications');
const MinimumConstraint = require('./../lib/constraints/MinimumConstraint');
const MaximumConstraint = require('./../lib/constraints/MaximumConstraint');
const ParentChildConstraint = require('./../lib/constraints/ParentChildConstraint');
const PolicyEngine = require('./../lib');

const directoriesClient = {
  getUserById: jest.fn(),
};
const organisationsClient = {
  getUserOrganisations: jest.fn(),
  getOrganisation: jest.fn(),
};
const accessClient = {
  getPoliciesForService: jest.fn(),
  getUserAccessToServiceAtOrganisation: jest.fn(),
  getRolesForService: jest.fn(),
};
const applicationsClient = {
  getService: jest.fn(),
};
const minimumConstraint = {
  apply: jest.fn(),
};
const maximumConstraint = {
  apply: jest.fn(),
};
const parentChildConstraint = {
  apply: jest.fn(),
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
    organisationsClient.getOrganisation.mockReset().mockReturnValue(userOrganisations[0].organisation);
    OrganisationsClient.mockImplementation(() => organisationsClient);

    accessClient.getPoliciesForService.mockReset();
    accessClient.getUserAccessToServiceAtOrganisation.mockReset().mockReturnValue(userAccessToService);
    accessClient.getRolesForService.mockReset().mockReturnValue(allServiceRoles);
    AccessClient.mockImplementation(() => accessClient);

    applicationsClient.getService.mockReset().mockReturnValue({
      id: serviceId,
      relyingParty: {
        params: {
          minimumRolesRequired: 1,
          maximumRolesAllowed: 2,
          requireParentChild: true,
        },
      },
    });
    ApplicationsClient.mockImplementation(() => applicationsClient);

    minimumConstraint.apply.mockReset().mockReturnValue([]);
    MinimumConstraint.mockReset().mockImplementation(() => minimumConstraint);

    maximumConstraint.apply.mockReset().mockReturnValue([]);
    MaximumConstraint.mockReset().mockImplementation(() => maximumConstraint);

    parentChildConstraint.apply.mockReset().mockReturnValue([]);
    ParentChildConstraint.mockReset().mockImplementation(() => parentChildConstraint);

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
      applications: {
        service: {
          url: 'https://applications.unit.test',
          auth: {},
        }
      },
    })
  });

  it('then it should return all roles for service if no policies', async () => {
    accessClient.getPoliciesForService.mockReturnValue([]);

    const actual = await engine.getPolicyApplicationResultsForUser(userId, organisationId, serviceId, correlationId);

    expect(actual).toMatchObject({
      rolesAvailableToUser: allServiceRoles,
      serviceAvailableToUser: true,
    });
  });

  it('then it should return no roles if user matches no policy', async () => {
    accessClient.getPoliciesForService.mockReturnValue({
      policies:[
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
    ]});

    const actual = await engine.getPolicyApplicationResultsForUser(userId, organisationId, serviceId, correlationId);

    expect(actual).toMatchObject({
      rolesAvailableToUser: [],
    });
  });

  it('then it should return policy roles when user matches organisation criteria', async () => {
    accessClient.getPoliciesForService.mockReturnValue({
      policies:[
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
    ]});

    const actual = await engine.getPolicyApplicationResultsForUser(userId, organisationId, serviceId, correlationId);

    expect(actual).toMatchObject({
      rolesAvailableToUser: [
        allServiceRoles[0],
        allServiceRoles[2],
      ],
    });
  });

  it('then it should return policy roles when user matches user criteria', async () => {
    accessClient.getPoliciesForService.mockReturnValue({
      policies: [
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
    ]});

    const actual = await engine.getPolicyApplicationResultsForUser(userId, organisationId, serviceId, correlationId);

    expect(actual).toMatchObject({
      rolesAvailableToUser: [
        allServiceRoles[0],
        allServiceRoles[2],
      ],
    });
  });

  it('then it should return policy roles when user matches roles criteria', async () => {
    accessClient.getPoliciesForService.mockReturnValue({
      policies: [
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
    ]});

    const actual = await engine.getPolicyApplicationResultsForUser(userId, organisationId, serviceId, correlationId);

    expect(actual).toMatchObject({
      rolesAvailableToUser: [
        allServiceRoles[0],
        allServiceRoles[2],
      ],
    });
  });

  it('then it should not try and get user from directories if userId is undefined', async () => {
    accessClient.getPoliciesForService.mockReturnValue({
      policies: [
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
    ]});

    await engine.getPolicyApplicationResultsForUser(undefined, organisationId, serviceId, correlationId);

    expect(directoriesClient.getUserById).toHaveBeenCalledTimes(0);
  });

  it('then it should return policy roles when user matches organisation criteria and userId is undefined', async () => {
    accessClient.getPoliciesForService.mockReturnValue({
      policies: [
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
    ]});

    const actual = await engine.getPolicyApplicationResultsForUser(undefined, organisationId, serviceId, correlationId);

    expect(actual).toMatchObject({
      rolesAvailableToUser: [
        allServiceRoles[0],
        allServiceRoles[2],
      ],
    });
  });

  it('then it should not return policy roles criteria is based on user and userId is undefined', async () => {
    accessClient.getPoliciesForService.mockReturnValue({
      policies: [
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
    ]});

    const actual = await engine.getPolicyApplicationResultsForUser(undefined, organisationId, serviceId, correlationId);

    expect(actual).toMatchObject({
      rolesAvailableToUser: [],
    });
  });

  it('then it should treat no values as a false when applying conditions', async () => {
    accessClient.getPoliciesForService.mockReturnValue({
      policies: [
      {
        id: 'policy-1',
        name: 'policy one',
        applicationId: serviceId,
        conditions: [
          {
            field: 'role.id',
            operator: 'is_not',
            value: 'something',
          },
        ],
        roles: [
          allServiceRoles[0],
        ],
      },
    ]});
    accessClient.getUserAccessToServiceAtOrganisation.mockReset().mockReturnValue({
      userId: 'user-1',
      organisationId: 'organisation-1',
      serviceId: 'service-1',
      roles: []
    });

    const actual = await engine.getPolicyApplicationResultsForUser(undefined, organisationId, serviceId, correlationId);

    expect(actual).toMatchObject({
      rolesAvailableToUser: [
        allServiceRoles[0],
      ],
    });
  });

  it('then it should remove roles that violate a single constraint', async () => {
    parentChildConstraint.apply.mockImplementation((availableRoles) => {
      return availableRoles.filter(x => x === 'role-1');
    });
    accessClient.getPoliciesForService.mockReturnValue({
      policies:[
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
          allServiceRoles[1],
          allServiceRoles[2],
        ],
      },
    ]});

    const actual = await engine.getPolicyApplicationResultsForUser(undefined, organisationId, serviceId, correlationId);

    expect(actual).toMatchObject({
      rolesAvailableToUser: [
        allServiceRoles[1],
        allServiceRoles[2],
      ],
    });
  });

  it('then it should remove roles that violate multiple constraints', async () => {
    minimumConstraint.apply.mockImplementation((availableRoles) => {
      return availableRoles.find(x => x === 'role-1') ? [] : availableRoles;
    });
    parentChildConstraint.apply.mockImplementation((availableRoles) => {
      return availableRoles.filter(x => x === 'role-1');
    });
    accessClient.getPoliciesForService.mockReturnValue({
      policies:[
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
          allServiceRoles[1],
          allServiceRoles[2],
        ],
      },
    ]});

    const actual = await engine.getPolicyApplicationResultsForUser(undefined, organisationId, serviceId, correlationId);

    expect(actual).toMatchObject({
      rolesAvailableToUser: [],
    });
  });

  it('then it should make service unavailable to user if constraints and no roles', async () => {
    parentChildConstraint.apply.mockImplementation(availableRoles => availableRoles);
    accessClient.getPoliciesForService.mockReturnValue({
      policies: [
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
        roles: [],
      },
    ]});

    const actual = await engine.getPolicyApplicationResultsForUser(undefined, organisationId, serviceId, correlationId);

    expect(actual).toMatchObject({
      rolesAvailableToUser: [],
      serviceAvailableToUser: false,
    });
  });

  it('then it should make service available to user if no roles but no constraints', async () => {
    parentChildConstraint.apply.mockImplementation(availableRoles => availableRoles);
    accessClient.getPoliciesForService.mockReturnValue({
      policies: [
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
        roles: [],
      },
    ]});
    applicationsClient.getService.mockReset().mockReturnValue({
      id: serviceId,
      relyingParty: {
        params: {
        },
      },
    });

    const actual = await engine.getPolicyApplicationResultsForUser(undefined, organisationId, serviceId, correlationId);

    expect(actual).toMatchObject({
      rolesAvailableToUser: [],
      serviceAvailableToUser: true,
    });
  });
});
