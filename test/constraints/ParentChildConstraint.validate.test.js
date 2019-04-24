const ParentChildConstraint = require('./../../lib/constraints/ParentChildConstraint');

describe('when validating selected roles against parent/child constraint', () => {
  let constraint = new ParentChildConstraint([
    { id: 'parent-1', name: 'Parent One', parent: undefined },
    { id: 'child-1a', name: 'Child One A', parent: { id: 'parent-1' } },
    { id: 'standalone-1', name: 'Standalone One', parent: undefined },
  ]);

  it('then it should not return exceptions if both a parent and a child are selected', () => {
    const selections = ['parent-1', 'child-1a'];

    const actual = constraint.validate(selections);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(0);
  });

  it('then it should return exceptions if a parent is selected without a child', () => {
    const selections = ['parent-1'];

    const actual = constraint.validate(selections);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(1);
    expect(actual[0]).toMatchObject({
      constraint: 'ParentChildConstraint',
      message: 'A parent role cannot be selected without at least one child role selected',
      appliesTo: ['parent-1'],
    });
  });

  it('then it should return exceptions if a child is selected without a parent', () => {
    const selections = ['child-1a'];

    const actual = constraint.validate(selections);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(1);
    expect(actual[0]).toMatchObject({
      constraint: 'ParentChildConstraint',
      message: 'A child role cannot be selected without a parent role selected',
      appliesTo: ['child-1a'],
    });
  });

  it('then it should not return exceptions if a role with no parent or children is selected', () => {
    const selections = ['standalone-1'];

    const actual = constraint.validate(selections);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(0);
  });
});
