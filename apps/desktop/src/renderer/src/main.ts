import { createApp } from 'vue';
import { SonataApp, provideCutterEngine, DesktopLocalEngine } from '@sonata/ui';

const app = createApp(SonataApp);

// Injeta explicitamente o adapter Desktop Local (Processamento 100% offline via IPC)
provideCutterEngine(new DesktopLocalEngine());

app.mount('#app');
