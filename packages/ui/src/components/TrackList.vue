<script setup lang="ts">
import { computed } from 'vue';
import type { Track } from '@sonata/shared-types';

const props = defineProps<{
  tracks: Track[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:tracks', tracks: Track[]): void;
  (e: 'add-track'): void;
  (e: 'remove-track', index: number): void;
}>();

const selectedCount = computed(() => {
  return props.tracks.filter(t => t.selected).length;
});

const allSelected = computed({
  get: () => props.tracks.length > 0 && props.tracks.every(t => t.selected),
  set: (val: boolean) => {
    const updated = props.tracks.map(t => ({ ...t, selected: val }));
    emit('update:tracks', updated);
  }
});

const toggleTrack = (index: number) => {
  if (props.disabled) return;
  const updated = [...props.tracks];
  updated[index].selected = !updated[index].selected;
  emit('update:tracks', updated);
};

const updateField = (index: number, field: keyof Track, value: any) => {
  const updated = [...props.tracks];
  updated[index] = { ...updated[index], [field]: value };
  emit('update:tracks', updated);
};
</script>

<template>
  <div class="track-list-card">
    <div class="card-header">
      <div class="header-left">
        <label class="checkbox-container">
          <input type="checkbox" v-model="allSelected" :disabled="disabled || tracks.length === 0" />
          <span class="checkmark"></span>
          <span class="header-title">Faixas Identificadas</span>
        </label>
        <span class="track-counter">
          {{ selectedCount }} de {{ tracks.length }} selecionadas
        </span>
      </div>

      <button
        type="button"
        class="add-track-button"
        :disabled="disabled"
        @click="emit('add-track')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span>Adicionar Faixa</span>
      </button>
    </div>

    <div v-if="tracks.length === 0" class="empty-state">
      <p>Nenhuma faixa com marcação de tempo encontrada automaticamente.</p>
      <p class="empty-subtext">Você pode adicionar faixas manualmente ou colar os timestamps.</p>
    </div>

    <div v-else class="tracks-table">
      <div class="table-head">
        <div class="col-check"></div>
        <div class="col-index">#</div>
        <div class="col-title">Título da Música</div>
        <div class="col-time">Início</div>
        <div class="col-time">Fim</div>
        <div class="col-actions"></div>
      </div>

      <div class="table-body">
        <div
          v-for="(track, idx) in tracks"
          :key="track.id || idx"
          class="track-row"
          :class="{ 'is-selected': track.selected }"
        >
          <div class="col-check">
            <label class="checkbox-container">
              <input
                type="checkbox"
                :checked="track.selected"
                :disabled="disabled"
                @change="toggleTrack(idx)"
              />
              <span class="checkmark"></span>
            </label>
          </div>

          <div class="col-index">
            {{ (idx + 1).toString().padStart(2, '0') }}
          </div>

          <div class="col-title">
            <input
              type="text"
              :value="track.title"
              placeholder="Nome da faixa..."
              :disabled="disabled"
              class="inline-input title-input"
              @input="e => updateField(idx, 'title', (e.target as HTMLInputElement).value)"
            />
          </div>

          <div class="col-time">
            <input
              type="text"
              :value="track.startTime"
              placeholder="00:00"
              :disabled="disabled"
              class="inline-input time-input"
              @input="e => updateField(idx, 'startTime', (e.target as HTMLInputElement).value)"
            />
          </div>

          <div class="col-time">
            <input
              type="text"
              :value="track.endTime || ''"
              placeholder="Final"
              :disabled="disabled"
              class="inline-input time-input"
              @input="e => updateField(idx, 'endTime', (e.target as HTMLInputElement).value)"
            />
          </div>

          <div class="col-actions">
            <button
              type="button"
              class="remove-button"
              title="Remover faixa"
              :disabled="disabled"
              @click="emit('remove-track', idx)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.track-list-card {
  background-color: var(--sonata-bg-surface);
  border: 1px solid var(--sonata-border-subtle);
  border-radius: var(--sonata-radius-lg);
  padding: 20px 24px;
  box-shadow: var(--sonata-shadow-card);
  margin-top: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--sonata-border-subtle);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-title {
  font-weight: 600;
  font-size: 1.05rem;
  color: var(--sonata-text-primary);
}

.track-counter {
  font-size: 0.85rem;
  color: var(--sonata-accent-primary);
  background-color: var(--sonata-accent-muted);
  padding: 4px 10px;
  border-radius: var(--sonata-radius-full);
}

.add-track-button {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--sonata-text-secondary);
  border: 1px solid var(--sonata-border-subtle);
  padding: 6px 14px;
  border-radius: var(--sonata-radius-md);
}

.add-track-button:hover:not(:disabled) {
  color: var(--sonata-text-primary);
  border-color: var(--sonata-border-hover);
  background-color: var(--sonata-bg-surface-elevated);
}

.table-head {
  display: grid;
  grid-template-columns: 32px 36px 1fr 100px 100px 40px;
  gap: 12px;
  padding: 12px 8px;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--sonata-text-muted);
  font-weight: 600;
}

.track-row {
  display: grid;
  grid-template-columns: 32px 36px 1fr 100px 100px 40px;
  gap: 12px;
  align-items: center;
  padding: 8px 8px;
  border-radius: var(--sonata-radius-md);
  margin-bottom: 4px;
  transition: var(--sonata-transition-smooth);
}

.track-row:hover {
  background-color: var(--sonata-bg-surface-elevated);
}

.col-index {
  font-size: 0.85rem;
  color: var(--sonata-text-muted);
  font-variant-numeric: tabular-nums;
}

.inline-input {
  width: 100%;
  padding: 6px 10px;
  border-radius: var(--sonata-radius-sm);
  background: transparent;
  color: var(--sonata-text-primary);
  border: 1px solid transparent;
  transition: var(--sonata-transition-smooth);
}

.inline-input:hover {
  background-color: var(--sonata-bg-input);
  border-color: var(--sonata-border-subtle);
}

.inline-input:focus {
  background-color: var(--sonata-bg-input);
  border-color: var(--sonata-border-focus);
}

.title-input {
  font-size: 0.92rem;
}

.time-input {
  font-size: 0.88rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.remove-button {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sonata-text-muted);
  width: 28px;
  height: 28px;
  border-radius: var(--sonata-radius-sm);
}

.remove-button:hover:not(:disabled) {
  color: var(--sonata-error);
  background-color: rgba(204, 123, 123, 0.1);
}

/* Custom Checkbox */
.checkbox-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
  user-select: none;
}

.checkbox-container input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  height: 18px;
  width: 18px;
  background-color: var(--sonata-bg-input);
  border: 1px solid var(--sonata-border-subtle);
  border-radius: 5px;
  display: inline-block;
  margin-right: 8px;
  transition: var(--sonata-transition-smooth);
}

.checkbox-container:hover input ~ .checkmark {
  border-color: var(--sonata-border-hover);
}

.checkbox-container input:checked ~ .checkmark {
  background-color: var(--sonata-accent-primary);
  border-color: var(--sonata-accent-primary);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--sonata-text-secondary);
}

.empty-subtext {
  font-size: 0.85rem;
  color: var(--sonata-text-muted);
  margin-top: 6px;
}
</style>
