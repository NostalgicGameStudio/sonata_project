import { createApp } from 'vue';
import { SonataApp, provideCutterEngine, WebApiEngine } from '@sonata/ui';

const app = createApp(SonataApp);

// Injeta explicitamente o adapter Web API apontando para a API Django Ninja
provideCutterEngine(new WebApiEngine('/api/v1'));

app.mount('#app');
