const ApiClient = require('./../ApiClient');

class AccessClient extends ApiClient {
  async getPoliciesForService(serviceId, correlationId) {
    return this._callApi(`/services/${serviceId}/policies`, correlationId);
  }

  async getUserAccessToServiceAtOrganisation(userId, organisationId, serviceId, correlationId) {
    return this._callApi(`/users/${userId}/services/${serviceId}/organisations/${organisationId}`, correlationId);
  }

  async getRolesForService(serviceId, correlationId) {
    return this._callApi(`/services/${serviceId}/roles`, correlationId);
  }

  async getConstraintsForService(serviceId, correlationId) {
    return this._callApi(`/services/${serviceId}/constraints`, correlationId);
  }
}
module.exports = AccessClient;