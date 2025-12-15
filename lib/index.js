const DirectoriesClient = require("./infrastructure/directories");
const OrganisationsClient = require("./infrastructure/organisations");
const AccessClient = require("./infrastructure/access");
const ApplicationsClient = require("./infrastructure/applications");
const MinimumConstraint = require("./constraints/MinimumConstraint");
const MaximumConstraint = require("./constraints/MaximumConstraint");
const SelectionConstraint = require("./constraints/SelectionConstraint");
const ParentChildConstraint = require("./constraints/ParentChildConstraint");

const verifyConfig = ({ directories, organisations, access }) => {
  const verifyBlock = (block, name) => {
    if (!block) {
      throw new Error(`Must provide ${name} config`);
    }
    if (!block.service) {
      throw new Error(`${name}.service must be specified`);
    }
    if (!block.service.url) {
      throw new Error(`${name}.service.url must be specified`);
    }
    if (!block.service.auth) {
      throw new Error(`${name}.service.auth must be specified`);
    }
  };

  verifyBlock(directories, "directories");
  verifyBlock(organisations, "organisations");
  verifyBlock(access, "access");
};

const chunkArray = (array, size) =>
  Array.from({ length: Math.ceil(array.length / size) }, (_, index) =>
    array.slice(index * size, index * size + size),
  );

const getPolicies = async (clients, serviceId, correlationId) => {
  const policies = await clients.access.getPoliciesForService(
    serviceId,
    correlationId,
  );
  return policies || [];
};

const extractFieldsFromUser = (model, parentPath) => {
  const keys = Object.keys(model);
  const assertionValues = [];

  keys.forEach((key) => {
    const path = parentPath ? `${parentPath}.${key}` : key;
    const modelValue = model[key];
    if (modelValue instanceof Object && !(modelValue instanceof Array)) {
      const subValues = extractFieldsFromUser(modelValue, path);
      assertionValues.push(...subValues);
    } else if (!(modelValue instanceof Array)) {
      assertionValues.push({
        path,
        value: (modelValue === null || modelValue === undefined
          ? ""
          : modelValue
        ).toString(),
      });
    } else if (modelValue instanceof Array) {
      modelValue.forEach((item) => {
        if (item instanceof Object) {
          const subValues = extractFieldsFromUser(item, path);
          assertionValues.push(...subValues);
        } else {
          assertionValues.push({
            path,
            value: (item || "").toString(),
          });
        }
      });
    }
  });

  return assertionValues;
};

const isConditionFulfilled = (condition, userFields) => {
  const actual = userFields.filter((x) => x.path === condition.field);
  const matchValue = condition.operator === "is";
  const match =
    actual &&
    actual.length > 0 &&
    condition.value.find((x) =>
      actual.find((y) => y.value.toLowerCase() === x.toLowerCase()),
    );
  return match ? matchValue : !matchValue;
};

const applyPoliciesToUser = (user, policies, constraints) => {
  const policiesAppliedForUser = [];
  let rolesAvailableToUser = [];
  const userFields = extractFieldsFromUser(user);

  policies.forEach((policy) => {
    let policyConditionsFulfilled = true;
    for (
      let i = 0;
      i < policy.conditions.length && policyConditionsFulfilled;
      i += 1
    ) {
      policyConditionsFulfilled = isConditionFulfilled(
        policy.conditions[i],
        userFields,
      );
    }
    if (policyConditionsFulfilled) {
      policiesAppliedForUser.push(policy);
      policy.roles.forEach((role) => {
        if (!rolesAvailableToUser.find((x) => x.id === role.id)) {
          rolesAvailableToUser.push(role);
        }
      });
    }
  });

  let hasChanged = true;
  while (hasChanged) {
    hasChanged = false;
    const roleInViolationOfConstraints = constraints.apply(
      rolesAvailableToUser.map((x) => x.id),
    );
    if (roleInViolationOfConstraints.length > 0) {
      rolesAvailableToUser = rolesAvailableToUser.filter(
        (r) => !roleInViolationOfConstraints.find((x) => r.id === x),
      );
      hasChanged = true;
    }
  }

  return {
    policiesAppliedForUser,
    rolesAvailableToUser,
    serviceAvailableToUser:
      rolesAvailableToUser.length > 0 || constraints.length === 0,
  };
};

const getAndWrapConstraintsForService = async (
  serviceId,
  roles,
  correlationId,
  clients,
  selectedRoleIds,
) => {
  const service = await clients.applications.getService(
    serviceId,
    correlationId,
  );
  const serviceParams = service.relyingParty.params
    ? service.relyingParty.params
    : {};
  const constraints = [];

  let roleSelectionConstraint = serviceParams["roleSelectionConstraint"];
  if (roleSelectionConstraint && selectedRoleIds) {
    let roleIds = roleSelectionConstraint.split(",").map((role) => role.trim());
    let roleFoundCount = 0;
    let roleFoundNames = [];
    roleIds.forEach((roleId) => {
      if (selectedRoleIds.includes(roleId)) {
        let restrictedRoleName = roles
          .filter((rid) => rid.id == roleId)
          .map((obj) => obj.name);
        roleFoundNames.push(...restrictedRoleName);
        roleFoundCount += 1;
      }
    });

    if (roleFoundCount >= 2) {
      constraints.push(
        new SelectionConstraint(roleFoundNames[0], roleFoundNames[1]),
      );
    }
  }

  const requiredMinimumConstraint = serviceParams["minimumRolesRequired"];
  if (requiredMinimumConstraint) {
    constraints.push(new MinimumConstraint(requiredMinimumConstraint));
  }

  const requiredMaximumConstraint = serviceParams["maximumRolesAllowed"];
  if (requiredMaximumConstraint) {
    constraints.push(new MaximumConstraint(requiredMaximumConstraint));
  }

  const requiredParentChildConstraint = serviceParams["requireParentChild"];
  if (requiredParentChildConstraint) {
    constraints.push(new ParentChildConstraint(roles));
  }

  return {
    constraints,
    length: constraints.length,
    apply: function (availableRoles) {
      if (this.constraints.length === 0) {
        return [];
      }

      const allResults = [];
      this.constraints.forEach((constraint) => {
        const constraintResults = constraint.apply(availableRoles);
        if (constraintResults.length > 0) {
          allResults.push(...constraintResults);
        }
      });
      return allResults;
    },
    validate: function (selections) {
      if (this.constraints.length === 0) {
        return [];
      }

      const allResults = [];
      this.constraints.forEach((constraint) => {
        const constraintResults = constraint.validate(selections);
        if (constraintResults.length > 0) {
          allResults.push(...constraintResults);
        }
      });
      return allResults;
    },
  };
};

const getServiceInformation = async (
  serviceId,
  clients,
  correlationId,
  selectedRoleIds,
) => {
  const [roles, policies] = await Promise.all([
    clients.access.getRolesForService(serviceId, correlationId),
    getPolicies(clients, serviceId, correlationId),
  ]);

  return {
    id: serviceId,
    roles,
    policies,
    constraints: await getAndWrapConstraintsForService(
      serviceId,
      roles,
      correlationId,
      clients,
      selectedRoleIds,
    ),
  };
};

const getServicesInformation = async (
  serviceIds,
  clients,
  correlationId,
  selectedRoleIds,
) => {
  const serviceChunks = chunkArray(serviceIds, 3);

  const serviceInformation = [];
  for (const chunk of serviceChunks) {
    serviceInformation.push(
      ...(await Promise.all(
        chunk.map(
          async (serviceId) =>
            await getServiceInformation(
              serviceId,
              clients,
              correlationId,
              selectedRoleIds,
            ),
        ),
      )),
    );
  }

  return serviceInformation;
};

const buildUserDetails = async (
  userId,
  organisationId,
  clients,
  correlationId,
) => {
  if (!userId) {
    return {
      sub: "",
      given_name: "",
      family_name: "",
      email: "",
      status: -1,
      organisation: await clients.organisations.getOrganisation(
        organisationId,
        correlationId,
      ),
      roles: [],
    };
  }

  const user = await clients.directories.getUserById(userId, correlationId);
  const userOrganisations = await clients.organisations.getUserOrganisations(
    userId,
    correlationId,
  );
  const userAccessToSpecifiedOrganisation = userOrganisations.find(
    (x) => x.organisation.id.toLowerCase() === organisationId.toLowerCase(),
  );
  if (userAccessToSpecifiedOrganisation) {
    user.organisation = userAccessToSpecifiedOrganisation.organisation;
    user.organisation.role = userAccessToSpecifiedOrganisation.role;
  }

  return {
    ...user,
    id: user.sub,
  };
};

const getUserServicesAccess = async (
  userId,
  organisationId,
  serviceIds,
  clients,
  correlationId,
) => {
  if (!userId) {
    return new Array(serviceIds.length).fill([]);
  }

  const serviceAccess = [];
  const serviceChunks = chunkArray(serviceIds, 10);
  for (const chunk of serviceChunks) {
    serviceAccess.push(
      ...(await Promise.all(
        chunk.map(
          async (serviceId) =>
            (await clients.access.getUserAccessToServiceAtOrganisation(
              userId,
              organisationId,
              serviceId,
              correlationId,
            ).roles) || [],
        ),
      )),
    );
  }

  return serviceAccess;
};

class PolicyEngine {
  constructor({ directories, organisations, access, applications }) {
    const config = {
      directories,
      organisations,
      access,
      applications,
    };
    verifyConfig(config);

    this._config = config;
    this._clients = {
      directories: new DirectoriesClient(directories),
      organisations: new OrganisationsClient(organisations),
      access: new AccessClient(access),
      applications: new ApplicationsClient(applications),
    };
  }

  async getPolicyApplicationResultsForUser(
    userId,
    organisationId,
    serviceIds,
    correlationId,
  ) {
    const serviceInfo = await getServicesInformation(
      serviceIds,
      this._clients,
      correlationId,
    );
    const servicesWithPolicies = [];
    const servicesWithoutPolicies = [];
    serviceInfo.forEach((service) => {
      service.policies.length === 0
        ? servicesWithoutPolicies.push(service)
        : servicesWithPolicies.push(service);
    });

    const policyResults = servicesWithoutPolicies.map((service) => ({
      id: service.id,
      policiesAppliedForUser: [],
      rolesAvailableToUser: service.roles,
      serviceAvailableToUser: true,
    }));
    if (servicesWithPolicies.length > 0) {
      const user = await buildUserDetails(
        userId,
        organisationId,
        this._clients,
        correlationId,
      );
      const userAccess = await getUserServicesAccess(
        userId,
        organisationId,
        servicesWithPolicies.map((service) => service.id),
        this._clients,
        correlationId,
      );
      policyResults.push(
        ...servicesWithPolicies.map((service, index) => {
          const userClone = JSON.parse(JSON.stringify(user));
          userClone.roles = userAccess[index];
          return {
            id: service.id,
            ...applyPoliciesToUser(
              userClone,
              service.policies,
              service.constraints,
            ),
          };
        }),
      );
    }

    return policyResults;
  }

  async validate(
    userId,
    organisationId,
    serviceId,
    selectedRoleIds,
    correlationId,
  ) {
    const serviceInfo = await getServiceInformation(
      serviceId,
      this._clients,
      correlationId,
      selectedRoleIds,
    );

    let policyResult = {
      policiesAppliedForUser: [],
      rolesAvailableToUser: serviceInfo.roles,
      serviceAvailableToUser: true,
    };
    if (serviceInfo.policies.length > 0) {
      const user = await buildUserDetails(
        userId,
        organisationId,
        this._clients,
        correlationId,
      );
      user.roles = userId
        ? (await this._clients.access.getUserAccessToServiceAtOrganisation(
            userId,
            organisationId,
            serviceInfo.id,
            correlationId,
          ).roles) || []
        : [];
      policyResult = applyPoliciesToUser(
        user,
        serviceInfo.policies,
        serviceInfo.constraints,
      );
    }

    const selectedRolesNotAvailableToUser = selectedRoleIds.filter(
      (rid) =>
        !policyResult.rolesAvailableToUser.find(
          (r) => r.id.toLowerCase() === rid.toLowerCase(),
        ),
    );
    if (selectedRolesNotAvailableToUser.length > 0) {
      return [
        {
          message: `Roles have been selected that are not available to the user`,
          appliesTo: selectedRolesNotAvailableToUser,
        },
      ];
    }

    return serviceInfo.constraints.validate(selectedRoleIds);
  }
}

module.exports = PolicyEngine;
