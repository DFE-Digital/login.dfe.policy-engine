const Constraint = require('./Constraint');

class ParentChildConstraint extends Constraint {
  constructor(applicationRoles) {
    super();

    this._applicationRoles = applicationRoles || [];
    this._childRoles = this._applicationRoles.filter(r => r.parent !== undefined);
    this._parentRoles = this._applicationRoles.filter(r => this._childRoles.find(c => c.parent.id === r.id));
  }

  apply(availableRoles) {
    const parentSelections = this._parentRoles.filter(r => availableRoles.find(s => s.toLowerCase() === r.id.toLowerCase()));
    const childSelections = this._childRoles.filter(r => availableRoles.find(s => s.toLowerCase() === r.id.toLowerCase()));
    const result = [];

    const parentsWithoutChildren = parentSelections.filter(p => !childSelections.find(c => c.parent ? c.parent.id : undefined === p.id));
    if (parentsWithoutChildren.length > 0) {
      result.push(...parentsWithoutChildren.map(p => p.id));
    }

    const childrenWithoutParents = childSelections.filter(c => !parentSelections.find(p => c.parent ? c.parent.id : undefined === p.id));
    if (childrenWithoutParents.length > 0) {
      result.push(...childrenWithoutParents.map(c => c.id));
    }

    return result;
  }

  validate(selections) {
    const parentSelections = this._parentRoles.filter(r => selections.find(s => s.toLowerCase() === r.id.toLowerCase()));
    const childSelections = this._childRoles.filter(r => selections.find(s => s.toLowerCase() === r.id.toLowerCase()));
    const result = [];

    const parentsWithoutChildren = parentSelections.filter(p => !childSelections.find(c => c.parent ? c.parent.id : undefined === p.id));
    if (parentsWithoutChildren.length > 0) {
      result.push({
        constraint: 'ParentChildConstraint',
        message: 'A parent cannot be selected without a child',
        appliesTo: parentsWithoutChildren.map(p => p.id),
      });
    }

    const childrenWithoutParents = childSelections.filter(c => !parentSelections.find(p => c.parent ? c.parent.id : undefined === p.id));
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
