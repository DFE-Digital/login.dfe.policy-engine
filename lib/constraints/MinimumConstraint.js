const Constraint = require('./Constraint');

class MinimumConstraint extends Constraint {
  constructor(minimumNumberOfRoles) {
    super();

    this._minimumNumberOfRoles = minimumNumberOfRoles;
  }

  apply(availableRoles) {
    return availableRoles.length < this._minimumNumberOfRoles ? availableRoles : [];
  }

  validate(selections) {
    if (selections.length < this._minimumNumberOfRoles) {
      return [{
        constraint: 'MinimumConstraint',
        message: `At least ${this._minimumNumberOfRoles} ${this._minimumNumberOfRoles.length === 1 ? 'role' : 'roles'} must be selected`,
        appliesTo: selections,
      }];
    }
    return [];
  }
}

module.exports = MinimumConstraint;
