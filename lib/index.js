const verifyConfig = ({ directories, organisations, applications, access }) => {
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
  verifyBlock(applications, 'applications');
  verifyBlock(access, 'access');
};

class PolicyEngine {
  constructor({ directories, organisations, applications, access }) {
    const config = {
      directories,
      organisations,
      applications,
      access,
    };
    verifyConfig(config);

    this._config = config;
  }

  async getRolesAvailableForUser(userId, organisationId, serviceId) {
    return [];
  }
}

module.exports = PolicyEngine;