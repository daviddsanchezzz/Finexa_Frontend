module.exports = function (api) {
  api.cache(true);
  return {
    // 'nativewind/babel' es un PRESET (re-exporta react-native-css-interop/babel)
    // y éste añade internamente el plugin 'react-native-worklets/plugin'.
    // Por eso debe ir en 'presets', no en 'plugins'.
    presets: ['babel-preset-expo', 'nativewind/babel'],
  };
};
