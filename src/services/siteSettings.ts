import api from './api';
import type {SiteSettings} from '../../shared/siteSettings';
export const siteSettingsService={
 get:async()=>(await api.get<SiteSettings>('/api/site-settings')).data,
 manage:async()=>(await api.get<SiteSettings>('/api/site-settings/management')).data,
 save:async(value:SiteSettings)=>(await api.put<SiteSettings>('/api/site-settings/management',value)).data,
};
