import { createApp } from 'vue';
import { SonataApp, provideCutterEngine, DesktopLocalEngine } from '@sonata/ui';

const app = createApp(SonataApp);

provideCutterEngine(new DesktopLocalEngine());

app.mount('#app');
