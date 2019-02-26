const DirectoriesClient = require('./infrastructure/directories');
const OrganisationsClient = require('./infrastructure/organisations');
const AccessClient = require('./infrastructure/access');
const ApplicationsClient = require('./infrastructure/applications');
const MinimumConstraint = require('./constraints/MinimumConstraint');
const MaximumConstraint = require('./constraints/MaximumConstraint');
const ParentChildConstraint = require('./constraints/ParentChildConstraint');
const except = require('lodash/');

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

  verifyBlock(directories, 'directories');
  verifyBlock(organisations, 'organisations');
  verifyBlock(access, 'access');
};
const deepClone = (object) => {
  return JSON.parse(JSON.stringify(object)); // TODO: Make this more performant
};

const getPolicies = async (clients, serviceId, correlationId) => {
  const policies = await clients.access.getPoliciesForService(serviceId, correlationId);
  return policies || [];
};
const buildUserDetails = async (clients, userId, organisationId, serviceId, correlationId) => {
  if (!userId) {
    const organisation = await clients.organisations.getOrganisation(organisationId, correlationId);
    return {
      sub: '',
      given_name: '',
      family_name: '',
      email: '',
      status: -1,
      organisation,
      roles: [],
    };
  }

  const user = await clients.directories.getUserById(userId, correlationId);
  const userOrganisations = await clients.organisations.getUserOrganisations(userId, correlationId);
  const userAccessToSpecifiedOrganisation = userOrganisations.find(x => x.organisation.id.toLowerCase() === organisationId.toLowerCase());
  const userAccessToServiceAtOrganisation = await clients.access.getUserAccessToServiceAtOrganisation(userId, organisationId, serviceId, correlationId);

  const userDetails = deepClone(user);
  userDetails.id = user.sub;
  if (userAccessToSpecifiedOrganisation) {
    userDetails.organisation = deepClone(userAccessToSpecifiedOrganisation.organisation);
    userDetails.organisation.role = deepClone(userAccessToSpecifiedOrganisation.role);
  }
  userDetails.roles = userAccessToServiceAtOrganisation ? (userAccessToServiceAtOrganisation.roles || []) : [];

  return userDetails;
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
        value: (modelValue === null || modelValue === undefined ? '' : modelValue).toString(),
      });
    } else if (modelValue instanceof Array) {
      modelValue.forEach((item) => {
        if (item instanceof Object) {
          const subValues = extractFieldsFromUser(item, path);
          assertionValues.push(...subValues);
        } else {
          assertionValues.push({
            path,
            value: (item || '').toString(),
          });
        }
      });
    }
  });

  return assertionValues;
};
const isConditionFulfilled = (condition, userFields) => {
  const actual = userFields.filter(x => x.path === condition.field);
  const matchValue = condition.operator === 'is';
  const match = actual && actual.length > 0 && condition.value.find(x => actual.find(y => y.value.toLowerCase() === x.toLowerCase()));
  return match ? matchValue : !matchValue;
};
const applyPoliciesToUser = (user, policies, constraints) => {
  const policiesAppliedForUser = [];
  let rolesAvailableToUser = [];
  const userFields = extractFieldsFromUser(user);

  policies.forEach((policy) => {
    let policyConditionsFulfilled = true;
    for (let i = 0; i < policy.conditions.length && policyConditionsFulfilled; i += 1) {
      policyConditionsFulfilled = isConditionFulfilled(policy.conditions[i], userFields);
    }
    if (policyConditionsFulfilled) {
      policiesAppliedForUser.push(policy);
      policy.roles.forEach((role) => {
        if (!rolesAvailableToUser.find(x => x.id === role.id)) {
          rolesAvailableToUser.push(role);
        }
      });
    }
  });

  let hasChanged = true;
  while (hasChanged) {
    hasChanged = false;
    const roleInViolationOfConstraints = constraints.apply(rolesAvailableToUser.map(x => x.id));
    if (roleInViolationOfConstraints.length > 0) {
      rolesAvailableToUser = rolesAvailableToUser.filter(r => !roleInViolationOfConstraints.find(x => r.id === x));
      hasChanged = true;
    }
  }

  return {
    policiesAppliedForUser,
    rolesAvailableToUser,
    serviceAvailableToUser: rolesAvailableToUser.length > 0 || constraints.length === 0,
  };
};
const getAndApplyPoliciesToUser = async (userId, organisationId, serviceId, correlationId, roles, constraints, clients) => {
  const policies = await getPolicies(clients, serviceId, correlationId);
  if (policies.length === 0) {
    return {
      policiesAppliedForUser: [],
      rolesAvailableToUser: roles,
    };
  }

  const user = await buildUserDetails(clients, userId, organisationId, serviceId, correlationId);
  return applyPoliciesToUser(user, policies, constraints);
};
const getAndWrapConstraintsForService = async (serviceId, roles, correlationId, clients) => {
  const service = await clients.applications.getService(serviceId, correlationId);
  const serviceParams = service.relyingParty.params ? service.relyingParty.params : {};
  const constraints = [];

  const requiredMinimumConstraint = serviceParams['minimumRolesRequired'];
  if (requiredMinimumConstraint) {
    constraints.push(new MinimumConstraint(requiredMinimumConstraint));
  }

  const requiredMaximumConstraint = serviceParams['maximumRolesAllowed'];
  if (requiredMaximumConstraint) {
    constraints.push(new MaximumConstraint(requiredMaximumConstraint));
  }

  const requiredParentChildConstraint = serviceParams['requireParentChild'];
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

  async getPolicyApplicationResultsForUser(userId, organisationId, serviceId, correlationId) {
    const roles = await this._clients.access.getRolesForService(serviceId, correlationId);
    const constraints = await getAndWrapConstraintsForService(serviceId, roles, correlationId, this._clients);

    return getAndApplyPoliciesToUser(userId, organisationId, serviceId, correlationId, roles, constraints, this._clients);
  }

  async validate(userId, organisationId, serviceId, selectedRoleIds, correlationId) {
    const roles = await this._clients.access.getRolesForService(serviceId, correlationId);
    const constraints = await getAndWrapConstraintsForService(serviceId, roles, correlationId, this._clients);

    const policyResult = await getAndApplyPoliciesToUser(userId, organisationId, serviceId, correlationId, roles, constraints, this._clients);
    const selectedRolesNotAvailableToUser = selectedRoleIds.filter(rid => !policyResult.rolesAvailableToUser.find(r => r.id.toLowerCase() === rid));
    if (selectedRolesNotAvailableToUser.length > 0) {
      return [{
        message: `Roles have been selected that are not available to the user`,
        appliesTo: selectedRolesNotAvailableToUser,
      }]
    }

    return constraints.validate(selectedRoleIds);
  }
}

module.exports = PolicyEngine;
