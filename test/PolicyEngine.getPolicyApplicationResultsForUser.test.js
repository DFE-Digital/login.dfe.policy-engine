jest.mock("login.dfe.api-client/api/setup");

jest.mock("login.dfe.api-client/services", () => ({
  getServiceRaw: jest.fn(),
  getServiceRolesRaw: jest.fn(),
  getServicePoliciesRaw: jest.fn(),
}));

jest.mock("login.dfe.api-client/users", () => ({
  getUserRaw: jest.fn(),
  getUserServiceRaw: jest.fn(),
  getUserOrganisationsRaw: jest.fn(),
}));

jest.mock("login.dfe.api-client/organisations", () => ({
  getOrganisationRaw: jest.fn(),
}));

jest.mock("./../lib/constraints/MinimumConstraint");
jest.mock("./../lib/constraints/MaximumConstraint");
jest.mock("./../lib/constraints/ParentChildConstraint");

const MinimumConstraint = require("./../lib/constraints/MinimumConstraint");
const MaximumConstraint = require("./../lib/constraints/MaximumConstraint");
const ParentChildConstraint = require("./../lib/constraints/ParentChildConstraint");
const PolicyEngine = require("./../lib");

const {
  getServiceRaw,
  getServiceRolesRaw,
  getServicePoliciesRaw,
} = require("login.dfe.api-client/services");
const {
  getUserRaw,
  getUserServiceRaw,
  getUserOrganisationsRaw,
} = require("login.dfe.api-client/users");

const { getOrganisationRaw } = require("login.dfe.api-client/organisations");

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
  { id: "role-1", name: "role one" },
  { id: "role-2", name: "role two" },
  { id: "role-3", name: "role three" },
];
const user = {
  sub: "user-1",
  email: "user.one@unit.test",
};
const userOrganisations = [
  {
    organisation: {
      id: "organisation-1",
    },
    role: {
      id: 0,
      name: "End user",
    },
  },
];
const userAccessToService = {
  userId: "user-1",
  organisationId: "organisation-1",
  serviceId: "service-1",
  roles: [{ id: "role-1", name: "role 1", code: "r1" }],
};
const userId = "user-1";
const organisationId = "organisation-1";
const serviceId = "service-1";
const correlationId = "correlation-id";

describe("When getting available roles for a user", () => {
  let engine;

  beforeEach(() => {
    getUserRaw.mockReset().mockResolvedValue(user);

    getUserOrganisationsRaw.mockReset().mockResolvedValue(userOrganisations);

    getOrganisationRaw
      .mockReset()
      .mockResolvedValue(userOrganisations[0].organisation);

    getServicePoliciesRaw.mockReset();

    getUserServiceRaw.mockReset().mockResolvedValue(userAccessToService);

    getServiceRolesRaw.mockReset().mockResolvedValue(allServiceRoles);

    getServiceRaw.mockReset().mockResolvedValue({
      id: serviceId,
      relyingParty: {
        params: {
          minimumRolesRequired: 1,
          maximumRolesAllowed: 2,
          requireParentChild: true,
        },
      },
    });

    minimumConstraint.apply.mockReset().mockReturnValue([]);
    MinimumConstraint.mockReset().mockImplementation(() => minimumConstraint);

    maximumConstraint.apply.mockReset().mockReturnValue([]);
    MaximumConstraint.mockReset().mockImplementation(() => maximumConstraint);

    parentChildConstraint.apply.mockReset().mockReturnValue([]);
    ParentChildConstraint.mockReset().mockImplementation(
      () => parentChildConstraint,
    );

    engine = new PolicyEngine({
      directories: {
        service: {
          url: "https://directories.unit.test",
          auth: {},
        },
      },
      organisations: {
        service: {
          url: "https://organisations.unit.test",
          auth: {},
        },
      },
      access: {
        service: {
          url: "https://access.unit.test",
          auth: {},
        },
      },
      applications: {
        service: {
          url: "https://applications.unit.test",
          auth: {},
        },
      },
    });
  });

  it("then it should return all roles for service if no policies", async () => {
    getServicePoliciesRaw.mockResolvedValue([]);

    const actual = await engine.getPolicyApplicationResultsForUser(
      userId,
      organisationId,
      [serviceId],
      correlationId,
    );

    expect(actual).toMatchObject([
      {
        id: serviceId,
        rolesAvailableToUser: allServiceRoles,
        serviceAvailableToUser: true,
      },
    ]);
  });

  it("then it should return no roles if user matches no policy", async () => {
    getServicePoliciesRaw.mockResolvedValue([
      {
        id: "policy-1",
        name: "policy one",
        applicationId: serviceId,
        conditions: [
          {
            field: "id",
            operator: "is",
            value: ["another-user"],
          },
        ],
        roles: [allServiceRoles[0], allServiceRoles[2]],
      },
    ]);

    const actual = await engine.getPolicyApplicationResultsForUser(
      userId,
      organisationId,
      [serviceId],
      correlationId,
    );

    expect(actual).toMatchObject([
      {
        id: serviceId,
        rolesAvailableToUser: [],
      },
    ]);
  });

  it("then it should return policy roles when user matches organisation criteria", async () => {
    getServicePoliciesRaw.mockResolvedValue([
      {
        id: "policy-1",
        name: "policy one",
        applicationId: serviceId,
        conditions: [
          {
            field: "organisation.id",
            operator: "is",
            value: [organisationId],
          },
        ],
        roles: [allServiceRoles[0], allServiceRoles[2]],
      },
    ]);

    const actual = await engine.getPolicyApplicationResultsForUser(
      userId,
      organisationId,
      [serviceId],
      correlationId,
    );

    expect(actual).toMatchObject([
      {
        id: serviceId,
        rolesAvailableToUser: [allServiceRoles[0], allServiceRoles[2]],
      },
    ]);
  });

  it("then it should return policy roles when user matches user criteria", async () => {
    getServicePoliciesRaw.mockResolvedValue([
      {
        id: "policy-1",
        name: "policy one",
        applicationId: serviceId,
        conditions: [
          {
            field: "id",
            operator: "is",
            value: [userId],
          },
        ],
        roles: [allServiceRoles[0], allServiceRoles[2]],
      },
    ]);

    const actual = await engine.getPolicyApplicationResultsForUser(
      userId,
      organisationId,
      [serviceId],
      correlationId,
    );

    expect(actual).toMatchObject([
      {
        id: serviceId,
        rolesAvailableToUser: [allServiceRoles[0], allServiceRoles[2]],
      },
    ]);
  });

  it("then it should return policy roles when user matches roles criteria", async () => {
    const policy = {
      id: "policy-1",
      name: "policy one",
      applicationId: serviceId,
      conditions: [
        {
          field: "roles.id",
          operator: "is",
          value: [userAccessToService.roles[0].id],
        },
      ],
      roles: [allServiceRoles[0], allServiceRoles[2]],
    };
    getServicePoliciesRaw.mockResolvedValue([policy]);

    const actual = await engine.getPolicyApplicationResultsForUser(
      userId,
      organisationId,
      [serviceId],
      correlationId,
    );

    expect(actual).toMatchObject([
      {
        id: serviceId,
        policiesAppliedForUser: [policy],
        rolesAvailableToUser: [allServiceRoles[0], allServiceRoles[2]],
      },
    ]);
  });

  it("then it should not try and get user from directories if userId is undefined", async () => {
    getServicePoliciesRaw.mockResolvedValue([
      {
        id: "policy-1",
        name: "policy one",
        applicationId: serviceId,
        conditions: [
          {
            field: "organisation.id",
            operator: "is",
            value: [organisationId],
          },
        ],
        roles: [allServiceRoles[0], allServiceRoles[2]],
      },
    ]);

    await engine.getPolicyApplicationResultsForUser(
      undefined,
      organisationId,
      [serviceId],
      correlationId,
    );

    expect(getUserRaw).toHaveBeenCalledTimes(0);
  });

  it("then it should return policy roles when user matches organisation criteria and userId is undefined", async () => {
    getServicePoliciesRaw.mockResolvedValue([
      {
        id: "policy-1",
        name: "policy one",
        applicationId: serviceId,
        conditions: [
          {
            field: "organisation.id",
            operator: "is",
            value: [organisationId],
          },
        ],
        roles: [allServiceRoles[0], allServiceRoles[2]],
      },
    ]);

    const actual = await engine.getPolicyApplicationResultsForUser(
      undefined,
      organisationId,
      [serviceId],
      correlationId,
    );

    expect(actual).toMatchObject([
      {
        id: serviceId,
        rolesAvailableToUser: [allServiceRoles[0], allServiceRoles[2]],
      },
    ]);
  });

  it("then it should not return policy roles criteria is based on user and userId is undefined", async () => {
    getServicePoliciesRaw.mockResolvedValue([
      {
        id: "policy-1",
        name: "policy one",
        applicationId: serviceId,
        conditions: [
          {
            field: "id",
            operator: "is",
            value: [userId],
          },
        ],
        roles: [allServiceRoles[0], allServiceRoles[2]],
      },
    ]);

    const actual = await engine.getPolicyApplicationResultsForUser(
      undefined,
      organisationId,
      [serviceId],
      correlationId,
    );

    expect(actual).toMatchObject([
      {
        id: serviceId,
        rolesAvailableToUser: [],
      },
    ]);
  });

  it("then it should treat no values as a false when applying conditions", async () => {
    getServicePoliciesRaw.mockResolvedValue([
      {
        id: "policy-1",
        name: "policy one",
        applicationId: serviceId,
        conditions: [
          {
            field: "roles.id",
            operator: "is_not",
            value: "something",
          },
        ],
        roles: [allServiceRoles[0]],
      },
    ]);
    getUserServiceRaw.mockReset().mockResolvedValue({
      userId: "user-1",
      organisationId: "organisation-1",
      serviceId: "service-1",
      roles: [],
    });

    const actual = await engine.getPolicyApplicationResultsForUser(
      undefined,
      organisationId,
      [serviceId],
      correlationId,
    );

    expect(actual).toMatchObject([
      {
        id: serviceId,
        rolesAvailableToUser: [allServiceRoles[0]],
      },
    ]);
  });

  it("then it should remove roles that violate a single constraint", async () => {
    parentChildConstraint.apply.mockImplementation((availableRoles) => {
      return availableRoles.filter((x) => x === "role-1");
    });
    getServicePoliciesRaw.mockResolvedValue([
      {
        id: "policy-1",
        name: "policy one",
        applicationId: serviceId,
        conditions: [
          {
            field: "organisation.id",
            operator: "is",
            value: [organisationId],
          },
        ],
        roles: [allServiceRoles[0], allServiceRoles[1], allServiceRoles[2]],
      },
    ]);

    const actual = await engine.getPolicyApplicationResultsForUser(
      undefined,
      organisationId,
      [serviceId],
      correlationId,
    );

    expect(actual).toMatchObject([
      {
        id: serviceId,
        rolesAvailableToUser: [allServiceRoles[1], allServiceRoles[2]],
      },
    ]);
  });

  it("then it should remove roles that violate multiple constraints", async () => {
    minimumConstraint.apply.mockImplementation((availableRoles) => {
      return availableRoles.find((x) => x === "role-1") ? [] : availableRoles;
    });
    parentChildConstraint.apply.mockImplementation((availableRoles) => {
      return availableRoles.filter((x) => x === "role-1");
    });
    getServicePoliciesRaw.mockResolvedValue([
      {
        id: "policy-1",
        name: "policy one",
        applicationId: serviceId,
        conditions: [
          {
            field: "organisation.id",
            operator: "is",
            value: [organisationId],
          },
        ],
        roles: [allServiceRoles[0], allServiceRoles[1], allServiceRoles[2]],
      },
    ]);

    const actual = await engine.getPolicyApplicationResultsForUser(
      undefined,
      organisationId,
      [serviceId],
      correlationId,
    );

    expect(actual).toMatchObject([
      {
        id: serviceId,
        rolesAvailableToUser: [],
      },
    ]);
  });

  it("then it should make service unavailable to user if constraints and no roles", async () => {
    parentChildConstraint.apply.mockImplementation(
      (availableRoles) => availableRoles,
    );
    getServicePoliciesRaw.mockResolvedValue([
      {
        id: "policy-1",
        name: "policy one",
        applicationId: serviceId,
        conditions: [
          {
            field: "organisation.id",
            operator: "is",
            value: [organisationId],
          },
        ],
        roles: [],
      },
    ]);

    const actual = await engine.getPolicyApplicationResultsForUser(
      undefined,
      organisationId,
      [serviceId],
      correlationId,
    );

    expect(actual).toMatchObject([
      {
        id: serviceId,
        rolesAvailableToUser: [],
        serviceAvailableToUser: false,
      },
    ]);
  });

  it("then it should make service available to user if no roles but no constraints", async () => {
    parentChildConstraint.apply.mockImplementation(
      (availableRoles) => availableRoles,
    );
    getServicePoliciesRaw.mockResolvedValue([
      {
        id: "policy-1",
        name: "policy one",
        applicationId: serviceId,
        conditions: [
          {
            field: "organisation.id",
            operator: "is",
            value: [organisationId],
          },
        ],
        roles: [],
      },
    ]);
    getServiceRaw.mockReset().mockResolvedValue({
      id: serviceId,
      relyingParty: {
        params: {},
      },
    });

    const actual = await engine.getPolicyApplicationResultsForUser(
      undefined,
      organisationId,
      [serviceId],
      correlationId,
    );

    expect(actual).toMatchObject([
      {
        id: serviceId,
        rolesAvailableToUser: [],
        serviceAvailableToUser: true,
      },
    ]);
  });

  it("then it should call getUserAccessToServiceAtOrganisation for each service if the user ID is passed in and the services have policies", async () => {
    getServicePoliciesRaw.mockResolvedValue([
      {
        id: "policy-1",
        name: "policy one",
        applicationId: serviceId,
        conditions: [
          {
            field: "organisation.id",
            operator: "is",
            value: [organisationId],
          },
        ],
        roles: [],
      },
    ]);
    await engine.getPolicyApplicationResultsForUser(
      userId,
      organisationId,
      [serviceId, "service-2"],
      correlationId,
    );

    expect(getUserServiceRaw).toHaveBeenCalledTimes(2);
    expect(getUserServiceRaw).toHaveBeenCalledWith({
      userId,
      organisationId,
      serviceId,
    });
    expect(getUserServiceRaw).toHaveBeenCalledWith({
      userId,
      organisationId,
      serviceId: "service-2",
    });
  });

  it("then it should not throw and treat the service as unconstrained when getServiceRaw returns undefined", async () => {
    getServiceRaw.mockReset().mockResolvedValue(undefined);
    getServicePoliciesRaw.mockResolvedValue([]);

    const actual = await engine.getPolicyApplicationResultsForUser(
      userId,
      organisationId,
      [serviceId],
      correlationId,
    );

    expect(actual).toMatchObject([
      {
        id: serviceId,
        rolesAvailableToUser: allServiceRoles,
        serviceAvailableToUser: true,
      },
    ]);
  });

  it("then it should not call getUserAccessToServiceAtOrganisation if the user ID is not passed in and the services have policies", async () => {
    getServicePoliciesRaw.mockResolvedValue([
      {
        id: "policy-1",
        name: "policy one",
        applicationId: serviceId,
        conditions: [
          {
            field: "organisation.id",
            operator: "is",
            value: [organisationId],
          },
        ],
        roles: [],
      },
    ]);

    await engine.getPolicyApplicationResultsForUser(
      undefined,
      organisationId,
      [serviceId, "service-2"],
      correlationId,
    );

    expect(getUserServiceRaw).not.toHaveBeenCalled();
  });

  it("then it should return policy roles when organisation ukprn matches starts_with condition", async () => {
    getOrganisationRaw.mockResolvedValue({
      id: organisationId,
      ukprn: "10070901",
    });
    getServicePoliciesRaw.mockResolvedValue([
      {
        id: "policy-1",
        name: "policy one",
        applicationId: serviceId,
        conditions: [
          {
            field: "organisation.ukprn",
            operator: "starts_with",
            value: ["1"],
          },
        ],
        roles: [allServiceRoles[0], allServiceRoles[1]],
      },
    ]);

    const actual = await engine.getPolicyApplicationResultsForUser(
      undefined,
      organisationId,
      [serviceId],
      correlationId,
    );

    expect(actual).toMatchObject([
      {
        id: serviceId,
        rolesAvailableToUser: [allServiceRoles[0], allServiceRoles[1]],
        serviceAvailableToUser: true,
      },
    ]);
  });

  it("then it should not return policy roles when organisation ukprn does not match starts_with condition", async () => {
    getOrganisationRaw.mockResolvedValue({
      id: organisationId,
      ukprn: "20070901",
    });
    getServicePoliciesRaw.mockResolvedValue([
      {
        id: "policy-1",
        name: "policy one",
        applicationId: serviceId,
        conditions: [
          {
            field: "organisation.ukprn",
            operator: "starts_with",
            value: ["1"],
          },
        ],
        roles: [allServiceRoles[0], allServiceRoles[1]],
      },
    ]);

    const actual = await engine.getPolicyApplicationResultsForUser(
      undefined,
      organisationId,
      [serviceId],
      correlationId,
    );

    expect(actual).toMatchObject([
      {
        id: serviceId,
        rolesAvailableToUser: [],
        serviceAvailableToUser: false,
      },
    ]);
  });

  it("then it should not return policy roles when organisation ukprn is absent and starts_with condition is set", async () => {
    getOrganisationRaw.mockResolvedValue({
      id: organisationId,
    });
    getServicePoliciesRaw.mockResolvedValue([
      {
        id: "policy-1",
        name: "policy one",
        applicationId: serviceId,
        conditions: [
          {
            field: "organisation.ukprn",
            operator: "starts_with",
            value: ["1"],
          },
        ],
        roles: [allServiceRoles[0], allServiceRoles[1]],
      },
    ]);

    const actual = await engine.getPolicyApplicationResultsForUser(
      undefined,
      organisationId,
      [serviceId],
      correlationId,
    );

    expect(actual).toMatchObject([
      {
        id: serviceId,
        rolesAvailableToUser: [],
        serviceAvailableToUser: false,
      },
    ]);
  });
});
