const ApiClient = require('./../ApiClient');

class OrganisationsClient extends ApiClient {
  async getUserOrganisations(userId, correlationId) {
    return this._callApi(`/organisations/v2/associated-with-user/${userId}`, correlationId);
  }
}
module.exports = OrganisationsClient;