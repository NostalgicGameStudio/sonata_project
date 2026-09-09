<script setup lang="ts">
import { ref, computed } from 'vue';
import type { VideoMetadata, Track, CutProgress, DownloadMode } from '@sonata/shared-types';
import { useCutterEngine } from './composables/useCutterEngine';
import { useTimestamps, secondsToTimestamp } from './composables/useTimestamps';
import { useNotifications } from './composables/useNotifications';
import UrlInput from './components/UrlInput.vue';
import TrackList from './components/TrackList.vue';
import ProgressBar from './components/ProgressBar.vue';
import ToastContainer from './components/ToastContainer.vue';
import DonationModal from './components/DonationModal.vue';

const engine = useCutterEngine();
const { parseTimestampsFromText } = useTimestamps();
const toast = useNotifications();

const showDonationModal = ref(false);

const selectedMode = ref<DownloadMode>('album');
const isAnalyzing = ref(false);
const isProcessing = ref(false);
const videoData = ref<VideoMetadata | null>(null);
const tracks = ref<Track[]>([]);
const outputFormat = ref<'mp3' | 'flac' | 'wav'>('mp3');
const currentUrl = ref('');

const progress = ref<CutProgress>({
  status: 'idle',
  percentage: 0,
  message: ''
});

const destinationDirectory = ref('');

const selectedTracksCount = computed(() => {
  return tracks.value.filter(t => t.selected).length;
});

const actionButtonText = computed(() => {
  if (selectedMode.value === 'single') return `Baixar música (${outputFormat.value.toUpperCase()})`;
  if (selectedMode.value === 'playlist') return `Baixar playlist (${selectedTracksCount.value} músicas)`;
  return `Fatiar e baixar álbum (${selectedTracksCount.value} faixas)`;
});

const handleSelectDirectory = async () => {
  if (engine.selectDirectory) {
    const selected = await engine.selectDirectory();
    if (selected) {
      destinationDirectory.value = selected;
    }
  }
};

const applyTracksForMode = (meta: VideoMetadata, mode: DownloadMode) => {
  if (mode === 'playlist' && meta.isPlaylist && meta.playlistEntries) {
    tracks.value = meta.playlistEntries.map((entry, idx) => ({
      id: entry.id,
      index: idx + 1,
      title: entry.title,
      artist: entry.author,
      durationSeconds: entry.durationSeconds,
      selected: true,
      videoUrl: entry.url
    }));
  } else if (mode === 'single') {
    const isSpotifyUrl = currentUrl.value.includes('spotify.com');
    const searchUrl = isSpotifyUrl
      ? `ytsearch1:${meta.author ? meta.author + ' - ' : ''}${meta.title}`
      : undefined;

    tracks.value = [
      {
        id: meta.id || `single-track-${Date.now()}`,
        index: 1,
        title: meta.title,
        artist: meta.author,
        durationSeconds: meta.durationSeconds,
        selected: true,
        startTime: '00:00',
        startSeconds: 0,
        endTime: secondsToTimestamp(meta.durationSeconds),
        endSeconds: meta.durationSeconds,
        videoUrl: searchUrl
      }
    ];
  } else {
    const extracted = parseTimestampsFromText(meta.rawDescription, meta.durationSeconds);
    tracks.value = extracted;
  }
};

const handleModeChange = (mode: DownloadMode) => {
  if (selectedMode.value === mode) return;
  selectedMode.value = mode;

  if (videoData.value) {
    applyTracksForMode(videoData.value, mode);
  }
};

const handleSearch = async (url: string) => {
  currentUrl.value = url;
  isAnalyzing.value = true;
  videoData.value = null;
  tracks.value = [];

  const isSpotify = url.includes('spotify.com');
  const isPlaylistUrl = url.includes('/playlist') || url.includes('/album/') || url.includes('list=');

  if (isSpotify) {
    if (url.includes('/track/')) {
      selectedMode.value = 'single';
    } else {
      selectedMode.value = 'playlist';
    }
  } else if (isPlaylistUrl && selectedMode.value !== 'single') {
    selectedMode.value = 'playlist';
  }

  try {
    const metadata = await engine.fetchMetadata(url, selectedMode.value);
    videoData.value = metadata;

    if (metadata.isPlaylist) {
      selectedMode.value = 'playlist';
    }

    applyTracksForMode(metadata, selectedMode.value);

    if (metadata.isPlaylist) {
      toast.success(`${metadata.playlistEntries?.length || 0} faixas encontradas na playlist.`, 'Playlist pronta');
    } else if (isSpotify) {
      toast.success(`Música "${metadata.title}" carregada com sucesso!`, 'Música do Spotify');
    } else if (selectedMode.value === 'album' && tracks.value.length > 0) {
      toast.success(`${tracks.value.length} faixas identificadas na descrição.`, 'Álbum carregado');
    } else if (selectedMode.value === 'single') {
      toast.success(`Música "${metadata.title}" carregada com sucesso!`, 'Música pronta');
    }
  } catch (err: any) {
    toast.error(err.message || 'Não foi possível carregar as informações do link.', 'Erro ao carregar link');
  } finally {
    isAnalyzing.value = false;
  }
};

const handleAddTrack = () => {
  const newIndex = tracks.value.length + 1;
  tracks.value.push({
    id: `custom-track-${Date.now()}`,
    index: newIndex,
    title: `Nova Faixa ${newIndex}`,
    startTime: '00:00',
    startSeconds: 0,
    selected: true
  });
};

const handleRemoveTrack = (index: number) => {
  tracks.value.splice(index, 1);
};

const startProcess = async () => {
  if (!currentUrl.value || tracks.value.length === 0) return;

  const selectedTracks = tracks.value
    .filter(t => t.selected)
    .map(t => ({
      id: t.id,
      index: t.index,
      title: t.title,
      artist: t.artist,
      startTime: t.startTime,
      startSeconds: t.startSeconds,
      endTime: t.endTime,
      endSeconds: t.endSeconds,
      durationSeconds: t.durationSeconds,
      videoUrl: t.videoUrl,
      selected: t.selected
    }));

  if (selectedTracks.length === 0) {
    toast.warning('Selecione pelo menos uma faixa para continuar.', 'Nenhuma faixa selecionada');
    return;
  }

  isProcessing.value = true;
  showDonationModal.value = true;
  progress.value = {
    status: 'downloading',
    percentage: 10,
    message: selectedMode.value === 'single'
      ? 'Baixando música...'
      : selectedMode.value === 'playlist'
      ? 'Baixando músicas da playlist...'
      : 'Baixando áudio do álbum...'
  };

  try {
    const result = await engine.processAudio(
      {
        mode: selectedMode.value,
        videoUrl: currentUrl.value,
        tracks: selectedTracks,
        outputFormat: outputFormat.value,
        destinationDirectory: destinationDirectory.value || undefined,
        albumTitle: videoData.value?.title || undefined,
        artist: videoData.value?.author || undefined
      },
      (p: CutProgress) => {
        progress.value = p;
      }
    );

    if (result.skippedTracks && result.skippedTracks.length > 0) {
      toast.warning(
        `${result.skippedTracks.length} faixas indisponíveis no YouTube foram ignoradas.`,
        'Faixas ignoradas'
      );
      toast.success(
        `${result.tracksProcessed} músicas salvas com sucesso!`,
        'Download concluído'
      );
    } else {
      toast.success(
        selectedMode.value === 'single'
          ? 'Música salva com sucesso!'
          : selectedMode.value === 'playlist'
          ? `${result.tracksProcessed} músicas da playlist foram salvas!`
          : 'Todas as faixas foram cortadas e salvas com sucesso!',
        'Concluído'
      );
    }
  } catch (err: any) {
    progress.value = {
      status: 'error',
      percentage: 0,
      message: err.message || 'Erro durante o processamento do áudio.'
    };
    toast.error(err.message || 'Erro durante o processamento do áudio.', 'Falha no processamento');
  } finally {
    isProcessing.value = false;
  }
};
</script>

<template>
  <div class="sonata-app-container">
    <header class="app-header">
      <div class="brand-row">
        <div class="brand-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
        </div>
        <h1 class="brand-title">Sonata</h1>
      </div>
      <p class="brand-subtitle">
        Baixe faixas individuais, fatie álbuns por marcações de tempo ou baixe playlists completas.
      </p>

      <div class="mode-selector-container">
        <div class="mode-tabs">
          <button
            type="button"
            class="mode-tab"
            :class="{ 'is-active': selectedMode === 'single' }"
            :disabled="isProcessing"
            @click="handleModeChange('single')"
          >
            <span class="mode-icon">🎵</span>
            <span class="mode-label">Música única</span>
          </button>

          <button
            type="button"
            class="mode-tab"
            :class="{ 'is-active': selectedMode === 'album' }"
            :disabled="isProcessing"
            @click="handleModeChange('album')"
          >
            <span class="mode-icon">💽</span>
            <span class="mode-label">Álbum completo</span>
          </button>

          <button
            type="button"
            class="mode-tab"
            :class="{ 'is-active': selectedMode === 'playlist' }"
            :disabled="isProcessing"
            @click="handleModeChange('playlist')"
          >
            <span class="mode-icon">📑</span>
            <span class="mode-label">Playlist</span>
          </button>
        </div>
      </div>
    </header>

    <main class="app-content">
      <UrlInput :loading="isAnalyzing" @search="handleSearch" />

      <section v-if="videoData" class="video-preview-card">
        <div class="thumbnail-wrapper">
          <img v-if="videoData.thumbnailUrl" :src="videoData.thumbnailUrl" :alt="videoData.title" />
          <div v-else class="empty-thumb">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
          </div>
        </div>
        <div class="video-meta">
          <div class="meta-mode-badge-row">
            <span class="meta-mode-badge" :class="selectedMode">
              {{ selectedMode === 'single' ? 'Música' : selectedMode === 'playlist' ? 'Playlist' : 'Álbum' }}
            </span>
          </div>
          <h2 class="video-title">{{ videoData.title }}</h2>
          <p class="video-author">{{ videoData.author }}</p>
          <span v-if="!videoData.isPlaylist" class="video-duration">
            Duração: {{ Math.floor(videoData.durationSeconds / 60) }}min {{ videoData.durationSeconds % 60 }}s
          </span>
          <span v-else class="video-duration">
            {{ videoData.playlistEntries?.length || 0 }} músicas na playlist
          </span>
        </div>
      </section>

      <section v-if="videoData">
        <TrackList
          :tracks="tracks"
          :mode="selectedMode"
          :duration-seconds="videoData?.durationSeconds || 0"
          :disabled="isProcessing"
          @update:tracks="newTracks => tracks = newTracks"
          @add-track="handleAddTrack"
          @remove-track="handleRemoveTrack"
        />

        <div class="options-card">
          <div class="format-select-group">
            <label>Formato:</label>
            <select v-model="outputFormat" :disabled="isProcessing">
              <option value="mp3">MP3 (320 kbps)</option>
              <option value="flac">FLAC (Lossless)</option>
              <option value="wav">WAV (Sem Compressão)</option>
            </select>
          </div>

          <div v-if="engine.isDesktop" class="directory-select-group">
            <label>Destino:</label>
            <div class="directory-picker" :class="{ disabled: isProcessing }" @click="!isProcessing && handleSelectDirectory()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span class="directory-text" :title="destinationDirectory || 'Pasta padrão (Downloads/Sonata)'">
                {{ destinationDirectory || 'Pasta padrão (Downloads/Sonata)' }}
              </span>
              <button type="button" class="change-dir-btn" :disabled="isProcessing">
                Selecionar
              </button>
            </div>
          </div>
        </div>

        <div class="action-footer">
          <div></div>
          <button
            type="button"
            class="start-button"
            :disabled="isProcessing || selectedTracksCount === 0"
            @click="startProcess"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span>{{ actionButtonText }}</span>
          </button>
        </div>

        <ProgressBar v-if="progress.status !== 'idle'" :progress="progress" />
      </section>
    </main>

    <DonationModal :show="showDonationModal" @close="showDonationModal = false" />
    <ToastContainer />
  </div>
</template>

<style scoped>
.sonata-app-container {
  max-width: 920px;
  margin: 0 auto;
  padding: 40px 24px 80px;
}

.app-header {
  text-align: center;
  margin-bottom: 28px;
}

.brand-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}

.brand-logo {
  color: var(--sonata-accent-primary);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.brand-title {
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--sonata-text-primary);
}

.brand-subtitle {
  color: var(--sonata-text-secondary);
  font-size: clamp(0.85rem, 2.5vw, 0.95rem);
  max-width: 600px;
  margin: 0 auto 20px;
  padding: 0 8px;
  line-height: 1.5;
}

.mode-selector-container {
  display: flex;
  justify-content: center;
  margin-top: 16px;
  width: 100%;
}

.mode-tabs {
  display: flex;
  background-color: var(--sonata-bg-surface);
  border: 1px solid var(--sonata-border-subtle);
  padding: 4px;
  border-radius: var(--sonata-radius-full);
  gap: 4px;
  box-shadow: var(--sonata-shadow-card);
}

.mode-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: var(--sonata-radius-full);
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--sonata-text-secondary);
  background: transparent;
  border: 1px solid transparent;
  transition: var(--sonata-transition-smooth);
  white-space: nowrap;
}

.mode-tab:hover:not(:disabled) {
  color: var(--sonata-text-primary);
  background-color: var(--sonata-bg-surface-elevated);
}

.mode-tab.is-active {
  color: var(--sonata-accent-primary);
  background-color: var(--sonata-accent-muted);
  border-color: var(--sonata-accent-muted);
  font-weight: 600;
}

.mode-icon {
  font-size: 1rem;
}

.app-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.video-preview-card {
  display: flex;
  align-items: center;
  gap: 20px;
  background-color: var(--sonata-bg-surface);
  border: 1px solid var(--sonata-border-subtle);
  border-radius: var(--sonata-radius-lg);
  padding: 16px;
  box-shadow: var(--sonata-shadow-card);
}

.thumbnail-wrapper {
  width: 140px;
  height: 85px;
  border-radius: var(--sonata-radius-md);
  overflow: hidden;
  flex-shrink: 0;
  background-color: var(--sonata-bg-input);
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.empty-thumb {
  color: var(--sonata-text-muted);
}

.video-meta {
  flex: 1;
  min-width: 0;
}

.meta-mode-badge-row {
  margin-bottom: 4px;
}

.meta-mode-badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--sonata-radius-full);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background-color: var(--sonata-bg-input);
  color: var(--sonata-text-muted);
}

.meta-mode-badge.single {
  color: #79a8d9;
  background-color: rgba(121, 168, 217, 0.12);
}

.meta-mode-badge.album {
  color: var(--sonata-accent-primary);
  background-color: var(--sonata-accent-muted);
}

.meta-mode-badge.playlist {
  color: #a8d5ba;
  background-color: rgba(168, 213, 186, 0.15);
}

.video-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--sonata-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.video-author {
  font-size: 0.88rem;
  color: var(--sonata-text-secondary);
  margin-bottom: 6px;
}

.video-duration {
  font-size: 0.8rem;
  color: var(--sonata-text-muted);
}

.options-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  background-color: var(--sonata-bg-surface);
  border: 1px solid var(--sonata-border-subtle);
  border-radius: var(--sonata-radius-lg);
  padding: 16px 20px;
  margin-top: 16px;
  box-shadow: var(--sonata-shadow-card);
}

.action-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  gap: 16px;
}

.format-select-group, .directory-select-group {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  color: var(--sonata-text-secondary);
}

.format-select-group select {
  background-color: var(--sonata-bg-input);
  color: var(--sonata-text-primary);
  border: 1px solid var(--sonata-border-subtle);
  padding: 8px 14px;
  border-radius: var(--sonata-radius-md);
  font-family: inherit;
  outline: none;
  cursor: pointer;
  transition: var(--sonata-transition-smooth);
}

.format-select-group select:focus {
  border-color: var(--sonata-border-focus);
}

.directory-picker {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: var(--sonata-bg-input);
  border: 1px solid var(--sonata-border-subtle);
  padding: 6px 12px;
  border-radius: var(--sonata-radius-md);
  cursor: pointer;
  transition: var(--sonata-transition-smooth);
  max-width: 380px;
}

.directory-picker:hover:not(.disabled) {
  border-color: var(--sonata-border-hover);
  background-color: var(--sonata-bg-surface-elevated);
}

.directory-picker.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.directory-text {
  font-size: 0.85rem;
  color: var(--sonata-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 230px;
}

.change-dir-btn {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--sonata-radius-sm);
  background-color: var(--sonata-bg-surface-elevated);
  color: var(--sonata-accent-primary);
  border: 1px solid var(--sonata-border-subtle);
  flex-shrink: 0;
}

.change-dir-btn:hover:not(:disabled) {
  background-color: var(--sonata-accent-muted);
}

.start-button {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--sonata-accent-primary);
  color: var(--sonata-text-inverse);
  font-weight: 600;
  font-size: 0.95rem;
  padding: 12px 28px;
  border-radius: var(--sonata-radius-md);
  box-shadow: var(--sonata-shadow-card);
  transition: var(--sonata-transition-smooth);
}

.start-button:hover:not(:disabled) {
  background-color: var(--sonata-accent-hover);
  transform: translateY(-1px);
}

.start-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .sonata-app-container {
    padding: 24px 16px 60px;
  }
}

@media (max-width: 640px) {
  .sonata-app-container {
    padding: 20px 12px 48px;
  }

  .mode-tabs {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border-radius: var(--sonata-radius-md);
    padding: 3px;
    gap: 3px;
  }

  .mode-tab {
    padding: 7px 4px;
    justify-content: center;
    font-size: 0.78rem;
    gap: 4px;
    border-radius: var(--sonata-radius-sm);
  }

  .mode-icon {
    font-size: 0.88rem;
  }

  .video-preview-card {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    padding: 14px;
  }

  .thumbnail-wrapper {
    width: 100%;
    height: 160px;
  }

  .video-title {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 1rem;
    line-height: 1.35;
  }

  .options-card {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    padding: 14px;
  }

  .format-select-group, .directory-select-group {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .format-select-group select {
    width: 100%;
  }

  .directory-picker {
    width: 100%;
    max-width: 100%;
    justify-content: space-between;
  }

  .directory-text {
    flex: 1;
    min-width: 0;
    max-width: none;
  }

  .action-footer {
    flex-direction: column;
    align-items: stretch;
    margin-top: 14px;
  }

  .start-button {
    width: 100%;
    justify-content: center;
    padding: 14px 20px;
    font-size: 1rem;
  }
}

@media (max-width: 420px) {
  .brand-row {
    gap: 8px;
  }

  .mode-tab {
    flex-direction: column;
    padding: 6px 2px;
    font-size: 0.72rem;
    gap: 2px;
  }
}
</style>
