module.exports = function override(config, env) {
  // Add fallback for path module
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "path": require.resolve("path-browserify")
  };
  return config;
};