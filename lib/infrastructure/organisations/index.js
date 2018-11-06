const ApiClient = require('./../ApiClient');

class OrganisationsClient extends ApiClient {
  async getUserOrganisations(userId, correlationId) {
    return this._callApi(`/organisations/associated-with-user/${userId}`, correlationId);
  }
}
module.exports = OrganisationsClient;