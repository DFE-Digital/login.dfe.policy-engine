const Constraint = require('./Constraint');

class ParentChildConstraint extends Constraint {
  constructor(applicationRoles) {
    super();

    this._applicationRoles = applicationRoles || [];
    this._childRoles = this._applicationRoles.filter(r => r.parentId);
    this._parentRoles = this._applicationRoles.filter(r => this._childRoles.find(c => c.parentId === r.id));
  }

  validate(selections) {
    const parentSelections = this._parentRoles.filter(r => selections.find(s => s.toLowerCase() === r.id.toLowerCase()));
    const childSelections = this._childRoles.filter(r => selections.find(s => s.toLowerCase() === r.id.toLowerCase()));
    const result = [];

    const parentsWithoutChildren = parentSelections.filter(p => !childSelections.find(c => c.parentId === p.id));
    if (parentsWithoutChildren.length > 0) {
      result.push({
        constraint: 'ParentChildConstraint',
        message: 'A parent cannot be selected without a child',
        appliesTo: parentsWithoutChildren.map(p => p.id),
      });
    }

    const childrenWithoutParents = childSelections.filter(c => !parentSelections.find(p => c.parentId === p.id));
    if (childrenWithoutParents.length > 0) {
      result.push({
        constraint: 'ParentChildConstraint',
        message: 'A child cannot be selected without a parent',
        appliesTo: childrenWithoutParents.map(c => c.id),
      });
    }

    return result;
  }
}

module.exports = ParentChildConstraint;
