const { openApiToBruno } = require('@usebruno/converters');

const hasPaths = (spec) => (
  spec
  && typeof spec === 'object'
  && spec.paths
  && typeof spec.paths === 'object'
);

const getApiSpecKind = (spec) => {
  if (!hasPaths(spec)) {
    return null;
  }

  if (typeof spec.openapi === 'string' && spec.openapi.startsWith('3.')) {
    return 'openapi3';
  }

  if (typeof spec.swagger === 'string' && spec.swagger.startsWith('2')) {
    return 'swagger2';
  }

  return null;
};

const isSupportedApiSpecForSync = (spec) => Boolean(getApiSpecKind(spec));

const getUnsupportedApiSpecMessage = () => (
  'The source does not contain a valid OpenAPI 3.x or Swagger 2.0 specification'
);

const convertApiSpecToBruno = (spec, options = {}) => openApiToBruno(spec, options);

module.exports = {
  getApiSpecKind,
  isSupportedApiSpecForSync,
  getUnsupportedApiSpecMessage,
  convertApiSpecToBruno
};
