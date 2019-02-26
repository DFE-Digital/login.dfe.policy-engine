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
        message: `Expected a maximum of ${this._maximumNumberOfRoles} roles to be selected but received ${selections.length} selected roles`,
        appliesTo: selections,
      }];
    }
    return [];
  }
}

module.exports = MaximumConstraint;
