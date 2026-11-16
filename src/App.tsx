import { useState, useEffect, useRef } from 'react';
import { MotionConfig, motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, RotateCcw, Maximize2, List, Zap, Command } from 'lucide-react';
import { Navbar } from './components/Navbar.tsx';
import { WorkspaceViewMode } from './components/layout/Header.tsx';
import { EditorialIntake } from './components/EditorialIntake.tsx';
import { CanvasFocusStage } from './components/CanvasFocusStage.tsx';
import { BatchLedgerView } from './components/BatchLedgerView.tsx';
import { CommandPalette } from './components/CommandPalette.tsx';
import { GifStudioPanel } from './components/GifStudioPanel.tsx';
import { HistoryWorkspaceView } from './components/HistoryWorkspaceView.tsx';
import { GuideWorkspaceView } from './components/GuideWorkspaceView.tsx';
import { PresetModal } from './components/PresetModal.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { StatusFooter } from './components/StatusFooter.tsx';
import { PrivacyPolicy } from './components/PrivacyPolicy.tsx';
import { TermsOfService } from './components/TermsOfService.tsx';
import { buildOutputFilename } from './utils/formatCapabilities.ts';
import { useTheme } from './lib/theme.ts';
import { STATOR_SPRING, STATOR_TRANSITION } from './lib/motion.ts';
import { useConversionQueue } from './hooks/useConversionQueue.ts';

export default function App() {
  const { theme, isDark, setTheme, toggleTheme } = useTheme();
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceViewMode>('converter');
  const [stageViewMode, setStageViewMode] = useState<'stage' | 'queue'>('stage');
  const [activeStageItemId, setActiveStageItemId] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [activePresetItemId, setActivePresetItemId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'converter' | 'privacy' | 'terms'>('converter');

  const globalFileInputRef = useRef<HTMLInputElement>(null);

  const {
    queue,
    setQueue,
    wasmStatus,
    wasmLoadProgress,
    history,
    ephemeralMode,
    isPaused,
    globalPreset,
    itemPresets,
    toastMessage,
    canUndoClear,
    showToast,
    handleToggleEphemeralMode,
    handleDeleteHistoryEntry,
    handleClearAllHistory,
    handleWipeAllData,
    handleFilesSelected,
    handleLoadSampleFiles,
    handleRemoveItem,
    handleReorderItem,
    handleClearQueue,
    handleUndoClearQueue,
    handleUpdateTargetFormat,
    handleBatchUpdateFormat,
    handleUpdatePresetSettings,
    handleApplyPreset,
    handleStartConversion,
    handleCancelConversion,
    handleTogglePause,
    handleConvertAll,
  } = useConversionQueue();

  const prevQueueLenRef = useRef(0);
  useEffect(() => {
    const prevLen = prevQueueLenRef.current;
    prevQueueLenRef.current = queue.length;

    if (queue.length === 0) {
      setActiveStageItemId(null);
      return;
    }

    if (!activeStageItemId || !queue.some((q) => q.id === activeStageItemId)) {
      setActiveStageItemId(queue[0].id);
    }

    // Smart initial view mode when transitioning from empty -> populated
    if (prevLen === 0 && queue.length > 0) {
      setStageViewMode(queue.length === 1 ? 'stage' : 'queue');
      setActiveStageItemId(queue[0].id);
    }
  }, [queue, activeStageItemId]);

  // URL path navigation (/privacy, /terms, /)
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/privacy') setCurrentView('privacy');
      else if (path === '/terms') setCurrentView('terms');
      else setCurrentView('converter');
    };
    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigateTo = (view: 'converter' | 'privacy' | 'terms') => {
    setCurrentView(view);
    const targetPath = view === 'converter' ? '/' : `/${view}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Global Cmd+K / Ctrl+K shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global Ctrl+V / Cmd+V clipboard file intake
  const handleFilesSelectedRef = useRef(handleFilesSelected);
  handleFilesSelectedRef.current = handleFilesSelected;

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const items = e.clipboardData?.files;
      if (items && items.length > 0) {
        e.preventDefault();
        const pastedFiles = Array.from(items);
        handleFilesSelectedRef.current(pastedFiles);
        setWorkspaceMode('converter');
        showToast(
          `Staged ${pastedFiles.length} file${pastedFiles.length === 1 ? '' : 's'} from clipboard`
        );
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [showToast]);

  const handleOpenPresetModal = (itemId: string | null) => {
    setActivePresetItemId(itemId);
    setIsPresetModalOpen(true);
  };

  const triggerGlobalFileBrowse = () => {
    globalFileInputRef.current?.click();
  };

  const activeTargetItem = activePresetItemId
    ? queue.find((i) => i.id === activePresetItemId)
    : null;

  const readyCount = queue.filter((i) => i.status === 'ready').length;
  const completedCount = queue.filter((i) => i.status === 'completed').length;
  const hasQueuedFiles = queue.length > 0;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[var(--stator-bg)] text-[var(--stator-fg)] flex flex-col font-sans selection:bg-[var(--stator-accent-soft)] selection:text-[var(--stator-fg)]">
        <input
          ref={globalFileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFilesSelected(Array.from(e.target.files), true);
              e.target.value = '';
              setWorkspaceMode('converter');
            }
          }}
        />

        <Navbar
          workspaceMode={workspaceMode}
          onSelectWorkspaceMode={setWorkspaceMode}
          onNavigateHome={() => navigateTo('converter')}
          queuedCount={queue.length}
          historyCount={history.length}
          isHistoryOpen={workspaceMode === 'history'}
          onOpenHistory={() => {
            navigateTo('converter');
            setWorkspaceMode('history');
          }}
          isHelpOpen={workspaceMode === 'guide'}
          onOpenHelp={() => {
            navigateTo('converter');
            setWorkspaceMode('guide');
          }}
          wasmStatus={wasmStatus}
          onOpenPresets={() => handleOpenPresetModal(null)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          theme={theme}
          onThemeChange={setTheme}
          onToggleTheme={toggleTheme}
        />

        {currentView === 'privacy' ? (
          <main className="flex-1 w-full pb-20">
            <PrivacyPolicy onBack={() => navigateTo('converter')} />
          </main>
        ) : currentView === 'terms' ? (
          <main className="flex-1 w-full pb-20">
            <TermsOfService onBack={() => navigateTo('converter')} />
          </main>
        ) : (
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 flex flex-col">
            <OfflineIndicator />

            {/* Mobile Primary View Switcher (< md; desktop uses Header nav) */}
            <div className="md:hidden w-full mt-3 mb-2">
              <div
                role="tablist"
                aria-label="Workspace views"
                className="grid grid-cols-4 p-1 rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)]"
              >
                {(
                  [
                    { id: 'converter', label: 'Convert' },
                    { id: 'gif-studio', label: 'GIF Studio' },
                    {
                      id: 'history',
                      label: `History${history.length > 0 ? ` (${history.length})` : ''}`,
                    },
                    { id: 'guide', label: 'Guide' },
                  ] as const
                ).map((tab) => {
                  const isActive = workspaceMode === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setWorkspaceMode(tab.id)}
                      className={`relative py-2 rounded-lg text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'text-white'
                          : 'text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)]'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="stator-mobile-workspace-tab"
                          transition={STATOR_SPRING.tactile}
                          className="absolute inset-0 rounded-lg bg-[var(--stator-accent)]"
                        />
                      )}
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {workspaceMode === 'converter' ? (
                <motion.div
                  key="converter-workspace"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={STATOR_TRANSITION.view}
                  className="w-full"
                >
                  {!hasQueuedFiles ? (
                    <EditorialIntake
                      onFilesSelected={(files) => handleFilesSelected(files, true)}
                      onLoadSampleFiles={handleLoadSampleFiles}
                      globalPreset={globalPreset}
                      wasmStatus={wasmStatus}
                      onOpenPresets={() => handleOpenPresetModal(null)}
                      onOpenGifStudio={() => setWorkspaceMode('gif-studio')}
                    />
                  ) : (
                    <div className="w-full pt-4 sm:pt-5 space-y-3.5">
                      {/* De-duplicated Workspace Header Bar: Shared Spring Switcher + Bulk Action */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            role="tablist"
                            aria-label="Converter layout mode"
                            className="inline-flex items-center p-0.5 rounded-lg bg-[var(--stator-surface)] border border-[var(--stator-border)]"
                          >
                            <button
                              type="button"
                              role="tab"
                              aria-selected={stageViewMode === 'stage'}
                              onClick={() => setStageViewMode('stage')}
                              className={`relative h-8 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                stageViewMode === 'stage'
                                  ? 'text-white'
                                  : 'text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)]'
                              }`}
                            >
                              {stageViewMode === 'stage' && (
                                <motion.span
                                  layoutId="stator-view-switch"
                                  transition={STATOR_SPRING.tactile}
                                  aria-hidden="true"
                                  className="absolute inset-0 rounded-md bg-[var(--stator-accent)]"
                                />
                              )}
                              <Maximize2 className="relative z-10 w-3.5 h-3.5" />
                              <span className="relative z-10">Focus Canvas</span>
                            </button>
                            <button
                              type="button"
                              role="tab"
                              aria-selected={stageViewMode === 'queue'}
                              onClick={() => setStageViewMode('queue')}
                              className={`relative h-8 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                stageViewMode === 'queue'
                                  ? 'text-white'
                                  : 'text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)]'
                              }`}
                            >
                              {stageViewMode === 'queue' && (
                                <motion.span
                                  layoutId="stator-view-switch"
                                  transition={STATOR_SPRING.tactile}
                                  aria-hidden="true"
                                  className="absolute inset-0 rounded-md bg-[var(--stator-accent)]"
                                />
                              )}
                              <List className="relative z-10 w-3.5 h-3.5" />
                              <span className="relative z-10">Batch Ledger</span>
                              <span
                                className={`relative z-10 font-mono tabular-nums text-[11px] ${
                                  stageViewMode === 'queue'
                                    ? 'text-white/85'
                                    : 'text-[var(--stator-fg-subtle)]'
                                }`}
                              >
                                ({queue.length})
                              </span>
                            </button>
                          </div>

                          <span className="hidden sm:inline text-xs font-mono tabular-nums text-[var(--stator-fg-subtle)]">
                            {readyCount > 0
                              ? `${readyCount} ready`
                              : `${completedCount} completed`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsCommandPaletteOpen(true)}
                            className="lg:hidden h-8 px-2.5 rounded-lg bg-[var(--stator-surface)] border border-[var(--stator-border)] text-xs font-mono text-[var(--stator-fg-muted)] inline-flex items-center gap-1 cursor-pointer active:scale-[0.97]"
                            aria-label="Open Command Palette"
                          >
                            <Command className="w-3.5 h-3.5" />
                            <span>K</span>
                          </button>

                          {stageViewMode === 'stage' && readyCount > 1 && (
                            <button
                              type="button"
                              onClick={handleConvertAll}
                              className="h-8 px-3.5 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 active:scale-[0.98]"
                            >
                              <Zap className="w-3.5 h-3.5 fill-white" />
                              <span>Convert All ({readyCount})</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <AnimatePresence mode="wait">
                        {stageViewMode === 'stage' ? (
                          <motion.div
                            key="focus-canvas-pane"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={STATOR_TRANSITION.view}
                          >
                            <CanvasFocusStage
                              queue={queue}
                              activeItemId={activeStageItemId}
                              onSelectActiveItem={setActiveStageItemId}
                              onUpdateTargetFormat={handleUpdateTargetFormat}
                              onUpdatePresetSettings={handleUpdatePresetSettings}
                              onStartConversion={handleStartConversion}
                              onCancelConversion={handleCancelConversion}
                              onRemoveItem={handleRemoveItem}
                              onAddFiles={triggerGlobalFileBrowse}
                              onFilesDropped={(files) => handleFilesSelected(files, true)}
                              onAddExtractedFile={(file) => {
                                handleFilesSelected([file], false);
                              }}
                              onSwitchToLedger={() => setStageViewMode('queue')}
                              onToast={(msg) => showToast(msg)}
                              wasmLoadProgress={wasmLoadProgress}
                            />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="batch-ledger-pane"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={STATOR_TRANSITION.view}
                          >
                            <BatchLedgerView
                              queue={queue}
                              onFilesDropped={(files) => handleFilesSelected(files, true)}
                              onAddFilesClick={triggerGlobalFileBrowse}
                              onRemoveItem={handleRemoveItem}
                              onReorderItem={handleReorderItem}
                              onClearQueue={handleClearQueue}
                              onUpdateTargetFormat={handleUpdateTargetFormat}
                              onBatchUpdateFormat={handleBatchUpdateFormat}
                              onUpdatePresetSettings={handleUpdatePresetSettings}
                              onStartConversion={handleStartConversion}
                              onCancelConversion={handleCancelConversion}
                              onConvertAll={handleConvertAll}
                              onTogglePause={handleTogglePause}
                              isPaused={isPaused}
                              onOpenFocusStage={(id: string) => {
                                setActiveStageItemId(id);
                                setStageViewMode('stage');
                              }}
                              onToast={(msg) => showToast(msg)}
                              wasmLoadProgress={wasmLoadProgress}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              ) : workspaceMode === 'gif-studio' ? (
                <motion.div
                  key="gif-studio-workspace"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={STATOR_TRANSITION.view}
                  className="w-full"
                >
                  <GifStudioPanel
                    onToast={(msg) => showToast(msg)}
                    onApplyCreatorRecipe={(settings, label, targetFormat) => {
                      handleApplyPreset(settings, null);
                      if (targetFormat) {
                        setQueue((prev) =>
                          prev.map((item) => {
                            if (item.status !== 'ready') return item;
                            const isImageTarget = ['AVIF', 'WEBP', 'PNG', 'JPEG'].includes(
                              targetFormat
                            );
                            const isVideoTarget = ['MP4', 'WEBM', 'MOV', 'GIF'].includes(
                              targetFormat
                            );
                            if (
                              (item.typeCategory === 'image' && isImageTarget) ||
                              (item.typeCategory === 'video' && isVideoTarget)
                            ) {
                              return {
                                ...item,
                                targetFormat,
                                outputName: buildOutputFilename(item.name, targetFormat),
                              };
                            }
                            return item;
                          })
                        );
                      }
                      setWorkspaceMode('converter');
                      showToast(`Applied ${label}`);
                    }}
                  />
                </motion.div>
              ) : workspaceMode === 'history' ? (
                <motion.div
                  key="history-workspace"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={STATOR_TRANSITION.view}
                  className="w-full"
                >
                  <HistoryWorkspaceView
                    history={history}
                    onClearHistory={handleClearAllHistory}
                    onDeleteEntry={handleDeleteHistoryEntry}
                    ephemeralMode={ephemeralMode}
                    onToggleEphemeralMode={handleToggleEphemeralMode}
                    onWipeAllData={handleWipeAllData}
                    onBackToConverter={() => setWorkspaceMode('converter')}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="guide-workspace"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={STATOR_TRANSITION.view}
                  className="w-full"
                >
                  <GuideWorkspaceView
                    onBackToConverter={() => setWorkspaceMode('converter')}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        )}

        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          hasQueuedFiles={hasQueuedFiles}
          readyCount={readyCount}
          stageViewMode={stageViewMode}
          onSetStageViewMode={setStageViewMode}
          workspaceMode={workspaceMode}
          onSetWorkspaceMode={setWorkspaceMode}
          onChooseFiles={triggerGlobalFileBrowse}
          onLoadSamples={() => {
            setWorkspaceMode('converter');
            handleLoadSampleFiles();
          }}
          onConvertAll={handleConvertAll}
          onClearQueue={handleClearQueue}
          onOpenPresets={() => handleOpenPresetModal(null)}
          onOpenHistory={() => setWorkspaceMode('history')}
          onOpenHelp={() => setWorkspaceMode('guide')}
          onToggleTheme={toggleTheme}
          isDark={isDark}
        />

        <PresetModal
          isOpen={isPresetModalOpen}
          onClose={() => setIsPresetModalOpen(false)}
          onApply={handleApplyPreset}
          initialSettings={
            activePresetItemId
              ? itemPresets[activePresetItemId] ||
                activeTargetItem?.presetSettings ||
                globalPreset
              : globalPreset
          }
          activeItemId={activePresetItemId}
          activeItemName={activeTargetItem?.name}
          activeCategory={activeTargetItem?.typeCategory}
        />

        <StatusFooter
          onNavigatePrivacy={() => navigateTo('privacy')}
          onNavigateTerms={() => navigateTo('terms')}
        />

        <AnimatePresence>
          {toastMessage && (
            <motion.div
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={STATOR_TRANSITION.overlay}
              className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-[var(--stator-surface)] border border-[var(--stator-border-strong)] text-[var(--stator-fg)] shadow-xl text-xs font-medium"
            >
              <CheckCircle2 className="w-4 h-4 text-[var(--stator-success)] shrink-0" />
              <span>{toastMessage}</span>
              {canUndoClear && (
                <button
                  type="button"
                  onClick={handleUndoClearQueue}
                  className="ml-1 px-2 py-0.5 rounded-md bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] text-[var(--stator-fg)] border border-[var(--stator-border)] inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
