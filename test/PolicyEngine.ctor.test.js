const PolicyEngine = require('./../lib');

const correctConfig = {
  directories: {
    service: {
      url: 'https://directories.test',
      auth: {
        type: 'secret',
        jwt: 'some-base64',
      },
    },
  },
  organisations: {
    service: {
      url: 'https://organisations.test',
      auth: {
        type: 'secret',
        jwt: 'some-base64',
      },
    },
  },
  applications: {
    service: {
      url: 'https://applications.test',
      auth: {
        type: 'secret',
        jwt: 'some-base64',
      },
    },
  },
  access: {
    service: {
      url: 'https://access.test',
      auth: {
        type: 'secret',
        jwt: 'some-base64',
      },
    },
  },
};

describe('when creating instance of PolicyEngine', () => {
  it('then it should be created if config correct', () => {
    const actual = new PolicyEngine(correctConfig);

    expect(actual).toBeInstanceOf(PolicyEngine);
  });

  it('then it should error if config missing', () => {
    expect(() => new PolicyEngine()).toThrowError();
  });


  it('then it should error if config missing directories section', () => {
    const config = JSON.parse(JSON.stringify(correctConfig));
    config.directories = undefined;

    expect(() => new PolicyEngine(config)).toThrowError('Must provide directories config');
  });

  it('then it should error if config missing directories.service', () => {
    const config = JSON.parse(JSON.stringify(correctConfig));
    config.directories.service = undefined;

    expect(() => new PolicyEngine(config)).toThrowError('directories.service must be specified');
  });

  it('then it should error if config missing directories.service.url', () => {
    const config = JSON.parse(JSON.stringify(correctConfig));
    config.directories.service.url = undefined;

    expect(() => new PolicyEngine(config)).toThrowError('directories.service.url must be specified');
  });

  it('then it should error if config missing directories.service.auth', () => {
    const config = JSON.parse(JSON.stringify(correctConfig));
    config.directories.service.auth = undefined;

    expect(() => new PolicyEngine(config)).toThrowError('directories.service.auth must be specified');
  });


  it('then it should error if config missing organisations section', () => {
    const config = JSON.parse(JSON.stringify(correctConfig));
    config.organisations = undefined;

    expect(() => new PolicyEngine(config)).toThrowError('Must provide organisations config');
  });

  it('then it should error if config missing organisations.service', () => {
    const config = JSON.parse(JSON.stringify(correctConfig));
    config.organisations.service = undefined;

    expect(() => new PolicyEngine(config)).toThrowError('organisations.service must be specified');
  });

  it('then it should error if config missing organisations.service.url', () => {
    const config = JSON.parse(JSON.stringify(correctConfig));
    config.organisations.service.url = undefined;

    expect(() => new PolicyEngine(config)).toThrowError('organisations.service.url must be specified');
  });

  it('then it should error if config missing organisations.service.auth', () => {
    const config = JSON.parse(JSON.stringify(correctConfig));
    config.organisations.service.auth = undefined;

    expect(() => new PolicyEngine(config)).toThrowError('organisations.service.auth must be specified');
  });


  it('then it should error if config missing applications section', () => {
    const config = JSON.parse(JSON.stringify(correctConfig));
    config.applications = undefined;

    expect(() => new PolicyEngine(config)).toThrowError('Must provide applications config');
  });

  it('then it should error if config missing applications.service', () => {
    const config = JSON.parse(JSON.stringify(correctConfig));
    config.applications.service = undefined;

    expect(() => new PolicyEngine(config)).toThrowError('applications.service must be specified');
  });

  it('then it should error if config missing applications.service.url', () => {
    const config = JSON.parse(JSON.stringify(correctConfig));
    config.applications.service.url = undefined;

    expect(() => new PolicyEngine(config)).toThrowError('applications.service.url must be specified');
  });

  it('then it should error if config missing applications.service.auth', () => {
    const config = JSON.parse(JSON.stringify(correctConfig));
    config.applications.service.auth = undefined;

    expect(() => new PolicyEngine(config)).toThrowError('applications.service.auth must be specified');
  });


  it('then it should error if config missing access section', () => {
    const config = JSON.parse(JSON.stringify(correctConfig));
    config.access = undefined;

    expect(() => new PolicyEngine(config)).toThrowError('Must provide access config');
  });

  it('then it should error if config missing access.service', () => {
    const config = JSON.parse(JSON.stringify(correctConfig));
    config.access.service = undefined;

    expect(() => new PolicyEngine(config)).toThrowError('access.service must be specified');
  });

  it('then it should error if config missing access.service.url', () => {
    const config = JSON.parse(JSON.stringify(correctConfig));
    config.access.service.url = undefined;

    expect(() => new PolicyEngine(config)).toThrowError('access.service.url must be specified');
  });

  it('then it should error if config missing access.service.auth', () => {
    const config = JSON.parse(JSON.stringify(correctConfig));
    config.access.service.auth = undefined;

    expect(() => new PolicyEngine(config)).toThrowError('access.service.auth must be specified');
  });
});
