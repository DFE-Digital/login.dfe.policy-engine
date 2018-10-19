const ApiClient = require('./../ApiClient');

class AccessClient extends ApiClient {
  async getUserAccessToServiceAtOrganisation(userId, organisationId, serviceId, correlationId) {
    return this._callApi(`/users/${userId}/services/${serviceId}/organisations/${organisationId}`, correlationId);
  }
}
module.exports = AccessClient;