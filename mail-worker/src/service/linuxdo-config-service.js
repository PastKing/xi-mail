import oauthConfigService from './oauth-config-service';

// Existing LinuxDo callers use the same configuration store.
export default {
  get: c => oauthConfigService.get(c, 'linuxdo'),
  require: c => oauthConfigService.require(c, 'linuxdo'),
  save: (c, params) => oauthConfigService.save(c, params, 'linuxdo'),
};