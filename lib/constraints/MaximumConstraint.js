const Constraint = require('./Constraint');

class MaximumConstraint extends Constraint {
  constructor(maximumNumberOfRoles) {
    super();

    this._maximumNumberOfRoles = maximumNumberOfRoles;
  }

  validate(selections) {
    if (selections.length > this._maximumNumberOfRoles) {
      return [{
        constraint: 'MaximumConstraint',
        message: `A maximum of ${this._maximumNumberOfRoles} ${this._maximumNumberOfRoles.length === 1 ? 'role' : 'roles'} can be selected`,
        appliesTo: selections,
      }];
    }
    return [];
  }
}

module.exports = MaximumConstraint;
