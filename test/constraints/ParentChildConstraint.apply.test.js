const ParentChildConstraint = require('./../../lib/constraints/ParentChildConstraint');

describe('when validating selected roles against parent/child constraint', () => {
  let constraint = new ParentChildConstraint([
    { id: 'parent-1', name: 'Parent One', parent: undefined },
    { id: 'child-1a', name: 'Child One A', parent: {id:'parent-1'} },
    { id: 'standalone-1', name: 'Standalone One', parent: undefined },
  ]);

  it('then it should not return exceptions if both a parent and a child are selected', () => {
    const availableRoles = ['parent-1', 'child-1a'];

    const actual = constraint.apply(availableRoles);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(0);
  });

  it('then it should return exceptions if a parent is available without a child', () => {
    const availableRoles = ['parent-1'];

    const actual = constraint.apply(availableRoles);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(1);
    expect(actual[0]).toBe('parent-1');
  });

  it('then it should return exceptions if a child is available without a parent', () => {
    const availableRoles = ['child-1a'];

    const actual = constraint.apply(availableRoles);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(1);
    expect(actual[0]).toBe('child-1a');
  });

  it('then it should not return exceptions if a role with no parent or children is available', () => {
    const availableRoles = ['standalone-1'];

    const actual = constraint.apply(availableRoles);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(0);
  });
});
