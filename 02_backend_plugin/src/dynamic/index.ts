import { BackendDynamicPluginInstaller } from '@backstage/backend-plugin-manager';
import { createRouter } from '../service/router';

export const dynamicPluginInstaller: BackendDynamicPluginInstaller = {
  kind: 'legacy',
  router: {
    pluginID: 'demo',
    createPlugin(env) {
      // Return a promise to your router.
      return createRouter(env);
    },
  },
};
