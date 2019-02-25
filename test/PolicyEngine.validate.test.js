jest.mock('./../lib/infrastructure/directories');
jest.mock('./../lib/infrastructure/organisations');
jest.mock('./../lib/infrastructure/access');
jest.mock('./../lib/constraints/MinimumConstraint');
jest.mock('./../lib/constraints/MaximumConstraint');
jest.mock('./../lib/constraints/ParentChildConstraint');

const DirectoriesClient = require('./../lib/infrastructure/directories');
const OrganisationsClient = require('./../lib/infrastructure/organisations');
const AccessClient = require('./../lib/infrastructure/access');
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
const minimumConstraint = {
  validate: jest.fn(),
};
const maximumConstraint = {
  validate: jest.fn(),
};
const parentChildConstraint = {
  validate: jest.fn(),
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
const selectedRoleIds = [allServiceRoles[0].id, allServiceRoles[1].id];
const correlationId = 'correlation-id';

describe('when validating selected roles', () => {
  let engine;

  beforeEach(() => {
    directoriesClient.getUserById.mockReset().mockReturnValue(user);
    DirectoriesClient.mockImplementation(() => directoriesClient);

    organisationsClient.getUserOrganisations.mockReset().mockReturnValue(userOrganisations);
    organisationsClient.getOrganisation.mockReset().mockReturnValue(userOrganisations[0].organisation);
    OrganisationsClient.mockImplementation(() => organisationsClient);

    accessClient.getPoliciesForService.mockReset().mockReturnValue([
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
        roles: allServiceRoles,
      },
    ]);
    accessClient.getUserAccessToServiceAtOrganisation.mockReset().mockReturnValue(userAccessToService);
    accessClient.getRolesForService.mockReset().mockReturnValue(allServiceRoles);
    AccessClient.mockImplementation(() => accessClient);

    minimumConstraint.validate.mockReset().mockReturnValue([]);
    MinimumConstraint.mockReset().mockImplementation(() => minimumConstraint);

    maximumConstraint.validate.mockReset().mockReturnValue([]);
    MaximumConstraint.mockReset().mockImplementation(() => maximumConstraint);

    parentChildConstraint.validate.mockReset().mockReturnValue([]);
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
    })
  });

  it('then it should not return any exceptions if all roles available after application policies and no contraints violated', async () => {
    const actual = await engine.validate(userId, organisationId, serviceId, selectedRoleIds, correlationId);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(0);
  });

  it('then it should return exceptions if a role selected is not available through policies', async () => {
    const badSelectedRoles = [allServiceRoles[0].id, 'not-a-role-1', 'not-a-role-2'];

    const actual = await engine.validate(userId, organisationId, serviceId, badSelectedRoles, correlationId);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(1);
    expect(actual[0]).toMatchObject({
      message: `Roles have been selected that are not available to the user`,
      appliesTo: ['not-a-role-1', 'not-a-role-2'],
    });
  });
});