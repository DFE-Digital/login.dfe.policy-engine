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
  validate: jest.fn(),
  apply: jest.fn(),
};
const maximumConstraint = {
  validate: jest.fn(),
  apply: jest.fn(),
};
const parentChildConstraint = {
  validate: jest.fn(),
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
    minimumConstraint.validate.mockReset().mockReturnValue([]);
    MinimumConstraint.mockReset().mockImplementation(() => minimumConstraint);

    maximumConstraint.apply.mockReset().mockReturnValue([]);
    maximumConstraint.validate.mockReset().mockReturnValue([]);
    MaximumConstraint.mockReset().mockImplementation(() => maximumConstraint);

    parentChildConstraint.apply.mockReset().mockReturnValue([]);
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
      applications: {
        service: {
          url: 'https://applications.unit.test',
          auth: {},
        }
      },
    });
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

  it('then it should apply minimum constraint if configured for service', async () => {
    await engine.validate(userId, organisationId, serviceId, selectedRoleIds, correlationId);

    expect(MinimumConstraint).toHaveBeenCalledTimes(1);
    expect(MinimumConstraint).toHaveBeenCalledWith(1);
    expect(minimumConstraint.validate).toHaveBeenCalledTimes(1);
    expect(minimumConstraint.validate).toHaveBeenCalledWith(selectedRoleIds);
  });

  it('then it should not apply minimum constraint if not configured for service', async () => {
    applicationsClient.getService.mockReturnValue({
      id: serviceId,
      relyingParty: {
        params: {
          maximumRolesAllowed: 2,
          requireParentChild: true,
        },
      },
    });

    await engine.validate(userId, organisationId, serviceId, selectedRoleIds, correlationId);

    expect(MinimumConstraint).toHaveBeenCalledTimes(0);
    expect(minimumConstraint.validate).toHaveBeenCalledTimes(0);
  });

  it('then it should return exceptions if minimum constraint fails', async () => {
    const constraintError = {
      constraint: 'MinimumConstraint',
      message: 'Expected a minimum of X roles to be selected but received X selected roles',
      appliesTo: selectedRoleIds,
    };
    minimumConstraint.validate.mockReturnValue([constraintError]);

    const actual = await engine.validate(userId, organisationId, serviceId, selectedRoleIds, correlationId);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(1);
    expect(actual[0]).toEqual(constraintError);
  });

  it('then it should apply maximum constraint if configured for service', async () => {
    await engine.validate(userId, organisationId, serviceId, selectedRoleIds, correlationId);

    expect(MaximumConstraint).toHaveBeenCalledTimes(1);
    expect(MaximumConstraint).toHaveBeenCalledWith(2);
    expect(maximumConstraint.validate).toHaveBeenCalledTimes(1);
    expect(maximumConstraint.validate).toHaveBeenCalledWith(selectedRoleIds);
  });

  it('then it should not apply maximum constraint if not configured for service', async () => {
    applicationsClient.getService.mockReturnValue({
      id: serviceId,
      relyingParty: {
        params: {
          minimumRolesRequired: 1,
          requireParentChild: true,
        },
      },
    });

    await engine.validate(userId, organisationId, serviceId, selectedRoleIds, correlationId);

    expect(MaximumConstraint).toHaveBeenCalledTimes(0);
    expect(maximumConstraint.validate).toHaveBeenCalledTimes(0);
  });

  it('then it should return exceptions if maximum constraint fails', async () => {
    const constraintError = {
      constraint: 'MaximumConstraint',
      message: 'Expected a maximum of X roles to be selected but received X selected roles',
      appliesTo: selectedRoleIds,
    };
    maximumConstraint.validate.mockReturnValue([constraintError]);

    const actual = await engine.validate(userId, organisationId, serviceId, selectedRoleIds, correlationId);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(1);
    expect(actual[0]).toEqual(constraintError);
  });

  it('then it should apply parent/child constraint if configured for service', async () => {
    await engine.validate(userId, organisationId, serviceId, selectedRoleIds, correlationId);

    expect(ParentChildConstraint).toHaveBeenCalledTimes(1);
    expect(ParentChildConstraint).toHaveBeenCalledWith(allServiceRoles);
    expect(parentChildConstraint.validate).toHaveBeenCalledTimes(1);
    expect(parentChildConstraint.validate).toHaveBeenCalledWith(selectedRoleIds);
  });

  it('then it should not apply parent/child constraint if not configured for service', async () => {
    applicationsClient.getService.mockReturnValue({
      id: serviceId,
      relyingParty: {
        params: {
          minimumRolesRequired: 1,
          maximumRolesAllowed: 2,
        },
      },
    });

    await engine.validate(userId, organisationId, serviceId, selectedRoleIds, correlationId);

    expect(ParentChildConstraint).toHaveBeenCalledTimes(0);
    expect(parentChildConstraint.validate).toHaveBeenCalledTimes(0);
  });

  it('then it should return exceptions if parent/child constraint fails', async () => {
    const constraintError = {
      constraint: 'ParentChildConstraint',
      message: 'A child cannot be selected without a parent',
      appliesTo: selectedRoleIds,
    };
    parentChildConstraint.validate.mockReturnValue([constraintError]);

    const actual = await engine.validate(userId, organisationId, serviceId, selectedRoleIds, correlationId);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(1);
    expect(actual[0]).toEqual(constraintError);
  });

  it('then it should return exceptions if all constraints fails', async () => {
    const minimumConstraintError = {
      constraint: 'MinimumConstraint',
      message: 'Expected a minimum of X roles to be selected but received X selected roles',
      appliesTo: selectedRoleIds,
    };
    minimumConstraint.validate.mockReturnValue([minimumConstraintError]);
    const maximumConstraintError = {
      constraint: 'MaximumConstraint',
      message: 'Expected a maximum of X roles to be selected but received X selected roles',
      appliesTo: selectedRoleIds,
    };
    maximumConstraint.validate.mockReturnValue([maximumConstraintError]);
    const parentChildConstraintError = {
      constraint: 'ParentChildConstraint',
      message: 'A child cannot be selected without a parent',
      appliesTo: selectedRoleIds,
    };
    parentChildConstraint.validate.mockReturnValue([parentChildConstraintError]);

    const actual = await engine.validate(userId, organisationId, serviceId, selectedRoleIds, correlationId);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(3);
    expect(actual[0]).toEqual(minimumConstraintError);
    expect(actual[1]).toEqual(maximumConstraintError);
    expect(actual[2]).toEqual(parentChildConstraintError);
  });
});