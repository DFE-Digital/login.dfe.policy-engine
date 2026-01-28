const MinimumConstraint = require("./constraints/MinimumConstraint");
const MaximumConstraint = require("./constraints/MaximumConstraint");
const SelectionConstraint = require("./constraints/SelectionConstraint");
const ParentChildConstraint = require("./constraints/ParentChildConstraint");
const { setupApi } = require("login.dfe.api-client/api/setup");
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

const getPolicies = async (serviceId) => {
  const policies = await getServicePoliciesRaw({ serviceId });
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
  selectedRoleIds,
) => {
  const service = await getServiceRaw({ by: { serviceId } });
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

const getServiceInformation = async (serviceId, selectedRoleIds) => {
  const [roles, policies] = await Promise.all([
    getServiceRolesRaw({ serviceId }),
    getPolicies(serviceId),
  ]);

  return {
    id: serviceId,
    roles,
    policies,
    constraints: await getAndWrapConstraintsForService(
      serviceId,
      roles,
      selectedRoleIds,
    ),
  };
};

const getServicesInformation = async (serviceIds, selectedRoleIds) => {
  const serviceChunks = chunkArray(serviceIds, 3);

  const serviceInformation = [];
  for (const chunk of serviceChunks) {
    serviceInformation.push(
      ...(await Promise.all(
        chunk.map(
          async (serviceId) =>
            await getServiceInformation(serviceId, selectedRoleIds),
        ),
      )),
    );
  }

  return serviceInformation;
};

const buildUserDetails = async (userId, organisationId) => {
  if (!userId) {
    return {
      sub: "",
      given_name: "",
      family_name: "",
      email: "",
      status: -1,
      organisation: await getOrganisationRaw({ by: { organisationId } }),
      roles: [],
    };
  }

  const user = await getUserRaw({ by: { id: userId } });
  const userOrganisations = await getUserOrganisationsRaw({ userId });
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

const getUserServicesAccess = async (userId, organisationId, serviceIds) => {
  if (!userId) {
    return new Array(serviceIds.length).fill([]);
  }

  const serviceAccess = [];
  const serviceChunks = chunkArray(serviceIds, 10);
  for (const chunk of serviceChunks) {
    serviceAccess.push(
      ...(await Promise.all(
        chunk.map(async (serviceId) => {
          const userServiceAccess = await getUserServiceRaw({
            userId,
            serviceId,
            organisationId,
          });
          return userServiceAccess ? userServiceAccess.roles : [];
        }),
      )),
    );
  }

  return serviceAccess;
};

class PolicyEngine {
  constructor({ directories, organisations, access, applications }, options) {
    verifyConfig({ directories, organisations, access, applications });

    const { registerApiClient = false } = options ?? {};

    if (registerApiClient === false) {
      return;
    }

    setupApi({
      auth: {
        tenant: directories.service.auth.tenant,
        authorityHostUrl: directories.service.auth.authorityHostUrl,
        clientId: directories.service.auth.clientId,
        clientSecret: directories.service.auth.clientSecret,
        resource: directories.service.auth.resource,
      },
      api: {
        directories: {
          baseUri: directories.service.url,
        },
        organisations: {
          baseUri: organisations.service.url,
        },
        applications: {
          baseUri: applications.service.url,
        },
        access: {
          baseUri: access.service.url,
        },
      },
    });
  }

  async getPolicyApplicationResultsForUser(userId, organisationId, serviceIds) {
    const serviceInfo = await getServicesInformation(serviceIds, undefined);
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
      const user = await buildUserDetails(userId, organisationId);
      const userAccess = await getUserServicesAccess(
        userId,
        organisationId,
        servicesWithPolicies.map((service) => service.id),
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

  async validate(userId, organisationId, serviceId, selectedRoleIds) {
    const serviceInfo = await getServiceInformation(serviceId, selectedRoleIds);

    let policyResult = {
      policiesAppliedForUser: [],
      rolesAvailableToUser: serviceInfo.roles,
      serviceAvailableToUser: true,
    };
    if (serviceInfo.policies.length > 0) {
      const user = await buildUserDetails(userId, organisationId);
      const userAccess = userId
        ? await getUserServiceRaw({ userId, serviceId, organisationId })
        : undefined;
      user.roles = userAccess ? userAccess.roles : [];
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
