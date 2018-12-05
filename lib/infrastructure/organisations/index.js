const ApiClient = require('./../ApiClient');

class OrganisationsClient extends ApiClient {
  async getUserOrganisations(userId, correlationId) {
    return this._callApi(`/organisations/v2/associated-with-user/${userId}`, correlationId);
  }
  async getOrganisation(organisationId, correlationId) {
    return this._callApi(`/organisations/v2/${organisationId}`, correlationId);
  }
}
module.exports = OrganisationsClient;