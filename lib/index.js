const DirectoriesClient = require('./infrastructure/directories');
const OrganisationsClient = require('./infrastructure/organisations');
const AccessClient = require('./infrastructure/access');

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

const extractFieldFromUser = (user, field) => {
  const value = user[field];
  return value;
};
const isConditionFulfilled = (condition, user) => {
  const actual = extractFieldFromUser(user, condition.field);
  if (!actual) {
    return false;
  }
  const match = condition.value.find(x => x.toLowerCase() === actual.toLowerCase());
  return match ? true : false;
};
const applyPoliciesToUser = (user, policies) => {
  const rolesAvailableToUser = [];
  policies.forEach((policy) => {
    let policyConditionsFulfilled = true;
    for (let i = 0; i < policy.conditions.length && policyConditionsFulfilled; i += 1) {
      policyConditionsFulfilled = isConditionFulfilled(policy.conditions[i], user);
    }
    if (policyConditionsFulfilled) {
      policy.roles.forEach((role) => {
        if (!rolesAvailableToUser.find(x => x.id === role.id)) {
          rolesAvailableToUser.push(role);
        }
      });
    }
  });
  return rolesAvailableToUser;
};

class PolicyEngine {
  constructor({ directories, organisations, access }) {
    const config = {
      directories,
      organisations,
      access,
    };
    verifyConfig(config);

    this._config = config;
    this._clients = {
      directories: new DirectoriesClient(directories),
      organisations: new OrganisationsClient(organisations),
      access: new AccessClient(access),
    };
  }

  async getRolesAvailableForUser(userId, organisationId, serviceId, correlationId) {
    const roles = await this._clients.access.getRolesForService(serviceId, correlationId);

    const policies = await getPolicies(this._clients, serviceId, correlationId);
    if (policies.length === 0) {
      return roles;
    }

    const user = await buildUserDetails(this._clients, userId, organisationId, serviceId, correlationId);
    return applyPoliciesToUser(user, policies);
  }
}

module.exports = PolicyEngine;
