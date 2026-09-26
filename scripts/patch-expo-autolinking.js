/**
 * Patch para preservar letras de unidade virtual (subst) no Windows durante o autolinking do Expo.
 * No Windows, fs.promises.realpath resolve unidades virtuais para o caminho físico (C:\...),
 * o que gera incompatibilidade com o Gradle (erro: "this and base files have different roots").
 */
const fs = require('fs');
const path = require('path');

// No-op em Linux, macOS e ambientes de CI (como EAS Build ou GitHub Actions)
if (process.platform !== 'win32') {
  process.exit(0);
}

const expoAutolinkingPath = path.resolve(__dirname, '../node_modules/expo/bin/autolinking');
const expoModulesUtilsPath = path.resolve(__dirname, '../node_modules/expo-modules-autolinking/build/utils.js');

const patchCode = `const fs = require('fs');
if (process.platform === 'win32') {
  fs.promises.realpath = async (p) => fs.realpathSync(p);
}
`;

try {
  if (fs.existsSync(expoAutolinkingPath)) {
    let content = fs.readFileSync(expoAutolinkingPath, 'utf8');
    if (!content.includes('fs.promises.realpath')) {
      content = patchCode + content;
      fs.writeFileSync(expoAutolinkingPath, content, 'utf8');
      console.log('✅ [patch-expo-autolinking] node_modules/expo/bin/autolinking patched successfully.');
    }
  }

  if (fs.existsSync(expoModulesUtilsPath)) {
    let content = fs.readFileSync(expoModulesUtilsPath, 'utf8');
    if (content.includes('return await fs_1.default.promises.realpath(target);')) {
      content = content.replace(
        'return await fs_1.default.promises.realpath(target);',
        'return fs_1.default.realpathSync(target);'
      );
      fs.writeFileSync(expoModulesUtilsPath, content, 'utf8');
      console.log('✅ [patch-expo-autolinking] node_modules/expo-modules-autolinking/build/utils.js patched successfully.');
    }
  }
} catch (err) {
  console.warn('⚠️ [patch-expo-autolinking] Could not apply patch:', err.message);
}
