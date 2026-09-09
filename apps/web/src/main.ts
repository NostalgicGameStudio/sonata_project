import { createApp } from 'vue';
import { SonataApp, provideCutterEngine, WebApiEngine } from '@sonata/ui';

const app = createApp(SonataApp);

provideCutterEngine(new WebApiEngine('/api/v1'));

app.mount('#app');
